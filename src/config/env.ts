import dotenv from 'dotenv';
import path from 'path';
import { getSecrets } from '../utils/secrets';

const ENV = process.env.NODE_ENV || 'development';
const envFile = `.env.${ENV}`;

// For local development/test environments, load from .env file
if (ENV === 'development' || ENV === 'test') {
  dotenv.config({ path: path.resolve(process.cwd(), envFile) });
}

const isEnv = (environmentName: string) => process.env.NODE_ENV === environmentName;

const isProductionEnvironment = isEnv('production');
const isStagingEnvironment = isEnv('staging');
const isDevelopmentEnvironment = isEnv('development');
const isTestEnvironment = isEnv('test');

const currentEnvironment = process.env.NODE_ENV || 'development';

/**
 * Initialize secrets from AWS Secrets Manager if needed.
 */
async function initializeSecrets(): Promise<void> {
  if (isProductionEnvironment || isStagingEnvironment) {
    console.log('Fetching secrets from AWS Secrets Manager...');
    try {
      const secrets = await getSecrets('prod/Tunda/Apis'); // Replace with your secret name
      Object.entries(secrets).forEach(([key, value]) => {
        process.env[key] = value;
      });
      console.log('Secrets loaded successfully:', Object.keys(secrets));
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Failed to load AWS Secrets:', error.message);
        console.error('Full Error Details:', error);
      } else {
        console.error('An unknown error occurred while loading AWS Secrets:', error);
      }
      process.exit(1);
    }
  } else {
    console.log('Using local .env file for configuration.');
  }
}

/**
 * After secrets are initialized, we can safely construct the EnvConfiguration object.
 */
type EnvironmentConfigurationType = {
  currentEnvironment: string;
  NODE_ENV: string;
  JWT_SECRET?: string;
  JWT_EXPIRATION?: string;
  JWT_REFRESH_SECRET?: string;
  JWT_REFRESH_EXPIRATION?: string;
  ARGON2_MEMORY_COST?: string;
  ARGON2_TIME_COST?: string;
  ARGON2_PARALLELISM?: string;
  CERBOS_HOST?: string;
  CERBOS_PORT?: string;
  CERBOS_TLS?: string;
  CERBOS_PLAYGROUND_INSTANCE?: string;
  CERBOS_ADMIN_USERNAME?: string;
  CERBOS_ADMIN_PASSWORD?: string;
  CERBOS_MAX_RETRIES?: string;
  CERBOS_RETRY_DELAY_MS?: string;
  HASH_RATE_LIMIT_POINTS?: string;
  HASH_RATE_LIMIT_DURATION?: string;
  HASH_RATE_LIMIT_BLOCK_DURATION?: string;
  VERIFY_RATE_LIMIT_POINTS?: string;
  VERIFY_RATE_LIMIT_DURATION?: string;
  VERIFY_RATE_LIMIT_BLOCK_DURATION?: string;
  DB_HOST?: string;
  DB_PORT?: string;
  DB_USER?: string;
  DB_PASSWORD?: string;
  DB_NAME?: string;
  SANDBOX_DB_HOST?: string;
  SANDBOX_DB_PORT?: string;
  SANDBOX_DB_USER?: string;
  SANDBOX_DB_PASSWORD?: string;
  SANDBOX_DB_NAME?: string;
  DB_POOL_MAX?: string;
  DB_POOL_MIN?: string;
  DB_POOL_IDLE_TIMEOUT?: string;
  DB_POOL_ACQUIRE_TIMEOUT?: string;
  DB_POOL_REAP_INTERVAL?: string;
  DB_POOL_CREATE_TIMEOUT?: string;
  DB_POOL_CREATE_RETRY_INTERVAL?: string;
  DB_RETRY_ATTEMPTS?: string;
  DB_RETRY_DELAY?: string;
  DB_LOGGING?: string;
  DB_SYNCHRONIZE?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  REDIS_PASSWORD?: string;
  REDIS_DEFAULT_TTL?: string;
  AT_API_KEY?: string;
  AT_USERNAME?: string;
  AWS_REGION?: string;
  AWS_GLACIER_VAULT_NAME?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_ACCOUNT_ID?: string;
  AWS_S3_BUCKET_NAME?: string;
  [key: string]: string | undefined;
};

function createEnvConfiguration(): EnvironmentConfigurationType {
  return {
    currentEnvironment,
    NODE_ENV: process.env.NODE_ENV || 'development',
    JWT_SECRET: process.env.JWT_SECRET || 'jwt_secret',
    JWT_EXPIRATION: process.env.JWT_EXPIRATION || '1d',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'jwt_refresh_secret',
    JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION || '7d',
    ARGON2_MEMORY_COST: process.env.ARGON2_MEMORY_COST || '65536',
    ARGON2_TIME_COST: process.env.ARGON2_TIME_COST || '3',
    ARGON2_PARALLELISM: process.env.ARGON2_PARALLELISM || '4',
    CERBOS_HOST: process.env.CERBOS_HOST || 'localhost',
    CERBOS_PORT: process.env.CERBOS_PORT || '3592',
    CERBOS_TLS: process.env.CERBOS_TLS || 'false',
    CERBOS_PLAYGROUND_INSTANCE: process.env.CERBOS_PLAYGROUND_INSTANCE || 'false',
    CERBOS_ADMIN_USERNAME: process.env.CERBOS_ADMIN_USERNAME || 'cerbos',
    CERBOS_ADMIN_PASSWORD: process.env.CERBOS_ADMIN_PASSWORD || 'JDJ5JDEwJE5HYnk4cTY3VTE1bFV1NlR2bmp3ME9QOXdXQXFROGtBb2lWREdEY2xXbzR6WnoxYWtSNWNDCgo',
    CERBOS_MAX_RETRIES: process.env.CERBOS_MAX_RETRIES || '3',
    CERBOS_RETRY_DELAY_MS: process.env.CERBOS_RETRY_DELAY_MS || '1000',
    HASH_RATE_LIMIT_POINTS: process.env.HASH_RATE_LIMIT_POINTS || '10',
    HASH_RATE_LIMIT_DURATION: process.env.HASH_RATE_LIMIT_DURATION || '60',
    HASH_RATE_LIMIT_BLOCK_DURATION: process.env.HASH_RATE_LIMIT_BLOCK_DURATION || '300',
    VERIFY_RATE_LIMIT_POINTS: process.env.VERIFY_RATE_LIMIT_POINTS || '20',
    VERIFY_RATE_LIMIT_DURATION: process.env.VERIFY_RATE_LIMIT_DURATION || '60',
    VERIFY_RATE_LIMIT_BLOCK_DURATION: process.env.VERIFY_RATE_LIMIT_BLOCK_DURATION || '300',
    DB_HOST: process.env.DB_HOST || 'postgres',
    DB_PORT: process.env.DB_PORT || '5432',
    DB_USER: process.env.DB_USER || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
    DB_NAME: process.env.DB_NAME || 'postgres',
    SANDBOX_DB_HOST: process.env.SANDBOX_DB_HOST,
    SANDBOX_DB_PORT: process.env.SANDBOX_DB_PORT,
    SANDBOX_DB_USER: process.env.SANDBOX_DB_USER,
    SANDBOX_DB_PASSWORD: process.env.SANDBOX_DB_PASSWORD,
    SANDBOX_DB_NAME: process.env.SANDBOX_DB_NAME,
    DB_POOL_MAX: process.env.DB_POOL_MAX,
    DB_POOL_MIN: process.env.DB_POOL_MIN,
    DB_POOL_IDLE_TIMEOUT: process.env.DB_POOL_IDLE_TIMEOUT,
    DB_POOL_ACQUIRE_TIMEOUT: process.env.DB_POOL_ACQUIRE_TIMEOUT,
    DB_POOL_REAP_INTERVAL: process.env.DB_POOL_REAP_INTERVAL,
    DB_POOL_CREATE_TIMEOUT: process.env.DB_POOL_CREATE_TIMEOUT,
    DB_POOL_CREATE_RETRY_INTERVAL: process.env.DB_POOL_CREATE_RETRY_INTERVAL,
    DB_RETRY_ATTEMPTS: process.env.DB_RETRY_ATTEMPTS,
    DB_RETRY_DELAY: process.env.DB_RETRY_DELAY,
    DB_LOGGING: process.env.DB_LOGGING,
    DB_SYNCHRONIZE: process.env.DB_SYNCHRONIZE,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_DEFAULT_TTL: process.env.REDIS_DEFAULT_TTL,
    AT_API_KEY: process.env.AT_API_KEY,
    AT_USERNAME: process.env.AT_USERNAME,
    AWS_REGION: process.env.AWS_REGION,
    AWS_GLACIER_VAULT_NAME: process.env.AWS_GLACIER_VAULT_NAME,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_ACCOUNT_ID: process.env.AWS_ACCOUNT_ID,
    AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || 'tunda-apis',
  };
}

// Create and export EnvConfiguration immediately
const EnvConfiguration = createEnvConfiguration();

export {
  EnvConfiguration,
  initializeSecrets,
  createEnvConfiguration,
  currentEnvironment,
  isDevelopmentEnvironment,
  isProductionEnvironment,
  isStagingEnvironment,
  isTestEnvironment,
};
