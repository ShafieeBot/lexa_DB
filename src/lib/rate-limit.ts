import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from './cache/redis';
import { logger } from './logger';
import { HTTP_STATUS, ERROR_MESSAGES } from './constants';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Rate limiting middleware using Redis or in-memory storage
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private memoryStore: Map<string, { count: number; resetTime: number }>;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.memoryStore = new Map();
  }

  /**
   * Check if request should be rate limited
   */
  async check(
    identifier: string
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const redis = getRedisClient();

    if (redis) {
      return this.checkRedis(identifier, redis);
    } else {
      return this.checkMemory(identifier);
    }
  }

  private async checkRedis(
    identifier: string,
    redis: NonNullable<ReturnType<typeof getRedisClient>>
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Remove old entries
      await redis.zremrangebyscore(key, 0, windowStart);

      // Count requests in current window
      const count = await redis.zcard(key);

      if (count >= this.config.maxRequests) {
        const oldestTimestamp = await redis.zrange(key, 0, 0, 'WITHSCORES');
        const resetTime = oldestTimestamp[1]
          ? parseInt(oldestTimestamp[1], 10) + this.config.windowMs
          : now + this.config.windowMs;

        return {
          allowed: false,
          remaining: 0,
          resetTime,
        };
      }

      // Add current request
      await redis.zadd(key, now, `${now}-${Math.random()}`);
      await redis.pexpire(key, this.config.windowMs);

      return {
        allowed: true,
        remaining: this.config.maxRequests - count - 1,
        resetTime: now + this.config.windowMs,
      };
    } catch (error) {
      logger.error('Rate limit check error (Redis)', { identifier, error });
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
      };
    }
  }

  private checkMemory(
    identifier: string
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = this.memoryStore.get(identifier);

    if (!record || now > record.resetTime) {
      // New window
      const resetTime = now + this.config.windowMs;
      this.memoryStore.set(identifier, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime,
      };
    }

    if (record.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
      };
    }

    record.count++;
    return {
      allowed: true,
      remaining: this.config.maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }

  /**
   * Create middleware for Next.js API routes
   */
  middleware() {
    return async (request: NextRequest): Promise<NextResponse | null> => {
      // Get identifier (best-effort client IP under proxies)
      const identifier = (() => {
        const xff = request.headers.get('x-forwarded-for');
        if (xff) return xff.split(',')[0].trim();

        const realIp = request.headers.get('x-real-ip');
        if (realIp) return realIp.trim();

        const vercelIp = request.headers.get('x-vercel-forwarded-for');
        if (vercelIp) return vercelIp.split(',')[0].trim();

        return 'unknown';
      })();

      const result = await this.check(identifier);

      if (!result.allowed) {
        logger.warn('Rate limit exceeded', { identifier });

        return NextResponse.json(
          { error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED },
          {
            status: HTTP_STATUS.TOO_MANY_REQUESTS,
            headers: {
              'X-RateLimit-Limit': String(this.config.maxRequests),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(result.resetTime),
              'Retry-After': String(
                Math.ceil((result.resetTime - Date.now()) / 1000)
              ),
            },
          }
        );
      }

      // Request allowed - could add headers to response
      return null;
    };
  }
}

// Export pre-configured rate limiters
export const chatRateLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
});

export const documentRateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
});

export const generalRateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
});
