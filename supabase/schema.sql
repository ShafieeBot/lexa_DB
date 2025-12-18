-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends Supabase Auth)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  full_name VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email)
);

-- Document types enum
CREATE TYPE document_type AS ENUM ('legislation', 'case', 'regulation', 'guideline', 'other');

-- Document categories
CREATE TABLE document_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  document_type document_type NOT NULL DEFAULT 'legislation',
  category_id UUID REFERENCES document_categories(id) ON DELETE SET NULL,
  jurisdiction VARCHAR(255),
  reference_number VARCHAR(255),
  enacted_date DATE,
  effective_date DATE,
  summary TEXT,
  content TEXT NOT NULL,
  file_url TEXT,
  file_size BIGINT,
  tags TEXT[],
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document metadata for additional fields
CREATE TABLE document_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  key VARCHAR(255) NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id, key)
);

-- Chat sessions
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message sources (documents referenced in responses)
CREATE TABLE message_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  relevance_score FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_documents_organization ON documents(organization_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_category ON documents(category_id);
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX idx_documents_title_search ON documents USING GIN(to_tsvector('english', title));
CREATE INDEX idx_documents_content_search ON documents USING GIN(to_tsvector('english', content));
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_user_profiles_org ON user_profiles(organization_id);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_sources ENABLE ROW LEVEL SECURITY;

-- Storage bucket policies (for Supabase Storage)
-- Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Org members can view files in their organization folder within the 'documents' bucket
DROP POLICY IF EXISTS "Org members can view storage documents" ON storage.objects;
CREATE POLICY "Org members can view storage documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents' AND (storage.foldername(name))[1] = public.current_user_org_id()::text
  );

-- Admins can upload files to their organization's folder
DROP POLICY IF EXISTS "Admins can upload storage documents" ON storage.objects;
CREATE POLICY "Admins can upload storage documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = public.current_user_org_id()::text
    AND EXISTS (
      SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update files in their organization's folder
DROP POLICY IF EXISTS "Admins can update storage documents" ON storage.objects;
CREATE POLICY "Admins can update storage documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = public.current_user_org_id()::text
    AND EXISTS (
      SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = public.current_user_org_id()::text
    AND EXISTS (
      SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete files in their organization's folder
DROP POLICY IF EXISTS "Admins can delete storage documents" ON storage.objects;
CREATE POLICY "Admins can delete storage documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = public.current_user_org_id()::text
    AND EXISTS (
      SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Helper function to fetch the current user's organization (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.user_profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO authenticated;

-- Organizations: Users can only see their own organization
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (
    id = public.current_user_org_id()
  );

-- User profiles: Users can view profiles in their organization (uses helper to avoid recursion)
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON user_profiles;
CREATE POLICY "Users can view profiles in their organization"
  ON user_profiles FOR SELECT
  USING (
    organization_id = public.current_user_org_id()
  );

-- User profiles: Users can always view their own profile (bootstrap policy)
-- This avoids recursive RLS issues when other policies reference user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- User profiles: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- Documents: Users can view documents in their organization
CREATE POLICY "Users can view org documents"
  ON documents FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Documents: Admins can insert documents
CREATE POLICY "Admins can insert documents"
  ON documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND organization_id = documents.organization_id
    )
  );

-- Documents: Admins can update documents
CREATE POLICY "Admins can update documents"
  ON documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND organization_id = documents.organization_id
    )
  );

-- Documents: Admins can delete documents
CREATE POLICY "Admins can delete documents"
  ON documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND organization_id = documents.organization_id
    )
  );

-- Document metadata: Users can view metadata for accessible documents
CREATE POLICY "Users can view document metadata"
  ON document_metadata FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM documents WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Document categories: Users can view all categories
CREATE POLICY "Users can view categories"
  ON document_categories FOR SELECT
  TO authenticated
  USING (true);

-- Chat sessions: Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON chat_sessions FOR SELECT
  USING (user_id = auth.uid());

-- Chat sessions: Users can create their own sessions
CREATE POLICY "Users can create own sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Chat sessions: Users can update their own sessions
CREATE POLICY "Users can update own sessions"
  ON chat_sessions FOR UPDATE
  USING (user_id = auth.uid());

-- Chat sessions: Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
  ON chat_sessions FOR DELETE
  USING (user_id = auth.uid());

-- Chat messages: Users can view messages in their sessions
CREATE POLICY "Users can view session messages"
  ON chat_messages FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

-- Chat messages: Users can create messages in their sessions
CREATE POLICY "Users can create messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

-- Message sources: Users can view sources for their messages
CREATE POLICY "Users can view message sources"
  ON message_sources FOR SELECT
  USING (
    message_id IN (
      SELECT cm.id FROM chat_messages cm
      JOIN chat_sessions cs ON cs.id = cm.session_id
      WHERE cs.user_id = auth.uid()
    )
  );

-- Message sources: Users can insert sources for their own messages
DROP POLICY IF EXISTS "Users can create message sources" ON message_sources;
CREATE POLICY "Users can create message sources"
  ON message_sources FOR INSERT
  WITH CHECK (
    message_id IN (
      SELECT cm.id FROM chat_messages cm
      JOIN chat_sessions cs ON cs.id = cm.session_id
      WHERE cs.user_id = auth.uid()
    )
  );

-- Functions

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default document categories
INSERT INTO document_categories (name, description) VALUES
  ('Criminal Law', 'Laws and regulations related to criminal offenses'),
  ('Civil Law', 'Laws governing private disputes between individuals'),
  ('Constitutional Law', 'Laws related to constitutional matters'),
  ('Administrative Law', 'Laws governing administrative agencies'),
  ('Tax Law', 'Laws and regulations related to taxation'),
  ('Labor Law', 'Laws governing employment and labor relations'),
  ('Commercial Law', 'Laws related to business and commerce'),
  ('Property Law', 'Laws related to property and real estate'),
  ('Family Law', 'Laws governing family relationships'),
  ('Environmental Law', 'Laws related to environmental protection');
