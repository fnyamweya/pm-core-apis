import { Server } from 'http';
import 'reflect-metadata';
import app from './app';
import databaseInstance from './config/database';
import { currentEnvironment, initializeSecrets, createEnvConfiguration } from './config/env';
import { logger } from './utils/logger';

const port = Number(process.env.PORT || 5000);
let server: Server | null = null;
let shuttingDown = false;
let shutdownPromise: Promise<void> | null = null;

async function start() {
  try {
    await initializeSecrets();
    const envConfiguration = createEnvConfiguration();
    logger.info('Environment configuration:', envConfiguration);

    await databaseInstance.initialize();
    logger.info('Database has been initialized!');

    server = app.listen(port, () => {
      logger.info(`Server started on port ${port} in ${currentEnvironment} mode.`);
    });
    server.timeout = 10_000;
  } catch (error) {
    logger.error('Failed to start the server:', error);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  if (shuttingDown) return shutdownPromise ?? Promise.resolve();
  shuttingDown = true;
  logger.info(`${signal} received`);

  shutdownPromise = (async () => {
    const s = server;
    server = null;

    if (s) {
      await Promise.race([
        new Promise<void>((resolve) => s.close(() => {
          logger.info('Server closed');
          resolve();
        })),
        new Promise<void>((resolve) =>
          setTimeout(() => {
            logger.warn('Forcing server close after 10s timeout');
            resolve();
          }, 10_000)
        ),
      ]);
    }

    try {
      await databaseInstance.close();
      logger.info('Database connection closed');
    } catch (err) {
      const msg = (err as Error)?.message ?? '';
      if (msg.includes('Called end on pool more than once')) {
        logger.warn('Pool already ended; ignoring duplicate close');
      } else {
        logger.error('Error closing database connection:', err);
      }
    }

    process.exit(0);
  })();

  return shutdownPromise;
}

process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT', () => { void shutdown('SIGINT'); });
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, error);
  void shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason as any);
  void shutdown('unhandledRejection');
});

void start();
