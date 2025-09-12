import 'reflect-metadata';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { Command } from 'commander';
import database, { AppDataSource } from '../config/database';
import { logger } from '../utils/logger';
import { EnvConfiguration, isProductionEnvironment } from '../config/env';

const program = new Command();

function exitWith(code: number, msg?: string) {
  if (msg) logger.error(msg);
  try { if (AppDataSource.isInitialized) void AppDataSource.destroy(); } catch {}
  process.exit(code);
}

async function waitForDb(retries: number, delayMs: number) {
  for (let i = 1; i <= retries; i++) {
    try {
      await database.initialize();
      await AppDataSource.query('SELECT 1');
      return;
    } catch (err) {
      logger.error(`DB not ready (attempt ${i}/${retries})`, err as Error);
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

function getCliCmdArgs(sub: string, extra: string[] = []) {
  const cliPath = require.resolve('typeorm/cli.js');
  const isTsRuntime = !!process.env.TS_NODE;
  const nodeArgs = isTsRuntime ? ['-r', 'ts-node/register/transpile-only'] : [];
  return { cmd: process.execPath, args: [...nodeArgs, cliPath, sub, ...extra] };
}

function ensureMigrationsDir(tsPath = 'src/migrations', jsPath = 'dist/src/migrations') {
  const target = process.env.TS_NODE ? tsPath : jsPath;
  if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
  return target;
}

async function runMigrations(opts: { retries: number; delay: number }) {
  try {
    await waitForDb(opts.retries, opts.delay);
    const res = await AppDataSource.runMigrations();
    const names = (res || []).map((m: any) => m.name || String(m));
    logger.info(
      names.length ? `Applied migrations: ${names.join(', ')}` : 'No pending migrations.'
    );
  } catch (e) {
    exitWith(1, `Migration run failed: ${(e as Error).message}`);
  } finally {
    try { if (AppDataSource.isInitialized) await AppDataSource.destroy(); } catch {}
  }
}

async function revertMigration(opts: { retries: number; delay: number }) {
  try {
    await waitForDb(opts.retries, opts.delay);
    await AppDataSource.undoLastMigration();
    logger.info('Reverted last migration.');
  } catch (e) {
    exitWith(1, `Migration revert failed: ${(e as Error).message}`);
  } finally {
    try { if (AppDataSource.isInitialized) await AppDataSource.destroy(); } catch {}
  }
}

function assertDevOnly(op: string) {
  if (isProductionEnvironment) {
    exitWith(2, `${op} is blocked in production. Use CI one-off tasks or run locally.`);
  }
}

function dataSourceArgForGenerate() {
  // In dev we point CLI to the TS data-source module
  // Matches your project layout where the DataSource is configured in src/config/database.ts
  return ['-d', path.join(process.cwd(), 'src/config/database.ts')];
}

function spawnCliOrExit(sub: string, extra: string[]) {
  const { cmd, args } = getCliCmdArgs(sub, extra);
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, TS_NODE_TRANSPILE_ONLY: '1' },
  });
  if (result.status !== 0) exitWith(result.status ?? 1, `typeorm ${sub} failed`);
}

function timestamped(name: string) {
  const ts = new Date().toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14);
  return `${ts}-${name}`;
}

async function createMigration(name: string) {
  assertDevOnly('migration:create');
  const dir = ensureMigrationsDir('src/migrations');
  const file = path.join(dir, timestamped(name));
  logger.info(`Creating migration ${file}`);
  spawnCliOrExit('migration:create', [file]);
  logger.info('Migration created.');
}

async function generateMigration(name: string) {
  assertDevOnly('migration:generate');
  const dir = ensureMigrationsDir('src/migrations');
  const file = path.join(dir, timestamped(name));
  logger.info(`Generating migration ${file}`);
  const args = ['migration:generate', ...dataSourceArgForGenerate(), file];
  // Use pretty SQL and safe defaults
  spawnCliOrExit(args[0], args.slice(1));
  logger.info('Migration generated.');
}

program
  .name('migration-runner')
  .description('TypeORM migration helper')
  .version('1.0.0');

program
  .command('run')
  .option('--retries <n>', 'retry attempts for DB connect', String(EnvConfiguration.DB_RETRY_ATTEMPTS || 5))
  .option('--delay <ms>', 'delay between retries (ms)', String(EnvConfiguration.DB_RETRY_DELAY || 1000))
  .action(async (opts: { retries: string; delay: string }) => {
    const retries = parseInt(opts.retries, 10) || 5;
    const delay = parseInt(opts.delay, 10) || 1000;
    await runMigrations({ retries, delay });
  });

program
  .command('revert')
  .option('--retries <n>', 'retry attempts for DB connect', String(EnvConfiguration.DB_RETRY_ATTEMPTS || 3))
  .option('--delay <ms>', 'delay between retries (ms)', String(EnvConfiguration.DB_RETRY_DELAY || 1000))
  .action(async (opts: { retries: string; delay: string }) => {
    const retries = parseInt(opts.retries, 10) || 3;
    const delay = parseInt(opts.delay, 10) || 1000;
    await revertMigration({ retries, delay });
  });

program
  .command('create')
  .argument('<name>', 'migration name')
  .action(async (name: string) => { await createMigration(name); });

program
  .command('generate')
  .argument('<name>', 'migration name')
  .action(async (name: string) => { await generateMigration(name); });

process.on('SIGINT', () => exitWith(130, 'SIGINT'));
process.on('SIGTERM', () => exitWith(143, 'SIGTERM'));

program.parse(process.argv);
