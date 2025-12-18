# Lexa DB - Legal Research & RAG System

A sophisticated legal research platform that uses AI and Retrieval-Augmented Generation (RAG) to help users query legislation databases and get intelligent, context-aware answers.

## Overview

This system allows users to query a database of legislations and legal documents. An LLM identifies relevant documents, presents them as sources, and generates comprehensive answers by reading and analyzing the full documents.

## Key Features

- 🔍 **Intelligent Document Retrieval**: LLM-powered search that understands legal queries
- 📚 **Source Transparency**: All relevant documents shown with metadata before generating answers
- 💬 **Interactive Chat**: Follow-up questions with context awareness
- 👥 **Organization Management**: Multi-user organizations with role-based access
- 🔐 **Secure Authentication**: Supabase Auth with organization isolation
- 📊 **Admin Dashboard**: Document upload, metadata management, and user administration

## Architecture

### Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **AI/LLM**: OpenAI GPT-4 (configurable)
- **UI Components**: shadcn/ui

### System Flow

1. User submits a query (e.g., "what are the laws related to theft")
2. LLM analyzes the query and searches document metadata
3. System retrieves relevant legislations and cases
4. Sources are displayed in the right panel
5. LLM reads all source documents
6. Generated answer is displayed with citations
7. User can ask follow-up questions with context

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# Start development server
npm run dev
```

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

## Development

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```