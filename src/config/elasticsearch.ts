import { Client, ClientOptions } from '@elastic/elasticsearch';
import { EventEmitter } from 'events';
import fs from 'fs';
import { logger } from '../utils/logger';

/**
 * Interface for Elasticsearch environment configuration
 */
interface ElasticsearchConfig {
  node: string;
  username: string;
  password: string;
  maxRetries: number;
  requestTimeout: number;
  sniffInterval: number;
  tls?: {
    rejectUnauthorized: boolean;
    ca?: string;
  };
}

// Custom error class for Elasticsearch-related errors
class ElasticsearchError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ElasticsearchError';
  }
}

/**
 * Load configuration from environment variables with validation
 */
const loadConfig = (): ElasticsearchConfig => {
  const config: ElasticsearchConfig = {
    node: process.env.ES_URL || 'http://elasticsearch:9200',
    username: process.env.ES_USERNAME || 'elastic',
    password: process.env.ES_PASSWORD || '',
    maxRetries: Number(process.env.ES_MAX_RETRIES) || 5,
    requestTimeout: Number(process.env.ES_REQUEST_TIMEOUT) || 60000,
    sniffInterval: Number(process.env.ES_SNIFF_INTERVAL) || 30000,
  };

  // TLS configuration if enabled
  if (process.env.ES_USE_SSL === 'true') {
    config.tls = {
      rejectUnauthorized: process.env.ES_REJECT_UNAUTHORIZED !== 'false',
      ca: process.env.ES_CA_CERT
        ? fs.readFileSync(process.env.ES_CA_CERT, 'utf-8')
        : undefined,
    };
  }

  // Validate configuration
  if (!config.node) {
    throw new ElasticsearchError('Elasticsearch node URL is required');
  }

  if (config.maxRetries < 0) {
    throw new ElasticsearchError('Max retries must be a non-negative number');
  }

  return config;
};

/**
 * Manages the Elasticsearch client with retry logic and error handling
 */
class ElasticsearchClientManager extends EventEmitter {
  private client: Client | null = null;
  private readonly config: ElasticsearchConfig;
  private connectionAttempts = 0;
  private readonly MAX_CONNECTION_ATTEMPTS = 3;
  private readonly RECONNECT_DELAY = 5000;

  constructor() {
    super();
    this.config = loadConfig();
  }

  /**
   * Initialize the Elasticsearch client with retry logic
   */
  public async initialize(): Promise<void> {
    try {
      const clientOptions: ClientOptions = {
        node: this.config.node,
        auth: {
          username: this.config.username,
          password: this.config.password,
        },
        maxRetries: this.config.maxRetries,
        requestTimeout: this.config.requestTimeout,
        tls: this.config.tls, // Use tls for SSL configuration
        sniffOnStart: true,
        sniffInterval: this.config.sniffInterval,
        compression: true, // Set as boolean to enable compression
        name: `elasticsearch-client-${process.env.NODE_ENV}`, // Identify client in logs
      };

      this.client = new Client(clientOptions);

      // Verify connection
      await this.verifyConnection();

      // Reset connection attempts on successful connection
      this.connectionAttempts = 0;
      this.emit('connected');
    } catch (error) {
      await this.handleInitializationError(error);
    }
  }

  /**
   * Verify the connection to Elasticsearch
   */
  private async verifyConnection(): Promise<void> {
    if (!this.client) {
      throw new ElasticsearchError('Elasticsearch client is not initialized');
    }

    try {
      const health = await this.client.cluster.health();
      logger.info(`Connected to Elasticsearch cluster: ${health.cluster_name}`);
      logger.info(`Cluster health: ${health.status}`);
    } catch (error) {
      throw new ElasticsearchError(
        'Failed to verify Elasticsearch connection',
        error
      );
    }
  }

  /**
   * Handle initialization errors with retry logic
   */
  private async handleInitializationError(error: unknown): Promise<void> {
    this.connectionAttempts++;
    logger.error(
      `Failed to initialize Elasticsearch client (attempt ${this.connectionAttempts}/${this.MAX_CONNECTION_ATTEMPTS}):`,
      error
    );

    if (this.connectionAttempts < this.MAX_CONNECTION_ATTEMPTS) {
      logger.info(`Retrying connection in ${this.RECONNECT_DELAY}ms...`);
      await new Promise((resolve) => setTimeout(resolve, this.RECONNECT_DELAY));
      await this.initialize();
    } else {
      this.emit('initializationFailed', error);
      throw new ElasticsearchError(
        'Failed to initialize Elasticsearch client after multiple attempts',
        error
      );
    }
  }

  /**
   * Get the Elasticsearch client instance
   */
  public getClient(): Client {
    if (!this.client) {
      throw new ElasticsearchError('Elasticsearch client not initialized');
    }
    return this.client;
  }

  /**
   * Gracefully close the client connection
   */
  public async close(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.emit('closed');
      }
    } catch (error) {
      throw new ElasticsearchError(
        'Failed to close Elasticsearch client',
        error
      );
    }
  }
}

// Create and export a singleton instance
const elasticsearchManager = new ElasticsearchClientManager();

export { ElasticsearchError, elasticsearchManager };

// Usage Example:
/*
import { elasticsearchManager, ElasticsearchError } from './elasticsearchClient';

async function initialize() {
  try {
    await elasticsearchManager.initialize();
    const client = elasticsearchManager.getClient();

    // Example search operation
    const result = await client.search({
      index: 'your-index',
      body: {
        query: {
          match_all: {}
        }
      }
    });

    // Handle client events
    elasticsearchManager.on('connected', () => {
      console.info('Elasticsearch client connected');
    });

  } catch (error) {
    if (error instanceof ElasticsearchError) {
      console.error('Elasticsearch error:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

// Clean up on application shutdown
process.on('SIGTERM', async () => {
  await elasticsearchManager.close();
  process.exit(0);
});
*/
