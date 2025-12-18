import OpenAI from 'openai';
import { env } from '@/lib/env';
import { logger, logError } from '@/lib/logger';
import { MAX_RELEVANT_DOCUMENTS } from '@/lib/constants';

// Initialize OpenAI client with validated environment variables
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export interface DocumentSearchResult {
  documentIds: string[];
  reasoning: string;
}

interface Document {
  id: string;
  title: string;
  document_type: string;
  summary?: string | null;
  content: string;
  tags?: string[] | null;
  jurisdiction?: string | null;
  reference_number?: string | null;
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Analyze user query and identify relevant documents
 */
export async function analyzeQuery(
  query: string,
  documents: Document[]
): Promise<DocumentSearchResult> {
  const startTime = Date.now();

  try {
    logger.info('Analyzing query', {
      queryLength: query.length,
      documentCount: documents.length,
    });

    const prompt = `You are a legal research assistant. Analyze the following user query and determine which documents from the provided list are most relevant.

User Query: "${query}"

Available Documents:
${documents.map((doc, idx) => `
${idx + 1}. ID: ${doc.id}
   Title: ${doc.title}
   Type: ${doc.document_type}
   Summary: ${doc.summary || 'N/A'}
   Tags: ${doc.tags?.join(', ') || 'N/A'}
   Jurisdiction: ${doc.jurisdiction || 'N/A'}
`).join('\n')}

Return a JSON object with:
1. documentIds: Array of relevant document IDs (strings)
2. reasoning: Brief explanation of why these documents were selected

Relevance guidance:
- Prefer the specific instruments that directly regulate the topic.
- If the query is broad (e.g., "acts related to …"), also include key repeal or amendment instruments that affect those acts (e.g., repeal orders, consolidation statutes), so the status can be explained.
- If unsure whether an instrument is still in force, include both the original act and the instrument that repeals or replaces it.
- Return at most ${MAX_RELEVANT_DOCUMENTS} document IDs.
`;

    const response = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a legal research assistant that identifies relevant legislation and legal documents. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    const result = JSON.parse(content) as DocumentSearchResult;

    logger.info('Query analysis completed', {
      duration: Date.now() - startTime,
      relevantDocs: result.documentIds.length,
    });

    return result;
  } catch (error) {
    logError(error, {
      context: 'analyzeQuery',
      queryLength: query.length,
      documentCount: documents.length,
    });
    throw new Error('Failed to analyze query');
  }
}

/**
 * Generate comprehensive answer based on relevant documents
 */
export async function generateAnswer(
  query: string,
  documents: Document[],
  conversationHistory: ConversationMessage[] = []
): Promise<string> {
  const startTime = Date.now();

  try {
    logger.info('Generating answer', {
      queryLength: query.length,
      documentCount: documents.length,
      historyLength: conversationHistory.length,
    });

    const documentsContext = documents
      .map(
        (doc) => `
Document: ${doc.title}
Type: ${doc.document_type}
Reference: ${doc.reference_number || 'N/A'}
Jurisdiction: ${doc.jurisdiction || 'N/A'}
${doc.summary ? `Summary: ${doc.summary}` : ''}

Content:
${doc.content}
---
`
      )
      .join('\n\n');

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are an expert legal research assistant. Provide accurate, well-cited answers based on the provided legal documents. Always cite specific legislation, cases, or documents when providing information. Be precise and professional.

When answering:
1. Reference specific documents by their titles
2. Quote relevant sections when applicable
3. Provide clear, structured responses
4. Indicate if information is not found in the provided sources
5. Use formal legal language where appropriate
6. Where applicable, clearly state the legal status (in force/repealed/expired) and identify the repealing or replacing instrument with citation.
7. If multiple instruments exist over time (original act, repeal order, consolidation), summarize the timeline succinctly.`,
      },
    ];

    // Add conversation history
    if (conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Add current query with document context
    messages.push({
      role: 'user',
      content: `Based on the following legal documents, please answer this question: "${query}"

Available Documents:
${documentsContext}

Please provide a comprehensive answer with citations to the relevant documents. If any document indicates that another has been repealed, expressly mention the repeal and the repealing instrument.`,
    });

    const response = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages,
      temperature: env.OPENAI_TEMPERATURE,
      max_tokens: env.OPENAI_MAX_TOKENS,
    });

    const answer = response.choices[0].message.content;

    if (!answer) {
      throw new Error('No content returned from OpenAI');
    }

    logger.info('Answer generation completed', {
      duration: Date.now() - startTime,
      answerLength: answer.length,
    });

    return answer;
  } catch (error) {
    logError(error, {
      context: 'generateAnswer',
      queryLength: query.length,
      documentCount: documents.length,
    });
    throw new Error('Failed to generate answer');
  }
}
