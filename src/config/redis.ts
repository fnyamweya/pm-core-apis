import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { EnvConfiguration } from './env';

// Define the RedisConfig interface
interface RedisConfig {
  host: string;
  port: number;
  password: string;
  cacheTTL?: number;
}

// Custom error for Redis connection issues
class RedisConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedisConnectionError';
  }
}

// Singleton RedisManager class
class RedisManager {
  private static instance: RedisManager;
  private client: Redis;
  private subscriber: Redis;
  private bClient: Redis;

  // Private constructor to ensure it cannot be instantiated directly
  private constructor(config: RedisConfig) {
    this.client = this.createRedisClient(config);
    this.subscriber = this.createRedisClient(config, true);
    this.bClient = this.createRedisClient(config, true);

    this.setupEventListeners(this.client, 'main');
    this.setupEventListeners(this.subscriber, 'subscriber');
    this.setupEventListeners(this.bClient, 'blocking');
  }

  // Singleton instance getter
  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      // Redis configuration sourced from environment variables
      const redisConfig: RedisConfig = {
        host: EnvConfiguration.REDIS_HOST || 'localhost',
        port: Number(EnvConfiguration.REDIS_PORT) || 6379,
        password: EnvConfiguration.REDIS_PASSWORD || '',
        cacheTTL: EnvConfiguration.REDIS_DEFAULT_TTL
          ? Number(EnvConfiguration.REDIS_DEFAULT_TTL)
          : undefined,
      };
      RedisManager.instance = new RedisManager(redisConfig);
    }
    return RedisManager.instance;
  }

  // Create Redis client based on the provided config
  private createRedisClient(config: RedisConfig, isSubscriber = false): Redis {
    return new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      retryStrategy: this.retryStrategy.bind(this),
      reconnectOnError: this.reconnectOnError.bind(this),
      enableReadyCheck: !isSubscriber,
      maxRetriesPerRequest: isSubscriber ? null : undefined,
    });
  }

  // Getters for different Redis clients
  public getClient(): Redis {
    return this.client;
  }

  public getSubscriber(): Redis {
    return this.subscriber;
  }

  public getBlockingClient(): Redis {
    return this.bClient;
  }

  // Retry strategy for Redis client connection issues
  private retryStrategy(times: number): number | null {
    const maxRetryAttempts = 10;
    const maxDelay = 5000;

    if (times > maxRetryAttempts) {
      logger.error(
        `Redis max retry attempts (${maxRetryAttempts}) reached. Giving up.`
      );
      return null;
    }

    const delay = Math.min(times * 100, maxDelay);
    logger.warn(`Redis retrying connection in ${delay} ms (attempt ${times})`);
    return delay;
  }

  // Reconnection handler for specific Redis errors
  private reconnectOnError(err: Error): boolean {
    const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNREFUSED'];
    if (targetErrors.some((errorMsg) => err.message.includes(errorMsg))) {
      logger.warn(
        `Redis encountered a recoverable error: ${err.message}. Reconnecting...`
      );
      return true;
    }
    logger.error(`Redis encountered an unrecoverable error: ${err.message}`);
    return false;
  }

  // Setup Redis event listeners for logging
  private setupEventListeners(client: Redis, clientType: string): void {
    const events = [
      'connect',
      'error',
      'ready',
      'close',
      'reconnecting',
      'end',
    ];
    events.forEach((event) => {
      client.on(event, (err?: Error) => {
        if (err) {
          logger.error(`Redis ${clientType} ${event}: ${err.message}`);
        } else {
          logger.info(`Redis ${clientType} ${event}`);
        }
      });
    });
  }

  // Ping Redis to ensure connection is active
  public async ping(): Promise<string> {
    try {
      const result = await this.client.ping();
      logger.debug('Redis ping successful');
      return result;
    } catch (error) {
      logger.error('Redis ping failed', error);
      throw new RedisConnectionError('Failed to ping Redis server');
    }
  }

  // Close Redis connections gracefully
  public async close(): Promise<void> {
    try {
      await Promise.all([
        this.client.quit(),
        this.subscriber.quit(),
        this.bClient.quit(),
      ]);
      logger.info('Redis connections closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis connections', error);
      throw new RedisConnectionError('Failed to close Redis connections');
    }
  }
}

// Create a singleton RedisManager instance
const redisManager = RedisManager.getInstance();

export { RedisConfig, RedisConnectionError, redisManager };
