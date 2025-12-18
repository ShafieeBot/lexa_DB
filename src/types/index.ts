// Database types
export type DocumentType = 'legislation' | 'case' | 'regulation' | 'guideline' | 'other';
export type UserRole = 'admin' | 'user';
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  organization_id: string;
  role: UserRole;
  full_name: string | null;
  email: string;
  created_at: string;
  updated_at: string;
  organization?: Organization;
}

export interface DocumentCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  organization_id: string;
  title: string;
  document_type: DocumentType;
  category_id: string | null;
  jurisdiction: string | null;
  reference_number: string | null;
  enacted_date: string | null;
  effective_date: string | null;
  summary: string | null;
  content: string;
  file_url: string | null;
  file_size: number | null;
  tags: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: DocumentCategory;
}

export interface DocumentMetadata {
  id: string;
  document_id: string;
  key: string;
  value: string | null;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  organization_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
  sources?: MessageSource[];
}

export interface MessageSource {
  id: string;
  message_id: string;
  document_id: string;
  relevance_score: number | null;
  created_at: string;
  document?: Document;
}

// API types
export interface QueryRequest {
  query: string;
  session_id?: string;
}

export interface QueryResponse {
  answer: string;
  sources: Document[];
  message_id: string;
  session_id: string;
}

export interface SourceDisplay {
  id: string;
  title: string;
  type: DocumentType;
  url: string;
  icon: string;
  metadata?: {
    jurisdiction?: string;
    reference_number?: string;
    enacted_date?: string;
  };
}
