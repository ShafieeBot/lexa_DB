import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { analyzeQuery, generateAnswer } from '@/lib/ai/openai';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'User not associated with an organization' },
        { status: 403 }
      );
    }

    const { query, session_id } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    let sessionId = session_id;

    // Create or get chat session
    if (!sessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          organization_id: profile.organization_id,
          title: query.substring(0, 100),
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        return NextResponse.json(
          { error: 'Failed to create session' },
          { status: 500 }
        );
      }

      sessionId = newSession.id;
    }

    // Save user message
    const { error: userMessageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: query,
      });

    if (userMessageError) {
      console.error('Error saving user message:', userMessageError);
    }

    // Get all documents in the organization
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('organization_id', profile.organization_id);

    if (docsError) {
      console.error('Error fetching documents:', docsError);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({
        answer: 'I apologize, but there are no documents available in your organization\'s database yet. Please ask your administrator to upload relevant legislation and legal documents.',
        sources: [],
        session_id: sessionId,
        message_id: '',
      });
    }

    // Use AI to find relevant documents
    let relevantDocs: typeof documents = [];
    try {
      const { documentIds } = await analyzeQuery(query, documents);
      // Map to actual docs when possible
      if (Array.isArray(documentIds)) {
        // Normalize to strings
        const ids = documentIds.map((x: any) => String(x));
        // Direct UUID match
        relevantDocs = documents.filter((doc) => ids.includes(doc.id));
        // If model returned numeric indices ("1", "2"), map them to list positions
        if (relevantDocs.length === 0) {
          const numeric = ids
            .map((s: string) => parseInt(s, 10))
            .filter((n: number) => Number.isFinite(n) && n >= 1 && n <= documents.length);
          if (numeric.length > 0) {
            relevantDocs = Array.from(new Set(numeric))
              .map((n: number) => documents[n - 1])
              .filter(Boolean);
          }
        }
      }
    } catch (e) {
      console.warn('analyzeQuery failed, will use keyword fallback:', e);
    }

    // Fallback: simple keyword scoring if AI didn't return any valid IDs
    if (!relevantDocs || relevantDocs.length === 0) {
      const q = query.toLowerCase();
      const score = (doc: any) => {
        const hay = [
          doc.title,
          doc.summary,
          doc.content?.slice(0, 2000), // cap content for perf
          (doc.tags || []).join(' '),
          doc.jurisdiction,
          doc.reference_number,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        let s = 0;
        q.split(/[^a-z0-9]+/).filter(Boolean).forEach((term: string) => {
          if (hay.includes(term)) s += 1;
        });
        // boost for exact phrase in title
        if (doc.title?.toLowerCase().includes(q)) s += 3;
        return s;
      };
      relevantDocs = [...documents]
        .map((d) => ({ d, s: score(d) }))
        .sort((a, b) => b.s - a.s)
        .filter((x) => x.s > 0)
        .slice(0, 5)
        .map((x) => x.d);
    }

    // Get conversation history
    const { data: history } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(10);

    const conversationHistory = history?.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })) || [];

    // Generate answer using AI
    const answer = await generateAnswer(query, relevantDocs, conversationHistory);

    // Save assistant message
    const { data: assistantMessage, error: assistantError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: answer,
      })
      .select()
      .single();

    if (assistantError) {
      console.error('Error saving assistant message:', assistantError);
      return NextResponse.json(
        { error: 'Failed to save response' },
        { status: 500 }
      );
    }

    // Save message sources
    const sourcesToInsert = (relevantDocs || []).map((doc) => ({
      message_id: assistantMessage.id,
      document_id: doc.id,
      relevance_score: 1.0,
    }));

    if (sourcesToInsert.length > 0) {
      await supabase.from('message_sources').insert(sourcesToInsert);
    }

    return NextResponse.json({
      answer,
      sources: relevantDocs || [],
      session_id: sessionId,
      message_id: assistantMessage.id,
    });
  } catch (error) {
    console.error('Error processing query:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
