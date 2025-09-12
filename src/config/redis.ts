import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { EnvConfiguration } from './env';

interface RedisConfig {
  host: string;
  port: number;
  password: string;
  cacheTTL?: number;
}

class RedisConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedisConnectionError';
  }
}

class RedisManager {
  private static instance: RedisManager;
  private client: Redis;
  private subscriber: Redis;
  private bClient: Redis;
  private closingPromise: Promise<void> | null = null;
  private closed = false;

  private constructor(config: RedisConfig) {
    this.client = this.createRedisClient(config);
    this.subscriber = this.createRedisClient(config, true);
    this.bClient = this.createRedisClient(config, true);

    this.setupEventListeners(this.client, 'main');
    this.setupEventListeners(this.subscriber, 'subscriber');
    this.setupEventListeners(this.bClient, 'blocking');
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
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

  public getClient(): Redis {
    return this.client;
  }
  public getSubscriber(): Redis {
    return this.subscriber;
  }
  public getBlockingClient(): Redis {
    return this.bClient;
  }

  private retryStrategy(times: number): number | null {
    const maxRetryAttempts = 10;
    const maxDelay = 5000;
    if (times > maxRetryAttempts) {
      logger.error(`Redis max retry attempts (${maxRetryAttempts}) reached. Giving up.`);
      return null;
    }
    const delay = Math.min(times * 100, maxDelay);
    logger.warn(`Redis retrying connection in ${delay} ms (attempt ${times})`);
    return delay;
  }

  private reconnectOnError(err: Error): boolean {
    const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNREFUSED'];
    if (targetErrors.some((e) => err.message.includes(e))) {
      logger.warn(`Redis encountered a recoverable error: ${err.message}. Reconnecting...`);
      return true;
    }
    logger.error(`Redis encountered an unrecoverable error: ${err.message}`);
    return false;
  }

  private setupEventListeners(client: Redis, clientType: string): void {
    const events = ['connect', 'error', 'ready', 'close', 'reconnecting', 'end'];
    events.forEach((event) => {
      client.on(event, (err?: Error) => {
        if (err) logger.error(`Redis ${clientType} ${event}: ${err.message}`);
        else logger.info(`Redis ${clientType} ${event}`);
      });
    });
  }

  public async ping(): Promise<string> {
    try {
      const result = await this.client.ping();
      return result;
    } catch (error) {
      throw new RedisConnectionError('Failed to ping Redis server');
    }
  }

  public async close(): Promise<void> {
    if (this.closed) return;
    if (this.closingPromise) {
      await this.closingPromise;
      return;
    }
    this.closingPromise = Promise.allSettled([
      this.client.quit(),
      this.subscriber.quit(),
      this.bClient.quit(),
    ])
      .then(() => {
        logger.info('Redis connections closed gracefully');
      })
      .catch((e) => {
        logger.error('Error closing Redis connections', e);
      })
      .finally(() => {
        this.closed = true;
        this.closingPromise = null;
      });
    await this.closingPromise;
  }
}

const redisManager = RedisManager.getInstance();
export { RedisConfig, RedisConnectionError, redisManager };
