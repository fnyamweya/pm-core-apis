import { GRPC as Cerbos } from '@cerbos/grpc';
import { logger } from '../utils/logger';
import { EnvConfiguration } from './env';

// Configuration interface for type safety
interface CerbosConfig {
  host: string;
  port: number;
  tls: boolean;
  playgroundInstance?: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

// Custom error class for Cerbos-related errors
class CerbosError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'CerbosError';
  }
}

// Configuration validator
class ConfigValidator {
  private static validatePort(port: number): boolean {
    return Number.isInteger(port) && port > 0 && port <= 65535;
  }

  static validate(config: Partial<CerbosConfig>): void {
    if (!config.host) {
      throw new CerbosError('CERBOS_HOST is not set');
    }

    if (!config.port) {
      throw new CerbosError('CERBOS_PORT is not set');
    }

    if (!this.validatePort(config.port)) {
      throw new CerbosError(`Invalid port number: ${config.port}`);
    }
  }
}

// Connection manager for handling retries and connection state
class ConnectionManager {
  private retryCount = 0;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(
    private readonly config: CerbosConfig,
    maxRetries = 3,
    retryDelayMs = 1000
  ) {
    this.maxRetries = maxRetries;
    this.retryDelayMs = retryDelayMs;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async connect(): Promise<Cerbos> {
    while (this.retryCount < this.maxRetries) {
      try {
        const client = new Cerbos(`${this.config.host}:${this.config.port}`, {
          tls: this.config.tls,
          playgroundInstance: this.config.playgroundInstance,
        });

        // Test the connection by making a simple request
        await this.testConnection(client);

        logger.info('Cerbos client connected successfully');
        return client;
      } catch (error) {
        this.retryCount++;

        if (this.retryCount === this.maxRetries) {
          throw new CerbosError(
            `Failed to connect to Cerbos after ${this.maxRetries} attempts`,
            error
          );
        }

        logger.warn(
          `Connection attempt ${this.retryCount} failed, retrying in ${
            this.retryDelayMs
          }ms...`
        );
        await this.delay(this.retryDelayMs);
      }
    }

    throw new CerbosError('Max retry attempts exceeded');
  }

  private async testConnection(client: Cerbos): Promise<void> {
    try {
      await client.serverInfo();
    } catch (error) {
      throw new CerbosError('Failed to verify Cerbos connection', error);
    }
  }
}

// Main CerbosClient class implementing the singleton pattern
class CerbosClient {
  private static instance: Cerbos | null = null;
  private static connectionManager: ConnectionManager | null = null;

  private constructor() {}

  private static createConfig(): CerbosConfig {
    const config: CerbosConfig = {
      host: EnvConfiguration.CERBOS_HOST || 'localhost',
      port: Number(EnvConfiguration.CERBOS_PORT) || 3592,
      tls: EnvConfiguration.CERBOS_TLS?.toLowerCase() === 'true',
      playgroundInstance: EnvConfiguration.CERBOS_PLAYGROUND_INSTANCE,
      maxRetries: Number(EnvConfiguration.CERBOS_MAX_RETRIES) || 3,
      retryDelayMs: Number(EnvConfiguration.CERBOS_RETRY_DELAY_MS) || 1000,
    };

    ConfigValidator.validate(config);
    return config;
  }

  public static async getInstance(): Promise<Cerbos> {
    if (!CerbosClient.instance) {
      logger.info('Initializing new Cerbos client instance');

      try {
        const config = this.createConfig();
        this.connectionManager = new ConnectionManager(
          config,
          config.maxRetries,
          config.retryDelayMs
        );

        CerbosClient.instance = await this.connectionManager.connect();
      } catch (error) {
        logger.error('Failed to initialize Cerbos client:', error);
        throw error instanceof CerbosError
          ? error
          : new CerbosError('Failed to initialize Cerbos client', error);
      }
    }

    return CerbosClient.instance;
  }

  public static async resetInstance(): Promise<void> {
    if (CerbosClient.instance) {
      CerbosClient.instance = null;
      CerbosClient.connectionManager = null;
      logger.info('Cerbos client instance reset');
    }
  }
}

// Export an async function to get the client instance
export async function getCerbosClient(): Promise<Cerbos> {
  return CerbosClient.getInstance();
}
