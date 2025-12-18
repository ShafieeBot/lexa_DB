import pino from 'pino';
import { env } from './env';

/**
 * Application-wide logger using Pino
 *
 * Usage:
 * logger.info('User logged in', { userId: '123' });
 * logger.error('Failed to fetch documents', { error });
 * logger.warn('Deprecated API used');
 */
export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  redact: {
    paths: [
      'password',
      'token',
      'apiKey',
      'secret',
      '*.password',
      '*.token',
      '*.apiKey',
      '*.secret',
    ],
    remove: true,
  },
});

/**
 * Create a child logger with additional context
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * Log HTTP request
 */
export function logRequest(method: string, url: string, statusCode: number, duration: number) {
  logger.info({
    type: 'http',
    method,
    url,
    statusCode,
    duration,
  });
}

/**
 * Log error with context
 */
export function logError(error: unknown, context?: Record<string, unknown>) {
  if (error instanceof Error) {
    logger.error({
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...context,
    });
  } else {
    logger.error({
      error: String(error),
      ...context,
    });
  }
}
