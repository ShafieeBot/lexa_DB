import Redis from 'ioredis';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

let redis: Redis | null = null;

/**
 * Get Redis client (singleton)
 */
export function getRedisClient(): Redis | null {
  // If Redis URL is not configured, return null (caching disabled)
  if (!env.REDIS_URL) {
    return null;
  }

  if (!redis) {
    try {
      redis = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      redis.on('error', (error) => {
        logger.error('Redis connection error', { error });
      });

      redis.on('connect', () => {
        logger.info('Redis connected');
      });
    } catch (error) {
      logger.error('Failed to initialize Redis', { error });
      return null;
    }
  }

  return redis;
}

/**
 * Get value from cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const value = await client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    logger.error('Cache get error', { key, error });
    return null;
  }
}

/**
 * Set value in cache
 */
export async function setCache(key: string, value: unknown, ttl?: number): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await client.setex(key, ttl, serialized);
    } else {
      await client.set(key, serialized);
    }
  } catch (error) {
    logger.error('Cache set error', { key, error });
  }
}

/**
 * Delete value from cache
 */
export async function delCache(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.del(key);
  } catch (error) {
    logger.error('Cache delete error', { key, error });
  }
}

/**
 * Clear all cache with pattern
 */
export async function clearCachePattern(pattern: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    logger.error('Cache clear pattern error', { pattern, error });
  }
}
