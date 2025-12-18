import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Pagination and search
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get('page_size') || '20', 10), 1), 100);
    const q = (searchParams.get('q') || '').trim();
    const filterType = (searchParams.get('type') || '').trim();
    const jurisdiction = (searchParams.get('jurisdiction') || '').trim();

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('documents')
      .select('*, category:document_categories(*)', { count: 'exact' })
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (q) {
      const like = `%${q}%`;
      // Base text search across main fields
      let orParts = [
        `title.ilike.${like}`,
        `reference_number.ilike.${like}`,
        `jurisdiction.ilike.${like}`,
        `summary.ilike.${like}`,
      ];
      // Also search tags if q looks like a single token (no spaces or commas)
      const token = q.trim();
      if (/^[A-Za-z0-9_\-]+$/.test(token)) {
        const up = token.toUpperCase();
        const low = token.toLowerCase();
        // PostgREST array contains (cs) is case-sensitive, so include common casings
        orParts = orParts.concat([
          `tags.cs.{${token}}`,
          `tags.cs.{${up}}`,
          `tags.cs.{${low}}`,
        ]);
      }
      query = query.or(orParts.join(','));
    }

    if (filterType) {
      query = query.eq('document_type', filterType as any);
    }

    if (jurisdiction) {
      const likeJur = `%${jurisdiction}%`;
      query = query.ilike('jurisdiction', likeJur);
    }

    const { data: documents, error, count } = await query;

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      documents: documents || [],
      total: count ?? 0,
      page,
      page_size: pageSize,
    });
  } catch (error) {
    console.error('Error in documents route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const documentData = await request.json();

    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        ...documentData,
        organization_id: profile.organization_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating document:', error);
      return NextResponse.json(
        { error: 'Failed to create document' },
        { status: 500 }
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error in documents POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { document_id } = await request.json();

    if (!document_id) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Get document to remove any attachment first
    const { data: docRow } = await supabase
      .from('documents')
      .select('id, file_url, organization_id')
      .eq('id', document_id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!docRow) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Attempt to delete file from storage if exists
    if (docRow.file_url) {
      try {
        await supabase.storage.from('documents').remove([docRow.file_url]);
      } catch (e) {
        console.error('Storage delete error:', e);
      }
    }

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', document_id)
      .eq('organization_id', profile.organization_id);

    if (error) {
      console.error('Error deleting document:', error);
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in documents DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
