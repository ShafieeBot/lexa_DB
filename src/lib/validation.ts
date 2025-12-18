import { z } from 'zod';
import { MESSAGE_MAX_LENGTH } from './constants';

/**
 * Input validation schemas using Zod
 */

// Chat Query Schema
export const QuerySchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(MESSAGE_MAX_LENGTH, `Query too long (max ${MESSAGE_MAX_LENGTH} characters)`),
  session_id: z.string().uuid('Invalid session ID').optional(),
});

export type QueryInput = z.infer<typeof QuerySchema>;

// Document Upload Schema
export const DocumentUploadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  document_type: z.enum(['legislation', 'case', 'regulation', 'guideline', 'other']),
  category_id: z.string().uuid().optional().nullable(),
  jurisdiction: z.string().max(200).optional().nullable(),
  reference_number: z.string().max(200).optional().nullable(),
  enacted_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().nullable(),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().nullable(),
  summary: z.string().max(5000).optional().nullable(),
  content: z.string().min(1, 'Content is required'),
  tags: z.array(z.string()).optional().nullable(),
});

export type DocumentUploadInput = z.infer<typeof DocumentUploadSchema>;

// Pagination Schema
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  type: z.enum(['legislation', 'case', 'regulation', 'guideline', 'other']).optional(),
  jurisdiction: z.string().optional(),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

// Session ID Schema
export const SessionIdSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
});

export type SessionIdInput = z.infer<typeof SessionIdSchema>;

/**
 * Validate request body against schema
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      return { success: false, error: messages.join(', ') };
    }
    return { success: false, error: 'Validation failed' };
  }
}
