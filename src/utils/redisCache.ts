import Redis from 'ioredis';
import { redisManager } from '../config/redis';
import { logger } from './logger';

class RedisCache<T> {
  private redisClient: Redis;
  private cacheTTL: number;

  constructor(cacheTTL: number) {
    this.redisClient = redisManager.getClient();
    this.cacheTTL = cacheTTL || 3600; // Default TTL is 1 hour if not specified
  }

  /**
   * Generates a standardized cache key.
   * @param prefix - Prefix for the cache key (e.g., 'user').
   * @param identifier - Unique identifier for the cached item (e.g., user ID).
   * @returns A standardized cache key.
   */
  private generateCacheKey(prefix: string, identifier: string): string {
    return `${prefix}:${identifier}`;
  }

  /**
   * Ensures Redis connection before proceeding.
   */
  private async ensureConnected(): Promise<void> {
    if (!this.redisClient.status || this.redisClient.status !== 'ready') {
      logger.warn('Redis client is not connected');
      await this.redisClient.connect();
    }
  }

  /**
   * Retrieves an item from the cache.
   * @param prefix - The prefix used when caching the item.
   * @param identifier - Unique identifier of the cached item.
   * @returns The cached item or null if not found.
   */
  public async getFromCache<U = T>(
    prefix: string,
    identifier: string
  ): Promise<U | null> {
    await this.ensureConnected();
    const key = this.generateCacheKey(prefix, identifier);
    try {
      const cachedValue = await this.redisClient.get(key);
      if (cachedValue) {
        try {
          const parsed = JSON.parse(cachedValue) as U;
          return parsed;
        } catch (error) {
          logger.error('Failed to parse cached value', { error, cachedValue });
          return Array.isArray(null as unknown as U)
            ? ([] as unknown as U)
            : null;
        }
      }
      return Array.isArray(null as unknown as U) ? ([] as unknown as U) : null;
    } catch (error) {
      logger.error('Error retrieving from cache', {
        error,
        prefix,
        identifier,
      });
      return Array.isArray(null as unknown as U) ? ([] as unknown as U) : null;
    }
  }

  /**
   * Stores an item in the cache with an optional TTL.
   * @param prefix - Prefix for the cache key.
   * @param identifier - Unique identifier for the item.
   * @param value - The item to cache.
   * @param ttl - Optional custom TTL for this item.
   */
  public async setToCache(
    prefix: string,
    identifier: string,
    value: T | T[] | string,
    ttl?: number
  ): Promise<void> {
    await this.ensureConnected();
    const key = this.generateCacheKey(prefix, identifier);
    try {
      const valueToCache =
        typeof value === 'string' ? value : JSON.stringify(value);
      await this.redisClient.set(key, valueToCache, 'EX', ttl ?? this.cacheTTL);
    } catch (error) {
      logger.error(`Error setting cache for key ${key}`, { error });
    }
  }

  /**
   * Retrieves multiple items from the cache.
   * @param prefix - The prefix for cache keys.
   * @param identifiers - Array of identifiers for the cached items.
   * @returns Array of cached items or nulls.
   */
  public async getMultiFromCache(
    prefix: string,
    identifiers: string[]
  ): Promise<(T | string | null)[]> {
    await this.ensureConnected();
    const keys = identifiers.map((id) => this.generateCacheKey(prefix, id));
    try {
      const cachedValues = await this.redisClient.mget(keys);
      return cachedValues.map((value) => {
        if (value) {
          try {
            return JSON.parse(value) as T;
          } catch (error) {
            return value; // Return the raw string if parsing fails
          }
        }
        return null;
      });
    } catch (error) {
      logger.error('Error retrieving multiple cache entries', { error });
      return identifiers.map(() => null);
    }
  }

  /**
   * Stores multiple items in the cache.
   * @param prefix - The prefix for cache keys.
   * @param keyValuePairs - An array of [identifier, value] pairs to cache.
   * @param ttl - Optional custom TTL for all items.
   */
  public async setMultiToCache(
    prefix: string,
    keyValuePairs: [string, T | string][],
    ttl?: number
  ): Promise<void> {
    await this.ensureConnected();
    try {
      const pipeline = this.redisClient.pipeline();
      keyValuePairs.forEach(([id, value]) => {
        const key = this.generateCacheKey(prefix, id);
        const valueToCache =
          typeof value === 'string' ? value : JSON.stringify(value);
        pipeline.set(key, valueToCache, 'EX', ttl ?? this.cacheTTL);
      });
      await pipeline.exec();
    } catch (error) {
      logger.error('Error setting multiple cache entries', { error });
    }
  }

  /**
   * Deletes a specific key from the cache.
   * @param prefix - Prefix used when caching the item.
   * @param identifier - Unique identifier of the cached item.
   * @returns True if the deletion was successful, false otherwise.
   */
  public async deleteKey(prefix: string, identifier: string): Promise<boolean> {
    await this.ensureConnected();
    const key = this.generateCacheKey(prefix, identifier);
    try {
      const result = await this.redisClient.del(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error deleting cache for key ${key}`, { error });
      return false;
    }
  }

  /**
   * Invalidates the entire cache.
   */
  public async invalidateCache(): Promise<void> {
    await this.ensureConnected();
    try {
      await this.redisClient.flushdb();
    } catch (error) {
      logger.error('Error flushing Redis cache', { error });
    }
  }

  /**
   * Invalidates cache entries matching a specific pattern.
   * @param pattern - Pattern to match cache keys.
   */
  public async invalidateCacheForPattern(pattern: string): Promise<void> {
    await this.ensureConnected();
    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length) {
        await this.redisClient.del(keys);
      }
    } catch (error) {
      logger.error(`Error invalidating cache for pattern ${pattern}`, {
        error,
      });
    }
  }

  /**
   * Checks if a specific key exists in the cache.
   * @param prefix - Prefix used for the key.
   * @param identifier - Unique identifier for the cache item.
   * @returns True if the key exists, false otherwise.
   */
  public async hasKey(prefix: string, identifier: string): Promise<boolean> {
    await this.ensureConnected();
    const key = this.generateCacheKey(prefix, identifier);
    try {
      return (await this.redisClient.exists(key)) === 1;
    } catch (error) {
      logger.error(`Error checking existence of key ${key}`, { error });
      return false;
    }
  }

  /**
   * Increments a numeric value in the cache.
   * @param prefix - Prefix used for the key.
   * @param identifier - Unique identifier for the cache item.
   * @param increment - Amount to increment by (default is 1).
   * @returns New value after incrementing.
   */
  public async increment(
    prefix: string,
    identifier: string,
    increment: number = 1
  ): Promise<number> {
    await this.ensureConnected();
    const key = this.generateCacheKey(prefix, identifier);
    try {
      return await this.redisClient.incrby(key, increment);
    } catch (error) {
      logger.error(`Error incrementing value for key ${key}`, { error });
      throw error;
    }
  }
}

export default RedisCache;
