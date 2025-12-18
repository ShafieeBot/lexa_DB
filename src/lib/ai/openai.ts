import OpenAI from 'openai';

function getOpenAI() {
  // Instantiate lazily to avoid build-time errors when OPENAI_API_KEY is not set
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Defer throwing until runtime usage; calling code can handle/log this
    // but we still create the client with an empty key to avoid build-time crashes.
    // However, OpenAI SDK throws if apiKey is missing at construction time, so only
    // throw when the functions are invoked.
    throw new Error('OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey });
}

export interface DocumentSearchResult {
  documentIds: string[];
  reasoning: string;
}

export async function analyzeQuery(query: string, documents: any[]): Promise<DocumentSearchResult> {
  const openai = getOpenAI();
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
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
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

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as DocumentSearchResult;
  } catch (error) {
    console.error('Error analyzing query:', error);
    throw new Error('Failed to analyze query');
  }
}

export async function generateAnswer(
  query: string,
  documents: any[],
  conversationHistory: any[] = []
): Promise<string> {
  const openai = getOpenAI();
  const documentsContext = documents.map(doc => `
Document: ${doc.title}
Type: ${doc.document_type}
Reference: ${doc.reference_number || 'N/A'}
Jurisdiction: ${doc.jurisdiction || 'N/A'}
${doc.summary ? `Summary: ${doc.summary}` : ''}

Content:
${doc.content}
---
`).join('\n\n');

  const messages: any[] = [
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

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      temperature: 0.5,
      max_tokens: 2000,
    });

    return response.choices[0].message.content || 'I apologize, but I was unable to generate a response.';
  } catch (error) {
    console.error('Error generating answer:', error);
    throw new Error('Failed to generate answer');
  }
}
