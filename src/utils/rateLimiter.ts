import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import Redis from 'ioredis';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { logger } from './logger';

export interface RateLimitConfig {
  points: number; // Number of points
  duration: number; // Per number of seconds
  blockDuration?: number; // Block duration in seconds
  keyPrefix?: string; // Prefix for Redis keys
}

interface RateLimiterResponse {
  isBlocked: boolean;
  remainingPoints: number;
  msBeforeNext: number;
}

export class RateLimiter {
  private limiter: RateLimiterRedis | RateLimiterMemory;
  private readonly defaultConfig: RateLimitConfig = {
    points: 5, // Default 5 requests
    duration: 1, // Per 1 second
    blockDuration: 60, // Block for 60 seconds if exceeded
    keyPrefix: 'rl', // Default Redis key prefix
  };

  constructor(config: Partial<RateLimitConfig> = {}, redisClient?: Redis) {
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      if (redisClient) {
        this.limiter = new RateLimiterRedis({
          storeClient: redisClient,
          points: finalConfig.points,
          duration: finalConfig.duration,
          blockDuration: finalConfig.blockDuration,
          keyPrefix: finalConfig.keyPrefix,
        });
      } else {
        // Fallback to memory-based rate limiter
        this.limiter = new RateLimiterMemory({
          points: finalConfig.points,
          duration: finalConfig.duration,
          blockDuration: finalConfig.blockDuration,
        });
      }
    } catch (err) {
      logger.error('Failed to initialize rate limiter:', err);
      // Fallback to memory-based rate limiter
      this.limiter = new RateLimiterMemory({
        points: finalConfig.points,
        duration: finalConfig.duration,
        blockDuration: finalConfig.blockDuration,
      });
    }
  }

  /**
   * Consume points for a given key
   * @param key - Identifier for the rate limit (e.g., IP address)
   * @returns Promise<RateLimiterResponse>
   */
  public async consume(key: string): Promise<RateLimiterResponse> {
    try {
      const rateLimiterRes = await this.limiter.consume(key);
      return {
        isBlocked: false,
        remainingPoints: rateLimiterRes.remainingPoints,
        msBeforeNext: rateLimiterRes.msBeforeNext,
      };
    } catch (rejRes: any) {
      return {
        isBlocked: true,
        remainingPoints: rejRes.remainingPoints,
        msBeforeNext: rejRes.msBeforeNext,
      };
    }
  }

  /**
   * Express middleware for rate limiting
   * @param getKey - Function to get the key from the request
   * @returns Express middleware function
   */
  public middleware(
    getKey: (req: Request) => string = (req) =>
      req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown'
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = getKey(req);

      try {
        const result = await this.consume(key);

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': this.defaultConfig.points.toString(),
          'X-RateLimit-Remaining': result.remainingPoints.toString(),
          'X-RateLimit-Reset': Math.ceil(result.msBeforeNext / 1000).toString(),
        });

        if (result.isBlocked) {
          res.status(StatusCodes.TOO_MANY_REQUESTS).json({
            error: 'Too Many Requests',
            retryAfter: Math.ceil(result.msBeforeNext / 1000),
          });
          return;
        }

        next();
      } catch (err) {
        logger.error('Rate limiter error:', err);
        // Allow the request in case of error
        next();
      }
    };
  }

  /**
   * Reset rate limit for a given key
   * @param key - Identifier to reset
   */
  public async reset(key: string): Promise<void> {
    try {
      await this.limiter.delete(key);
    } catch (err) {
      logger.error('Failed to reset rate limit:', err);
    }
  }
}

// Usage example
export const createRateLimiter = (
  config?: Partial<RateLimitConfig>,
  redisClient?: Redis
) => {
  return new RateLimiter(config, redisClient);
};
