/**
 * Application-wide constants
 */

// Session & Chat
export const CHAT_SESSION_TITLE_MAX_LENGTH = 100;
export const CHAT_HISTORY_LIMIT = 10;
export const MESSAGE_MAX_LENGTH = 5000;

// Documents
export const DOCUMENT_FETCH_LIMIT = 100;
export const DOCUMENT_CONTENT_PREVIEW_LENGTH = 2000;
export const MAX_RELEVANT_DOCUMENTS = 5;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

// Search & Filtering
export const SEARCH_DEBOUNCE_MS = 300;

// Date Formatting
export const DATE_FORMAT = 'MMM d, yyyy';
export const DATETIME_FORMAT = 'MMM d, yyyy HH:mm';
export const DATE_FORMAT_LONG = 'MMMM d, yyyy';

// Cache TTL (in seconds)
export const CACHE_TTL = {
  DOCUMENTS: 60 * 5, // 5 minutes
  USER_PROFILE: 60 * 10, // 10 minutes
  QUERY_RESULTS: 60 * 30, // 30 minutes
} as const;

// Rate Limiting
export const RATE_LIMIT = {
  CHAT_QUERY: {
    MAX_REQUESTS: 30,
    WINDOW_MS: 60 * 1000, // 1 minute
  },
  DOCUMENT_UPLOAD: {
    MAX_REQUESTS: 10,
    WINDOW_MS: 60 * 1000, // 1 minute
  },
  API_GENERAL: {
    MAX_REQUESTS: 100,
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  },
} as const;

// Document Types
export const DOCUMENT_TYPES = [
  'legislation',
  'case',
  'regulation',
  'guideline',
  'other',
] as const;

// User Roles
export const USER_ROLES = ['admin', 'user'] as const;

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'You do not have permission to perform this action',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Invalid request data',
  INTERNAL_ERROR: 'An internal error occurred',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
  NO_DOCUMENTS: 'No documents available in your organization',
  AI_ERROR: 'Failed to generate AI response',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  DOCUMENT_UPLOADED: 'Document uploaded successfully',
  DOCUMENT_DELETED: 'Document deleted successfully',
  SETTINGS_UPDATED: 'Settings updated successfully',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;
