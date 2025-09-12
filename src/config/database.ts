import { readdir } from 'fs/promises';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { logger } from '../utils/logger';
import {
  EnvConfiguration,
  isDevelopmentEnvironment,
} from './env';

type CustomDatabaseConfig = {
  retryAttempts: number;
  retryDelay: number;
  poolConfig: {
    max: number;
    min: number;
    idleTimeoutMillis: number;
    acquireTimeoutMillis: number;
    reapIntervalMillis: number;
    createTimeoutMillis: number;
    createRetryIntervalMillis: number;
  };
};

const isLocalHost = (h?: string) =>
  !h || h === 'localhost' || h === '127.0.0.1';

const looksLikeRds = (h?: string) =>
  !!h && /\.rds\.amazonaws\.com(\.cn)?$/.test(h);

// ts in dev, js in prod
const FILE_EXT = __filename.endsWith('.ts') ? 'ts' : 'js';
const ENTITIES_GLOB = join(__dirname, `../entities/**/*.${FILE_EXT}`);
const MIGRATIONS_GLOB = join(__dirname, `../migrations/*.${FILE_EXT}`);

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: EnvConfiguration.DB_HOST || 'localhost',
  port: Number(EnvConfiguration.DB_PORT) || 5432,
  username: EnvConfiguration.DB_USER || 'testuser',
  password: EnvConfiguration.DB_PASSWORD || 'testpassword',
  database: EnvConfiguration.DB_NAME || 'testdb',
  synchronize: isDevelopmentEnvironment && Boolean(EnvConfiguration.DB_SYNCHRONIZE),
  logging: Boolean(EnvConfiguration.DB_LOGGING),
  entities: [ENTITIES_GLOB],
  migrations: [MIGRATIONS_GLOB],
  ssl: (() => {
    const dbSslEnv = String(EnvConfiguration.DB_SSL || '').toLowerCase();
    const host = EnvConfiguration.DB_HOST || 'localhost';
    const requireSsl =
      dbSslEnv === 'true' || !isLocalHost(host) || looksLikeRds(host);
    return requireSsl ? { rejectUnauthorized: false } : undefined;
  })(),
});

class Database {
  private static instance: Database;
  private dataSource: DataSource | null = null;
  private initializationPromise: Promise<DataSource> | null = null;
  private closingPromise: Promise<void> | null = null;
  private closed = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private async getFilePaths(directory: string, extension: string): Promise<string[]> {
    try {
      const entries = await readdir(directory, { withFileTypes: true });
      const paths = await Promise.all(
        entries.map((entry) => {
          const fullPath = join(directory, entry.name);
          return entry.isDirectory()
            ? this.getFilePaths(fullPath, extension)
            : [fullPath];
        })
      );
      return paths.flat().filter((p) => p.endsWith(extension));
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException;
      if (e?.code === 'ENOENT') {
        logger.warn(`Directory ${directory} not found. Returning empty list.`);
        return [];
      }
      throw err;
    }
  }

  private getPoolConfig(): CustomDatabaseConfig['poolConfig'] {
    return {
      max: Number(EnvConfiguration.DB_POOL_MAX) || 10,
      min: Number(EnvConfiguration.DB_POOL_MIN) || 1,
      idleTimeoutMillis: Number(EnvConfiguration.DB_POOL_IDLE_TIMEOUT) || 30000,
      acquireTimeoutMillis: Number(EnvConfiguration.DB_POOL_ACQUIRE_TIMEOUT) || 60000,
      reapIntervalMillis: Number(EnvConfiguration.DB_POOL_REAP_INTERVAL) || 1000,
      createTimeoutMillis: Number(EnvConfiguration.DB_POOL_CREATE_TIMEOUT) || 30000,
      createRetryIntervalMillis:
        Number(EnvConfiguration.DB_POOL_CREATE_RETRY_INTERVAL) || 1000,
    };
  }

  private async getDatabaseConfig(): Promise<DataSourceOptions> {
    const isSandbox = EnvConfiguration.NODE_ENV === 'sandbox';

    const host = isSandbox
      ? (EnvConfiguration.SANDBOX_DB_HOST || 'localhost')
      : (EnvConfiguration.DB_HOST || 'localhost');

    const dbSslEnv = String(EnvConfiguration.DB_SSL || '').toLowerCase();
    const requireSsl =
      dbSslEnv === 'true' || !isLocalHost(host) || looksLikeRds(host);
    const sslOption = requireSsl ? { rejectUnauthorized: false } : undefined;

    return {
      type: 'postgres',
      host,
      port:
        Number(isSandbox ? EnvConfiguration.SANDBOX_DB_PORT : EnvConfiguration.DB_PORT) ||
        5432,
      username: isSandbox
        ? (EnvConfiguration.SANDBOX_DB_USER || 'sandbox_user')
        : (EnvConfiguration.DB_USER || 'testuser'),
      password: isSandbox
        ? (EnvConfiguration.SANDBOX_DB_PASSWORD || 'sandbox_password')
        : (EnvConfiguration.DB_PASSWORD || 'testpassword'),
      database: isSandbox
        ? (EnvConfiguration.SANDBOX_DB_NAME || 'sandbox_db')
        : (EnvConfiguration.DB_NAME || 'testdb'),
      synchronize: isDevelopmentEnvironment && Boolean(EnvConfiguration.DB_SYNCHRONIZE),
      logging: Boolean(EnvConfiguration.DB_LOGGING),
      entities: await this.getFilePaths(join(__dirname, '../entities'), `.${FILE_EXT}`),
      migrations: await this.getFilePaths(join(__dirname, '../migrations'), `.${FILE_EXT}`),
      ssl: sslOption,
    };
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    attempts: number,
    delay: number
  ): Promise<T> {
    for (let i = 0; i < attempts; i++) {
      try {
        return await operation();
      } catch (error: unknown) {
        logger.error(`Error during operation, attempt ${i + 1} of ${attempts}`, error);
        if (i === attempts - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retry attempts reached');
  }

  public async initialize(): Promise<DataSource> {
    if (this.dataSource?.isInitialized) {
      logger.debug('DataSource is already initialized.');
      this.closed = false;
      return this.dataSource;
    }

    if (!this.initializationPromise) {
      logger.debug('Initializing new DataSource...');
      this.initializationPromise = this.retryOperation(
        async () => {
          const databaseConfig = await this.getDatabaseConfig();
          this.dataSource = new DataSource(databaseConfig);
          await this.dataSource.initialize();
          logger.info('Data Source has been initialized!');
          await this.runMigrations();
          this.closed = false;
          return this.dataSource;
        },
        Number(EnvConfiguration.DB_RETRY_ATTEMPTS) || 3,
        Number(EnvConfiguration.DB_RETRY_DELAY) || 1000
      );
    }

    return this.initializationPromise;
  }

  public async runMigrations(): Promise<void> {
    if (!this.dataSource) {
      logger.error('Cannot run migrations. DataSource is not initialized.');
      return;
    }

    const migrationsDir = join(__dirname, '../migrations');
    try {
      await readdir(migrationsDir);
      await this.dataSource.runMigrations();
      logger.info('Migrations have been successfully run.');
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err?.code === 'ENOENT') {
        logger.warn(`Migrations directory ${migrationsDir} does not exist. Skipping migrations.`);
      } else {
        logger.error('Error running migrations:', err);
        throw err;
      }
    }
  }

  public async close(): Promise<void> {
    if (this.closed) {
      logger.debug('Data Source already closed.');
      return;
    }
    if (this.closingPromise) {
      await this.closingPromise;
      return;
    }
    if (!this.dataSource || !this.dataSource.isInitialized) {
      this.closed = true;
      return;
    }

    this.closingPromise = this.dataSource
      .destroy()
      .then(() => {
        logger.info('Data Source has been closed.');
      })
      .catch((err: unknown) => {
        const msg = (err as Error)?.message || '';
        if (msg.includes('Called end on pool more than once')) {
          logger.warn('Pool already ended; ignoring duplicate close.');
          return;
        }
        logger.error('Error during Data Source closing', err);
        throw err;
      })
      .finally(() => {
        this.dataSource = null;
        this.initializationPromise = null;
        this.closingPromise = null;
        this.closed = true;
      });

    await this.closingPromise;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.dataSource?.isInitialized) throw new Error('DataSource is not initialized');
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (err: unknown) {
      logger.error('Database health check failed', err);
      return false;
    }
  }

  public async getPoolStatus(): Promise<{
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  }> {
    if (!this.dataSource?.isInitialized) {
      throw new Error('DataSource is not initialized');
    }
    const pool = (this.dataSource.driver as any).master;
    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  }

  public async getDataSource(): Promise<DataSource> {
    if (this.dataSource?.isInitialized) return this.dataSource;
    return this.initialize();
  }
}

const databaseInstance = Database.getInstance();
export default databaseInstance;
