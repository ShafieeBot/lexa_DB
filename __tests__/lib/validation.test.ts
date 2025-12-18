import { QuerySchema, DocumentUploadSchema, PaginationSchema, validateRequest } from '@/lib/validation';

describe('Validation', () => {
  describe('QuerySchema', () => {
    it('should validate valid query', () => {
      const result = validateRequest(QuerySchema, {
        query: 'What are the laws related to theft?',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe('What are the laws related to theft?');
      }
    });

    it('should reject empty query', () => {
      const result = validateRequest(QuerySchema, {
        query: '',
      });
      expect(result.success).toBe(false);
    });

    it('should validate query with session_id', () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';
      const result = validateRequest(QuerySchema, {
        query: 'Test query',
        session_id: sessionId,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.session_id).toBe(sessionId);
      }
    });

    it('should reject invalid UUID for session_id', () => {
      const result = validateRequest(QuerySchema, {
        query: 'Test query',
        session_id: 'invalid-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('DocumentUploadSchema', () => {
    it('should validate valid document', () => {
      const result = validateRequest(DocumentUploadSchema, {
        title: 'Test Document',
        document_type: 'legislation',
        content: 'Document content here',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing title', () => {
      const result = validateRequest(DocumentUploadSchema, {
        document_type: 'legislation',
        content: 'Document content',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid document_type', () => {
      const result = validateRequest(DocumentUploadSchema, {
        title: 'Test',
        document_type: 'invalid',
        content: 'Content',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('PaginationSchema', () => {
    it('should use default values', () => {
      const result = validateRequest(PaginationSchema, {});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.page_size).toBe(20);
      }
    });

    it('should reject page less than 1', () => {
      const result = validateRequest(PaginationSchema, { page: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject page_size greater than 100', () => {
      const result = validateRequest(PaginationSchema, { page_size: 101 });
      expect(result.success).toBe(false);
    });
  });
});
