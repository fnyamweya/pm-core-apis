import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../utils/logger';
import { EnvConfiguration } from './env';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  cacheTTL?: number;
  enabled: boolean;
}

class RedisConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedisConnectionError';
  }
}

class RedisManager {
  private static instance: RedisManager;
  private client?: Redis;
  private subscriber?: Redis;
  private bClient?: Redis;

  private constructor(config: RedisConfig) {
    if (!config.enabled) {
      logger.warn('Redis is disabled via REDIS_ENABLED=false');
      return;
    }

    const opts = this.buildOptions(config);

    this.client = new Redis(opts);
    this.subscriber = new Redis(this.buildOptions(config, true));
    this.bClient = new Redis(this.buildOptions(config, true));

    this.setupEventListeners(this.client, 'main');
    this.setupEventListeners(this.subscriber, 'subscriber');
    this.setupEventListeners(this.bClient, 'blocking');
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      const enabled = (EnvConfiguration.REDIS_ENABLED ?? 'true').toLowerCase() !== 'false';

      const host = EnvConfiguration.REDIS_HOST || '';
      const port = Number(EnvConfiguration.REDIS_PORT || '0');
      const passwordRaw = EnvConfiguration.REDIS_PASSWORD;
      const password = passwordRaw && passwordRaw.trim().length > 0 ? passwordRaw : undefined;

      const cfg: RedisConfig = {
        enabled,
        host: host,
        port: port,
        password,
        cacheTTL: EnvConfiguration.REDIS_DEFAULT_TTL ? Number(EnvConfiguration.REDIS_DEFAULT_TTL) : undefined
      };

      if (enabled && (!cfg.host || !cfg.port)) {
        // Don’t attempt localhost in containers; fail fast with a clear message
        throw new RedisConnectionError(
          'REDIS is enabled but REDIS_HOST/REDIS_PORT are not set. Provide a Redis endpoint or set REDIS_ENABLED=false.'
        );
      }

      RedisManager.instance = new RedisManager(cfg);
    }
    return RedisManager.instance;
  }

  private buildOptions(config: RedisConfig, isSubscriber = false): RedisOptions {
    const base: RedisOptions = {
      host: config.host,
      port: config.port,
      retryStrategy: this.retryStrategy.bind(this),
      reconnectOnError: this.reconnectOnError.bind(this),
      enableReadyCheck: !isSubscriber,
      maxRetriesPerRequest: isSubscriber ? null : undefined
    };

    // Only attach password if present; this avoids AUTH with an empty string
    if (config.password) {
      base.password = config.password;
    }
    return base;
  }

  public getClient(): Redis {
    if (!this.client) throw new RedisConnectionError('Redis is disabled; client is unavailable');
    return this.client;
  }

  public getSubscriber(): Redis {
    if (!this.subscriber) throw new RedisConnectionError('Redis is disabled; subscriber is unavailable');
    return this.subscriber;
  }

  public getBlockingClient(): Redis {
    if (!this.bClient) throw new RedisConnectionError('Redis is disabled; blocking client is unavailable');
    return this.bClient;
  }

  private retryStrategy(times: number): number | null {
    const maxRetryAttempts = 10;
    const maxDelay = 5_000;
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
    const events: Array<'connect' | 'error' | 'ready' | 'close' | 'reconnecting' | 'end'> = [
      'connect',
      'error',
      'ready',
      'close',
      'reconnecting',
      'end'
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

  public async ping(): Promise<string> {
    if (!this.client) return 'disabled';
    try {
      const result = await this.client.ping();
      logger.debug('Redis ping successful');
      return result;
    } catch (error) {
      logger.error('Redis ping failed', error);
      throw new RedisConnectionError('Failed to ping Redis server');
    }
  }

  public async close(): Promise<void> {
    if (!this.client || !this.subscriber || !this.bClient) return;
    try {
      await Promise.all([this.client.quit(), this.subscriber.quit(), this.bClient.quit()]);
      logger.info('Redis connections closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis connections', error);
      throw new RedisConnectionError('Failed to close Redis connections');
    }
  }
}

const redisManager = RedisManager.getInstance();
export { RedisConfig, RedisConnectionError, redisManager };
