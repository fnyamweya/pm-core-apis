#!/usr/bin/env node
import 'source-map-support/register';
import { App, Environment } from 'aws-cdk-lib';
import { config as loadEnv } from 'dotenv';
import { CoreStack } from '../lib/core-stack';

loadEnv({ path: process.env.ENV_FILE ?? 'infra/.env.deploy' });

const resolveEnv = (): Environment => ({
  account:
    process.env.CDK_DEFAULT_ACCOUNT ??
    process.env.AWS_ACCOUNT ??
    process.env.AWS_ACCOUNT_ID ??
    undefined,
  region:
    process.env.CDK_DEFAULT_REGION ??
    process.env.AWS_REGION ??
    process.env.AWS_DEFAULT_REGION ??
    undefined,
});

const toBool = (v: unknown, def = false) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
  }
  return def;
};

const app = new App();
const env = resolveEnv();

const appName = app.node.tryGetContext('appName') ?? 'core-apis';
const containerPort = Number(app.node.tryGetContext('containerPort') ?? 3000);
const cpu = Number(app.node.tryGetContext('cpu') ?? 512);
const memoryMiB = Number(app.node.tryGetContext('memoryMiB') ?? 1024);
const buildFromPath = (app.node.tryGetContext('buildFromPath') as string | undefined) ?? '../';
const imageTag = app.node.tryGetContext('imageTag') ?? 'latest';
const migrateOnDeployCtx = app.node.tryGetContext('migrateOnDeploy');
const migrateOnDeployEnv = process.env.RUN_MIGRATIONS_ON_DEPLOY ?? process.env.MIGRATE_ON_DEPLOY;
const runMigrationsOnDeploy = toBool(migrateOnDeployCtx ?? migrateOnDeployEnv, true);

const secretKeys = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'AT_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'REDIS_PASSWORD',
  'CERBOS_ADMIN_PASSWORD',
] as const;

const configKeys = [
  'PORT',
  'NODE_ENV',
  'LOG_LEVEL',
  'URL',
  'ARGON2_MEMORY_COST',
  'ARGON2_TIME_COST',
  'ARGON2_PARALLELISM',
  'CERBOS_HOST',
  'CERBOS_PORT',
  'CERBOS_TLS',
  'CERBOS_PLAYGROUND_INSTANCE',
  'CERBOS_ADMIN_USERNAME',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_NAME',
  'DB_SYNCHRONIZE',
  'DB_LOGGING',
  'DB_TYPE',
  'DB_POOL_MAX',
  'DB_POOL_MIN',
  'DB_POOL_IDLE_TIMEOUT',
  'DB_POOL_ACQUIRE_TIMEOUT',
  'DB_POOL_REAP_INTERVAL',
  'DB_POOL_CREATE_TIMEOUT',
  'DB_POOL_CREATE_RETRY_INTERVAL',
  'DB_RETRY_ATTEMPTS',
  'DB_RETRY_DELAY',
  'DB_SSL',
  'AWS_REGION',
  'REDIS_HOST',
  'REDIS_PORT',
] as const;

const secretMap: Record<string, string> = {};
for (const k of secretKeys) if (process.env[k]) secretMap[k] = process.env[k] as string;

const configMap: Record<string, string> = {};
for (const k of configKeys) if (process.env[k]) configMap[k] = process.env[k] as string;

new CoreStack(app, `${appName}-dev`, {
  env,
  appName,
  envName: 'dev',
  containerPort,
  cpu,
  memoryMiB,
  desiredCount: 1,
  minCapacity: 0,
  maxCapacity: 3,
  enableFargateSpot: true,
  buildFromPath,
  appSecrets: secretMap,
  appConfig: configMap,
  runMigrationsOnDeploy,
});

new CoreStack(app, `${appName}-prod`, {
  env,
  appName,
  envName: 'prod',
  containerPort,
  cpu: Math.max(cpu, 512),
  memoryMiB: Math.max(memoryMiB, 1024),
  desiredCount: 2,
  minCapacity: 2,
  maxCapacity: 10,
  enableFargateSpot: false,
  ecrRepositoryName: `${appName}-prod`,
  imageTag,
  appSecrets: secretMap,
  appConfig: configMap,
  runMigrationsOnDeploy,
});
