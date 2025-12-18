# System Architecture

This document describes the architecture of the Lexa DB legal research system.

## Overview

Lexa DB is a full-stack web application built with Next.js 14, using the App Router for server-side rendering and API routes. It integrates with Supabase for database, authentication, and storage, and uses OpenAI's GPT-4 for intelligent document retrieval and answer generation.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Chat UI      │  │ Admin UI     │  │ Auth UI            │   │
│  │ - Sources    │  │ - Documents  │  │ - Login            │   │
│  │ - Messages   │  │ - Users      │  │                    │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────────────┐
│                    Next.js 14 (App Router)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Server Components                        │ │
│  │  - Authentication checks                                    │ │
│  │  - Data fetching                                           │ │
│  │  - Server-side rendering                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      API Routes                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │ │
│  │  │ /api/chat    │  │ /api/admin   │  │ Middleware      │ │ │
│  │  │ - query      │  │ - documents  │  │ - Auth check    │ │ │
│  │  │ - messages   │  │ - users      │  │ - Session mgmt  │ │ │
│  │  │ - sessions   │  │              │  │                 │ │ │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────┬───────────────────────┬──────────────────┬──────────┘
            │                       │                  │
            │                       │                  │
┌───────────▼──────────┐  ┌────────▼─────────┐  ┌────▼──────────┐
│   Supabase           │  │   OpenAI API     │  │   Storage     │
│  ┌─────────────────┐ │  │  ┌─────────────┐ │  │  ┌──────────┐ │
│  │ PostgreSQL      │ │  │  │ GPT-4       │ │  │  │ Files    │ │
│  │ - organizations │ │  │  │ - Query     │ │  │  │ - Docs   │ │
│  │ - users         │ │  │  │   analysis  │ │  │  │          │ │
│  │ - documents     │ │  │  │ - Answer    │ │  │  │          │ │
│  │ - messages      │ │  │  │   generation│ │  │  │          │ │
│  └─────────────────┘ │  │  └─────────────┘ │  │  └──────────┘ │
│  ┌─────────────────┐ │  │                  │  │               │
│  │ Auth            │ │  │                  │  │               │
│  │ - User mgmt     │ │  │                  │  │               │
│  │ - Sessions      │ │  │                  │  │               │
│  └─────────────────┘ │  │                  │  │               │
│  ┌─────────────────┐ │  │                  │  │               │
│  │ RLS Policies    │ │  │                  │  │               │
│  │ - Org isolation │ │  │                  │  │               │
│  │ - Role checks   │ │  │                  │  │               │
│  └─────────────────┘ │  │                  │  │               │
└──────────────────────┘  └──────────────────┘  └───────────────┘
```

## Component Architecture

### Frontend Layer

#### Pages (Server Components)
- **`/`** - Root page, redirects to `/chat` or `/login`
- **`/login`** - Login page
- **`/chat`** - Main user interface for querying and viewing responses
- **`/admin`** - Admin dashboard for managing documents and users

#### Components (Client Components)
- **Chat Components** (`src/components/chat/`)
  - `ChatInterface` - Main container for chat functionality
  - `MessageDisplay` - Renders individual messages
  - `ChatInput` - Input field for user queries
  - `SourcesPanel` - Shows relevant documents on the right

- **Admin Components** (`src/components/admin/`)
  - `AdminDashboard` - Main admin container with tabs
  - `DocumentManagement` - List and manage documents
  - `DocumentUploadDialog` - Form for uploading documents
  - `UserManagement` - List and manage users

- **UI Components** (`src/components/ui/`)
  - shadcn/ui components (Button, Input, Card, etc.)

### Backend Layer

#### API Routes

**Chat APIs** (`src/app/api/chat/`)
- `POST /api/chat/query` - Process user queries
  1. Authenticate user
  2. Create or retrieve chat session
  3. Fetch organization's documents
  4. Use AI to identify relevant documents
  5. Generate answer using GPT-4
  6. Save messages and sources
  7. Return answer and sources

- `GET /api/chat/messages` - Retrieve session messages
- `GET /api/chat/sessions` - List user's sessions
- `DELETE /api/chat/sessions` - Delete a session

**Admin APIs** (`src/app/api/admin/`)
- `GET /api/admin/documents` - List documents
- `POST /api/admin/documents` - Create document
- `DELETE /api/admin/documents` - Delete document
- `GET /api/admin/users` - List users

#### Middleware (`src/middleware.ts`)
- Session management
- Route protection
- Authentication checks
- Redirects for unauthorized access

### Data Layer

#### Database Schema (PostgreSQL via Supabase)

**Organizations**
```sql
organizations
├── id (uuid, primary key)
├── name (varchar)
├── created_at (timestamp)
└── updated_at (timestamp)
```

**Users**
```sql
user_profiles
├── id (uuid, primary key, references auth.users)
├── organization_id (uuid, references organizations)
├── role (varchar: admin | user)
├── full_name (varchar)
├── email (varchar, unique)
├── created_at (timestamp)
└── updated_at (timestamp)
```

**Documents**
```sql
documents
├── id (uuid, primary key)
├── organization_id (uuid, references organizations)
├── title (varchar)
├── document_type (enum: legislation | case | regulation | guideline | other)
├── category_id (uuid, references document_categories)
├── jurisdiction (varchar)
├── reference_number (varchar)
├── enacted_date (date)
├── effective_date (date)
├── summary (text)
├── content (text)
├── file_url (text)
├── file_size (bigint)
├── tags (text[])
├── created_by (uuid, references user_profiles)
├── created_at (timestamp)
└── updated_at (timestamp)
```

**Chat Sessions & Messages**
```sql
chat_sessions
├── id (uuid, primary key)
├── user_id (uuid, references user_profiles)
├── organization_id (uuid, references organizations)
├── title (varchar)
├── created_at (timestamp)
└── updated_at (timestamp)

chat_messages
├── id (uuid, primary key)
├── session_id (uuid, references chat_sessions)
├── role (varchar: user | assistant | system)
├── content (text)
└── created_at (timestamp)

message_sources
├── id (uuid, primary key)
├── message_id (uuid, references chat_messages)
├── document_id (uuid, references documents)
├── relevance_score (float)
└── created_at (timestamp)
```

#### Row Level Security (RLS)
- Users can only access data within their organization
- Admins can create/update/delete documents
- All users can create chat sessions and messages
- Documents are isolated by organization

### AI/LLM Integration

#### OpenAI Integration (`src/lib/ai/openai.ts`)

**Query Analysis**
```typescript
analyzeQuery(query: string, documents: Document[])
```
- Takes user query and list of available documents
- Uses GPT-4 to identify relevant documents
- Returns array of document IDs with reasoning

**Answer Generation**
```typescript
generateAnswer(query: string, documents: Document[], history: Message[])
```
- Takes query, relevant documents, and conversation history
- Reads full document content
- Generates comprehensive answer with citations
- Returns formatted answer text

#### RAG Process Flow

1. **User submits query** → "What are the laws related to theft?"

2. **Document retrieval**
   - Fetch all documents in organization
   - Send to GPT-4 with metadata (title, summary, tags)
   - AI identifies relevant documents

3. **Context preparation**
   - Retrieve full content of identified documents
   - Include conversation history (last 10 messages)
   - Format as structured prompt

4. **Answer generation**
   - Send context + query to GPT-4
   - AI reads documents and generates answer
   - Answer includes citations to specific documents

5. **Response delivery**
   - Save assistant message to database
   - Link message to source documents
   - Return to user with sources displayed

## Security Architecture

### Authentication
- Supabase Auth handles user authentication
- JWT tokens for session management
- Secure cookie-based sessions

### Authorization
- Row Level Security (RLS) policies in database
- Organization-based data isolation
- Role-based access control (admin vs. user)
- Middleware checks on all protected routes

### Data Protection
- HTTPS for all communications
- Environment variables for secrets
- Service role key kept server-side only
- SQL injection prevention via parameterized queries

## Scalability Considerations

### Current Architecture
- Monolithic Next.js application
- Single Supabase database
- Synchronous API requests

### Scaling Strategies

**Horizontal Scaling**
- Deploy multiple Next.js instances
- Use load balancer
- Supabase handles database scaling

**Caching**
- Implement Redis for session caching
- Cache frequently accessed documents
- Cache AI responses for common queries

**Async Processing**
- Queue system for document uploads
- Background job processing
- Webhook-based notifications

**Database Optimization**
- Read replicas for heavy read operations
- Partitioning for large document tables
- Optimize indexes based on query patterns

## Monitoring and Observability

### Logging
- Next.js built-in logging
- API route logs
- Error tracking (can integrate Sentry)

### Metrics
- Supabase dashboard for database metrics
- OpenAI usage tracking
- Response time monitoring

### Alerts
- Database connection failures
- API rate limit warnings
- OpenAI API errors
- Authentication failures

## Technology Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Next.js 14, TypeScript, Tailwind CSS |
| UI Components | shadcn/ui, Radix UI |
| Backend | Next.js API Routes |
| Database | PostgreSQL (Supabase) |
| Authentication | Supabase Auth |
| Storage | Supabase Storage |
| AI/LLM | OpenAI GPT-4 |
| Deployment | Vercel (recommended) |
