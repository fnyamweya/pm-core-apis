import { execSync } from 'child_process';
import { Command } from 'commander';
import { AppDataSource } from '../config/database';
import { logger } from '../utils/logger';

const program = new Command();

async function runMigrations(): Promise<void> {
  try {
    await AppDataSource.initialize();
    logger.info('Data Source has been initialized.');
    await AppDataSource.runMigrations();
    logger.info('Migrations have been successfully run.');
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('Error during running migrations:', error.message);
    } else {
      logger.error('An unknown error occurred during running migrations.');
    }
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

async function revertMigrations(): Promise<void> {
  try {
    await AppDataSource.initialize();
    logger.info('Data Source has been initialized.');
    await AppDataSource.undoLastMigration();
    logger.info('Last migration has been successfully reverted.');
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('Error during reverting migration:', error.message);
    } else {
      logger.error('An unknown error occurred during reverting migration.');
    }
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

async function createMigration(name: string): Promise<void> {
  try {
    logger.info(`Creating migration: ${name}`);
    execSync(
      `ts-node ./node_modules/typeorm/cli.js migration:create src/migrations/${name}`,
      { stdio: 'inherit' }
    );
    logger.info(`Migration ${name} created successfully.`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(`Error creating migration ${name}:`, error.message);
    } else {
      logger.error('An unknown error occurred during creating migration.');
    }
    process.exit(1);
  }
}

async function generateMigration(name: string): Promise<void> {
  try {
    logger.info(`Generating migration: ${name}`);
    execSync(
      `ts-node ./node_modules/typeorm/cli.js migration:generate -d ./src/config/database.ts src/migrations/${name}`,
      { stdio: 'inherit' }
    );
    logger.info(`Migration ${name} generated successfully.`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(`Error generating migration ${name}:`, error.message);
    } else {
      logger.error('An unknown error occurred during generating migration.');
    }
    process.exit(1);
  }
}

// Setup commander commands
program
  .command('run')
  .description('Run pending migrations')
  .action(runMigrations);

program
  .command('revert')
  .description('Revert the last applied migration')
  .action(revertMigrations);

program
  .command('create <name>')
  .description('Create a new blank migration with the given name')
  .action(createMigration);

program
  .command('generate <name>')
  .description('Generate a migration based on schema changes')
  .action(generateMigration);

// Parse command line arguments
program.parse(process.argv);
