import { readdir } from 'fs/promises';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { logger } from '../utils/logger';
import {
  EnvConfiguration,
  isDevelopmentEnvironment,
  isProductionEnvironment,
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

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: EnvConfiguration.DB_HOST || 'localhost',
  port: Number(EnvConfiguration.DB_PORT) || 5432,
  username: EnvConfiguration.DB_USER || 'testuser',
  password: EnvConfiguration.DB_PASSWORD || 'testpassword',
  database: EnvConfiguration.DB_NAME || 'testdb',
  synchronize: isDevelopmentEnvironment && Boolean(EnvConfiguration.DB_SYNCHRONIZE),
  logging: Boolean(EnvConfiguration.DB_LOGGING),
  entities: [join(__dirname, '../entities/**/*.ts')],
  migrations: [join(__dirname, '../migrations/*.ts')],
  ssl: isProductionEnvironment ? { rejectUnauthorized: false } : undefined,
});

class Database {
  private static instance: Database;
  private dataSource: DataSource | null = null;
  private initializationPromise: Promise<DataSource> | null = null;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private async getFilePaths(directory: string, extension: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const paths = await Promise.all(
      entries.map((entry) => {
        const fullPath = join(directory, entry.name);
        return entry.isDirectory()
          ? this.getFilePaths(fullPath, extension)
          : [fullPath];
      })
    );
    return paths.flat().filter((path) => path.endsWith(extension));
  }

  private getPoolConfig(): CustomDatabaseConfig['poolConfig'] {
    return {
      max: Number(EnvConfiguration.DB_POOL_MAX) || 10,
      min: Number(EnvConfiguration.DB_POOL_MIN) || 1,
      idleTimeoutMillis: Number(EnvConfiguration.DB_POOL_IDLE_TIMEOUT) || 30000,
      acquireTimeoutMillis: Number(EnvConfiguration.DB_POOL_ACQUIRE_TIMEOUT) || 60000,
      reapIntervalMillis: Number(EnvConfiguration.DB_POOL_REAP_INTERVAL) || 1000,
      createTimeoutMillis: Number(EnvConfiguration.DB_POOL_CREATE_TIMEOUT) || 30000,
      createRetryIntervalMillis: Number(EnvConfiguration.DB_POOL_CREATE_RETRY_INTERVAL) || 1000,
    };
  }

  private async getDatabaseConfig(): Promise<DataSourceOptions> {
    const isSandbox = EnvConfiguration.NODE_ENV === 'sandbox';

    return {
      type: 'postgres',
      host: isSandbox
        ? EnvConfiguration.SANDBOX_DB_HOST || 'localhost'
        : EnvConfiguration.DB_HOST || 'localhost',
      port: Number(
        isSandbox
          ? EnvConfiguration.SANDBOX_DB_PORT
          : EnvConfiguration.DB_PORT
      ) || 5432,
      username: isSandbox
        ? EnvConfiguration.SANDBOX_DB_USER || 'sandbox_user'
        : EnvConfiguration.DB_USER || 'testuser',
      password: isSandbox
        ? EnvConfiguration.SANDBOX_DB_PASSWORD || 'sandbox_password'
        : EnvConfiguration.DB_PASSWORD || 'testpassword',
      database: isSandbox
        ? EnvConfiguration.SANDBOX_DB_NAME || 'sandbox_db'
        : EnvConfiguration.DB_NAME || 'testdb',
      synchronize: isDevelopmentEnvironment && Boolean(EnvConfiguration.DB_SYNCHRONIZE),
      logging: Boolean(EnvConfiguration.DB_LOGGING),
      entities: await this.getFilePaths(join(__dirname, '../entities'), '.ts'),
      migrations: await this.getFilePaths(join(__dirname, '../migrations'), '.ts'),
      ssl: isProductionEnvironment ? { rejectUnauthorized: false } : undefined,
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
        logger.error(
          `Error during operation, attempt ${i + 1} of ${attempts}`,
          error
        );
        if (i === attempts - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retry attempts reached');
  }

  public async initialize(): Promise<DataSource> {
    if (this.dataSource && this.dataSource.isInitialized) {
      logger.debug('DataSource is already initialized.');
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
          return this.dataSource;
        },
        Number(EnvConfiguration.DB_RETRY_ATTEMPTS) || 3,
        Number(EnvConfiguration.DB_RETRY_DELAY) || 1000
      );
    }

    return this.initializationPromise;
  }

  public async runMigrations(): Promise<void> {
    if (this.dataSource) {
      const migrationsDir = join(__dirname, '../migrations');
      try {
        await readdir(migrationsDir);
        await this.dataSource.runMigrations();
        logger.info('Migrations have been successfully run.');
      } catch (error: unknown) {
        const err = error as NodeJS.ErrnoException;
        if (err && err.code === 'ENOENT') {
          logger.warn(
            `Migrations directory ${migrationsDir} does not exist. Skipping migrations.`
          );
        } else {
          logger.error('Error running migrations:', err);
          throw err;
        }
      }
    } else {
      logger.error('Cannot run migrations. DataSource is not initialized.');
    }
  }

  public async close(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      try {
        await this.dataSource.destroy();
        logger.info('Data Source has been closed.');
      } catch (err: unknown) {
        logger.error('Error during Data Source closing', err);
        throw err;
      }
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.dataSource || !this.dataSource.isInitialized) {
        throw new Error('DataSource is not initialized');
      }
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
    if (!this.dataSource || !this.dataSource.isInitialized) {
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
    if (this.dataSource && this.dataSource.isInitialized) {
      return this.dataSource;
    }
    return this.initialize();
  }
}

const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Closing database connection...`);
  await Database.getInstance().close();
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

const databaseInstance = Database.getInstance();
export default databaseInstance;
