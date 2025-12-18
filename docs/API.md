# API Documentation

This document describes the API endpoints available in the Lexa DB system.

## Authentication

All API endpoints require authentication via Supabase Auth. The authentication token is automatically handled by the Supabase client in the application.

## Chat APIs

### POST /api/chat/query

Submit a query and get an AI-generated answer with relevant documents.

**Request Body:**
```json
{
  "query": "What are the laws related to theft?",
  "session_id": "optional-existing-session-id"
}
```

**Response:**
```json
{
  "answer": "Based on the provided legislation...",
  "sources": [
    {
      "id": "doc-uuid",
      "title": "Criminal Code Section 322",
      "document_type": "legislation",
      "content": "...",
      "tags": ["criminal", "theft"]
    }
  ],
  "session_id": "session-uuid",
  "message_id": "message-uuid"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (no organization assigned)
- `500` - Server error

### GET /api/chat/messages

Retrieve all messages in a chat session.

**Query Parameters:**
- `session_id` (required) - The chat session ID

**Response:**
```json
{
  "messages": [
    {
      "id": "message-uuid",
      "session_id": "session-uuid",
      "role": "user",
      "content": "What are the laws related to theft?",
      "created_at": "2025-01-01T00:00:00Z",
      "sources": []
    },
    {
      "id": "message-uuid",
      "session_id": "session-uuid",
      "role": "assistant",
      "content": "Based on the provided legislation...",
      "created_at": "2025-01-01T00:00:05Z",
      "sources": [...]
    }
  ]
}
```

### GET /api/chat/sessions

Get all chat sessions for the current user.

**Response:**
```json
{
  "sessions": [
    {
      "id": "session-uuid",
      "user_id": "user-uuid",
      "organization_id": "org-uuid",
      "title": "What are the laws related to theft?",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### DELETE /api/chat/sessions

Delete a chat session.

**Request Body:**
```json
{
  "session_id": "session-uuid"
}
```

**Response:**
```json
{
  "success": true
}
```

## Admin APIs

All admin APIs require the user to have the `admin` role.

### GET /api/admin/documents

Get all documents in the organization.

**Response:**
```json
{
  "documents": [
    {
      "id": "doc-uuid",
      "organization_id": "org-uuid",
      "title": "Criminal Code Section 322",
      "document_type": "legislation",
      "category_id": "category-uuid",
      "jurisdiction": "Federal",
      "reference_number": "R.S.C. 1985, c. C-46, s. 322",
      "enacted_date": "1985-01-01",
      "effective_date": "1985-01-01",
      "summary": "Defines theft and penalties",
      "content": "Full text of the legislation...",
      "file_url": null,
      "file_size": null,
      "tags": ["criminal", "theft", "property"],
      "created_by": "user-uuid",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z",
      "category": {
        "id": "category-uuid",
        "name": "Criminal Law",
        "description": "..."
      }
    }
  ]
}
```

### POST /api/admin/documents

Create a new document.

**Request Body:**
```json
{
  "title": "Criminal Code Section 322",
  "document_type": "legislation",
  "jurisdiction": "Federal",
  "reference_number": "R.S.C. 1985, c. C-46, s. 322",
  "enacted_date": "1985-01-01",
  "summary": "Defines theft and penalties",
  "content": "Full text of the legislation...",
  "tags": ["criminal", "theft", "property"]
}
```

**Response:**
```json
{
  "document": {
    "id": "doc-uuid",
    ...
  }
}
```

### DELETE /api/admin/documents

Delete a document.

**Request Body:**
```json
{
  "document_id": "doc-uuid"
}
```

**Response:**
```json
{
  "success": true
}
```

### GET /api/admin/users

Get all users in the organization.

**Response:**
```json
{
  "users": [
    {
      "id": "user-uuid",
      "organization_id": "org-uuid",
      "role": "admin",
      "full_name": "John Doe",
      "email": "john@example.com",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error message description"
}
```

Common error status codes:
- `400` - Bad Request (missing or invalid parameters)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Rate Limiting

Currently, there is no rate limiting implemented. For production use, consider implementing rate limiting on the API routes to prevent abuse.

## Data Models

### Document Types

- `legislation` - Laws and statutes
- `case` - Court cases and precedents
- `regulation` - Regulatory documents
- `guideline` - Guidelines and policies
- `other` - Other legal documents

### User Roles

- `admin` - Full access to manage documents and users
- `user` - Can use the chat interface and view documents

### Message Roles

- `user` - Messages from the user
- `assistant` - AI-generated responses
- `system` - System messages (rarely used)

## WebSocket Support

Currently, the application uses HTTP polling for real-time updates. WebSocket support can be added for true real-time communication if needed.

## Extending the API

To add new API endpoints:

1. Create a new file in `src/app/api/your-endpoint/route.ts`
2. Export HTTP method handlers (GET, POST, PUT, DELETE, etc.)
3. Use the Supabase client for database operations
4. Implement proper authentication and authorization checks

Example:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Your logic here
  
  return NextResponse.json({ data: 'your response' });
}
```
