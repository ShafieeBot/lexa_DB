import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { analyzeQuery, generateAnswer } from '@/lib/ai/openai';
import { QuerySchema, validateRequest } from '@/lib/validation';
import { chatRateLimiter } from '@/lib/rate-limit';
import { logger, logError } from '@/lib/logger';
import {
  HTTP_STATUS,
  ERROR_MESSAGES,
  CHAT_SESSION_TITLE_MAX_LENGTH,
  CHAT_HISTORY_LIMIT,
  DOCUMENT_FETCH_LIMIT,
  DOCUMENT_CONTENT_PREVIEW_LENGTH,
  MAX_RELEVANT_DOCUMENTS,
} from '@/lib/constants';
import { getCache, setCache } from '@/lib/cache/redis';
import { CACHE_TTL } from '@/lib/constants';

interface Document {
  id: string;
  organization_id: string;
  title: string;
  document_type: string;
  summary?: string | null;
  content: string;
  tags?: string[] | null;
  jurisdiction?: string | null;
  reference_number?: string | null;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting
    const rateLimitCheck = await chatRateLimiter.middleware()(request);
    if (rateLimitCheck) {
      return rateLimitCheck;
    }

    const supabase = await createServerSupabaseClient();

    // Authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('Unauthorized query attempt');
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      logError(profileError, { context: 'getUserProfile', userId: user.id });
      return NextResponse.json(
        { error: 'User not associated with an organization' },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = validateRequest(QuerySchema, body);

    if (!validation.success) {
      logger.warn('Invalid query request', { error: validation.error });
      return NextResponse.json(
        { error: validation.error },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const { query, session_id } = validation.data;
    let sessionId = session_id;

    logger.info('Processing chat query', {
      userId: user.id,
      organizationId: profile.organization_id,
      queryLength: query.length,
      hasSession: !!sessionId,
    });

    // Create or get chat session
    if (!sessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          organization_id: profile.organization_id,
          title: query.substring(0, CHAT_SESSION_TITLE_MAX_LENGTH),
        })
        .select()
        .single();

      if (sessionError) {
        logError(sessionError, { context: 'createSession', userId: user.id });
        return NextResponse.json(
          { error: 'Failed to create session' },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
      }

      sessionId = newSession.id;
    }

    // Save user message
    const { error: userMessageError } = await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: query,
    });

    if (userMessageError) {
      logError(userMessageError, { context: 'saveUserMessage', sessionId });
    }

    // Try to get documents from cache
    const cacheKey = `org_documents:${profile.organization_id}`;
    let documents: Document[] | null = await getCache<Document[]>(cacheKey);

    if (!documents) {
      // Fetch documents from database with pagination limit
      const { data: fetchedDocs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .limit(DOCUMENT_FETCH_LIMIT);

      if (docsError) {
        logError(docsError, { context: 'fetchDocuments', organizationId: profile.organization_id });
        return NextResponse.json(
          { error: ERROR_MESSAGES.INTERNAL_ERROR },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
      }

      documents = fetchedDocs || [];

      // Cache documents
      await setCache(cacheKey, documents, CACHE_TTL.DOCUMENTS);
    }

    if (!documents || documents.length === 0) {
      logger.info('No documents available', { organizationId: profile.organization_id });

      return NextResponse.json({
        answer: ERROR_MESSAGES.NO_DOCUMENTS,
        sources: [],
        session_id: sessionId,
        message_id: '',
      });
    }

    // Use AI to find relevant documents
    let relevantDocs: Document[] = [];
    try {
      const { documentIds } = await analyzeQuery(query, documents);

      if (Array.isArray(documentIds) && documentIds.length > 0) {
        // Normalize to strings and filter documents
        const ids = documentIds.map((x) => String(x));
        relevantDocs = documents.filter((doc) => ids.includes(doc.id));

        // If model returned numeric indices, map them to list positions
        if (relevantDocs.length === 0) {
          const numericIndices = ids
            .map((s) => parseInt(s, 10))
            .filter((n) => Number.isFinite(n) && n >= 1 && n <= documents.length);

          if (numericIndices.length > 0) {
            relevantDocs = Array.from(new Set(numericIndices))
              .map((n) => documents[n - 1])
              .filter(Boolean);
          }
        }
      }
    } catch (error) {
      logError(error, { context: 'analyzeQuery', queryLength: query.length });
      // Continue to fallback
    }

    // Fallback: keyword-based search if AI didn't return results
    if (relevantDocs.length === 0) {
      logger.info('Using keyword fallback for document search');

      const queryLower = query.toLowerCase();
      const scoreDocument = (doc: Document): number => {
        const searchableText = [
          doc.title,
          doc.summary,
          doc.content?.slice(0, DOCUMENT_CONTENT_PREVIEW_LENGTH),
          (doc.tags || []).join(' '),
          doc.jurisdiction,
          doc.reference_number,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        let score = 0;
        const queryTerms = queryLower.split(/[^a-z0-9]+/).filter(Boolean);

        queryTerms.forEach((term) => {
          if (searchableText.includes(term)) {
            score += 1;
          }
        });

        // Boost for exact phrase match in title
        if (doc.title?.toLowerCase().includes(queryLower)) {
          score += 3;
        }

        return score;
      };

      relevantDocs = documents
        .map((doc) => ({ doc, score: scoreDocument(doc) }))
        .sort((a, b) => b.score - a.score)
        .filter((item) => item.score > 0)
        .slice(0, MAX_RELEVANT_DOCUMENTS)
        .map((item) => item.doc);
    }

    // Get conversation history
    const { data: history, error: historyError } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(CHAT_HISTORY_LIMIT);

    if (historyError) {
      logError(historyError, { context: 'fetchHistory', sessionId });
    }

    const conversationHistory =
      history?.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
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
      logError(assistantError, { context: 'saveAssistantMessage', sessionId });
      return NextResponse.json(
        { error: 'Failed to save response' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    // Save message sources
    if (relevantDocs.length > 0) {
      const sourcesToInsert = relevantDocs.map((doc) => ({
        message_id: assistantMessage.id,
        document_id: doc.id,
        relevance_score: 1.0,
      }));

      const { error: sourcesError } = await supabase.from('message_sources').insert(sourcesToInsert);

      if (sourcesError) {
        logError(sourcesError, { context: 'saveMessageSources', messageId: assistantMessage.id });
        // Non-critical error, continue
      }
    }

    logger.info('Query processed successfully', {
      userId: user.id,
      sessionId,
      messageId: assistantMessage.id,
      relevantDocsCount: relevantDocs.length,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      answer,
      sources: relevantDocs,
      session_id: sessionId,
      message_id: assistantMessage.id,
    });
  } catch (error) {
    logError(error, { context: 'chatQuery', duration: Date.now() - startTime });

    return NextResponse.json(
      { error: ERROR_MESSAGES.INTERNAL_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
