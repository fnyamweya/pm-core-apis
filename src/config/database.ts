import { readdir } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { logger } from '../utils/logger';
import {
  EnvConfiguration,
  isDevelopmentEnvironment,
  isProductionEnvironment
} from './env';

type CustomDatabaseConfig = {
  retryAttempts: number;
  retryDelay: number;
  poolConfig: {
    max: number;
    min: number; // pg ignores this; kept for compatibility
    idleTimeoutMillis: number;
    acquireTimeoutMillis: number; // maps to pg: connectionTimeoutMillis
    reapIntervalMillis: number;   // not used by pg
    createTimeoutMillis: number;  // not used by pg
    createRetryIntervalMillis: number; // not used by pg
  };
};

function detectRuntimeExt() {
  // When compiled, this file ends with .js; in dev (ts-node) it ends with .ts
  const isJs = __filename.endsWith('.js');
  return { ext: isJs ? 'js' : 'ts' };
}

function buildSslOption(): boolean | Record<string, any> | undefined {
  const useSsl = String(EnvConfiguration.DB_SSL ?? (isProductionEnvironment ? 'true' : 'false')) === 'true';
  if (!useSsl) return undefined;

  const rejectUnauthorized =
    String(EnvConfiguration.DB_SSL_REJECT_UNAUTHORIZED ?? (isProductionEnvironment ? 'true' : 'false')) === 'true';

  const caPath = EnvConfiguration.DB_SSL_CA;
  if (caPath && existsSync(caPath)) {
    try {
      const ca = readFileSync(caPath, 'utf8');
      return { ca, rejectUnauthorized };
    } catch (err) {
      logger.warn(`Failed to read DB_SSL_CA at ${caPath}; falling back to rejectUnauthorized=${rejectUnauthorized}`, err);
      return { rejectUnauthorized };
    }
  }
  return { rejectUnauthorized };
}

function getPgPoolExtra(cfg: CustomDatabaseConfig['poolConfig']) {
  // TypeORM -> pg Pool options
  return {
    max: cfg.max,
    idleTimeoutMillis: cfg.idleTimeoutMillis,
    connectionTimeoutMillis: cfg.acquireTimeoutMillis,
    application_name: EnvConfiguration.APP_NAME ?? 'tunda-apis'
  };
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: EnvConfiguration.DB_HOST || 'localhost',
  port: Number(EnvConfiguration.DB_PORT) || 5432,
  username: EnvConfiguration.DB_USER || 'testuser',
  password: EnvConfiguration.DB_PASSWORD || 'testpassword',
  database: EnvConfiguration.DB_NAME || 'testdb',
  synchronize: isDevelopmentEnvironment && Boolean(EnvConfiguration.DB_SYNCHRONIZE),
  logging: Boolean(EnvConfiguration.DB_LOGGING),
  entities: [join(__dirname, `../entities/**/*.${detectRuntimeExt().ext}`)],
  migrations: [join(__dirname, `../migrations/*.${detectRuntimeExt().ext}`)],
  ssl: buildSslOption() as any
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
    const nested = await Promise.all(
      entries.map((entry) => {
        const fullPath = join(directory, entry.name);
        return entry.isDirectory() ? this.getFilePaths(fullPath, extension) : [fullPath];
      })
    );
    return nested.flat().filter((p) => p.endsWith(extension));
  }

  private getPoolConfig(): CustomDatabaseConfig['poolConfig'] {
    return {
      max: Number(EnvConfiguration.DB_POOL_MAX) || 10,
      min: Number(EnvConfiguration.DB_POOL_MIN) || 1, // pg ignores
      idleTimeoutMillis: Number(EnvConfiguration.DB_POOL_IDLE_TIMEOUT) || 30_000,
      acquireTimeoutMillis: Number(EnvConfiguration.DB_POOL_ACQUIRE_TIMEOUT) || 60_000,
      reapIntervalMillis: Number(EnvConfiguration.DB_POOL_REAP_INTERVAL) || 1_000, // ignored
      createTimeoutMillis: Number(EnvConfiguration.DB_POOL_CREATE_TIMEOUT) || 30_000, // ignored
      createRetryIntervalMillis: Number(EnvConfiguration.DB_POOL_CREATE_RETRY_INTERVAL) || 1_000 // ignored
    };
  }

  private async getDatabaseConfig(): Promise<DataSourceOptions> {
    const isSandbox = EnvConfiguration.NODE_ENV === 'sandbox';
    const { ext } = detectRuntimeExt();

    const poolCfg = this.getPoolConfig();

    const host = isSandbox ? (EnvConfiguration.SANDBOX_DB_HOST || 'localhost') : (EnvConfiguration.DB_HOST || 'localhost');
    const port = Number(isSandbox ? EnvConfiguration.SANDBOX_DB_PORT : EnvConfiguration.DB_PORT) || 5432;
    const username = isSandbox ? (EnvConfiguration.SANDBOX_DB_USER || 'sandbox_user') : (EnvConfiguration.DB_USER || 'testuser');
    const password = isSandbox ? (EnvConfiguration.SANDBOX_DB_PASSWORD || 'sandbox_password') : (EnvConfiguration.DB_PASSWORD || 'testpassword');
    const database = isSandbox ? (EnvConfiguration.SANDBOX_DB_NAME || 'sandbox_db') : (EnvConfiguration.DB_NAME || 'testdb');

    const ssl = buildSslOption();

    const options: DataSourceOptions = {
      type: 'postgres',
      host,
      port,
      username,
      password,
      database,
      synchronize: isDevelopmentEnvironment && Boolean(EnvConfiguration.DB_SYNCHRONIZE),
      logging: Boolean(EnvConfiguration.DB_LOGGING),
      entities: [join(__dirname, `../entities/**/*.${ext}`)],
      migrations: [join(__dirname, `../migrations/*.${ext}`)],
      ssl: ssl as any,
      extra: getPgPoolExtra(poolCfg)
    };

    // Helpful log to confirm TLS behavior at runtime
    logger.info(
      `DB config → host=${host} port=${port} db=${database} user=${username} ssl=${!!ssl} rejectUnauthorized=${
        (ssl && typeof ssl === 'object' ? (ssl as any).rejectUnauthorized : false)
      }`
    );

    return options;
  }

  private async retryOperation<T>(operation: () => Promise<T>, attempts: number, delay: number): Promise<T> {
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
    if (!this.dataSource) {
      logger.error('Cannot run migrations. DataSource is not initialized.');
      return;
    }
    const migrationsDir = join(__dirname, '../migrations');
    try {
      // If dir missing, skip gracefully
      if (!existsSync(migrationsDir)) {
        logger.warn(`Migrations directory ${migrationsDir} does not exist. Skipping migrations.`);
        return;
      }
      await readdir(migrationsDir);
      await this.dataSource.runMigrations();
      logger.info('Migrations have been successfully run.');
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err && err.code === 'ENOENT') {
        logger.warn(`Migrations directory ${migrationsDir} does not exist. Skipping migrations.`);
      } else {
        logger.error('Error running migrations:', err);
        throw err;
      }
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
    const driver: any = this.dataSource.driver as any;
    const pool = driver?.master?.pool ?? driver?.pool; // try both, internal API
    return {
      totalCount: pool?.totalCount ?? 0,
      idleCount: pool?.idleCount ?? 0,
      waitingCount: pool?.waitingCount ?? 0
    };
    // Note: TypeORM doesn't expose pool officially; this is best-effort.
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
