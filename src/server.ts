import { Server } from 'http';
import 'reflect-metadata';
import app from './app';
import databaseInstance from './config/database';
import { redisManager } from './config/redis';
import { currentEnvironment } from './config/env';
import { logger } from './utils/logger';
import { initializeSecrets, createEnvConfiguration } from './config/env';

const port = Number(process.env.PORT || 5000);

let server: Server | null = null;
let shuttingDown = false;
let shutdownPromise: Promise<void> | null = null;

const gracefulShutdown = (reason: string, exitCode = 0) => {
  if (shuttingDown) return shutdownPromise ?? Promise.resolve();
  shuttingDown = true;

  logger.info(`${reason} received`);

  shutdownPromise = new Promise<void>((resolve) => {
    const forceTimeout = setTimeout(async () => {
      logger.warn('Forcing shutdown due to timeout');
      try { await databaseInstance.close(); } catch {}
      try { await redisManager.close(); } catch {}
      process.exit(1);
    }, 10_000);

    const closeServer = async () => {
      if (!server) return;
      await new Promise<void>((res) => server!.close(() => res()));
      logger.info('Server closed');
    };

    (async () => {
      try {
        await closeServer();
      } catch (e) {
        logger.error('Error closing HTTP server:', e);
      }

      try {
        await databaseInstance.close();
        logger.info('Database connection closed');
      } catch (dbError) {
        logger.error('Error closing database connection:', dbError);
      }

      try {
        await redisManager.close();
        logger.info('Redis connections closed');
      } catch (rError) {
        logger.error('Error closing Redis connections:', rError);
      }

      clearTimeout(forceTimeout);
      resolve();
      process.exit(exitCode);
    })().catch((e) => {
      logger.error('Unexpected error during shutdown:', e);
      clearTimeout(forceTimeout);
      process.exit(1);
    });
  });

  return shutdownPromise;
};

const startServer = async () => {
  try {
    await initializeSecrets();
    const envConfiguration = createEnvConfiguration();
    logger.info('Environment configuration:', envConfiguration);

    await databaseInstance.initialize();
    logger.info('Database has been initialized!');

    server = app.listen(port, () => {
      logger.info(`Server started on port ${port} in ${currentEnvironment} mode.`);
    });

    (server as any).timeout = 10_000;
  } catch (error) {
    logger.error('Failed to start the server:', error);
    process.exit(1);
  }
};

process.once('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, error);
  void gracefulShutdown('uncaughtException', 1);
});

process.once('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  void gracefulShutdown('unhandledRejection', 1);
});

process.once('SIGTERM', () => {
  void gracefulShutdown('SIGTERM', 0);
});

process.once('SIGINT', () => {
  void gracefulShutdown('SIGINT', 0);
});

void startServer();
