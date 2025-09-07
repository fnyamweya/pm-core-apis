import { Server } from 'http';
import 'reflect-metadata';
import app from './app';
import databaseInstance from './config/database';
// import { elasticsearchManager } from './config/elasticsearch';
import { currentEnvironment } from './config/env';
// import {
//   AuditTrailService,
//   createAuditTrailService,
// } from './services/auditTrail/auditTrailService';
import { logger } from './utils/logger';
import { initializeSecrets, createEnvConfiguration } from './config/env';

const port = process.env.PORT || 5000;
let server: Server | null = null;
// let auditTrailService: AuditTrailService | null = null;

// Graceful shutdown logic
const gracefulShutdown = async (options: { exit?: boolean } = {}) => {
  if (server) {
    const timeout = setTimeout(() => {
      logger.warn('Forcing shutdown due to timeout');
      process.exit(1);
    }, 10000); // Timeout to force shutdown after 10 seconds

    server.close(async () => {
      clearTimeout(timeout);
      logger.info('Server closed');

      // Close database connection
      try {
        await databaseInstance.close();
        logger.info('Database connection closed');
      } catch (dbError) {
        logger.error('Error closing database connection:', dbError);
      }

      // Clean up audit trail indices if needed
      // try {
      //   if (auditTrailService) {
      //     await auditTrailService.cleanup();
      //     logger.info('Audit trail cleanup completed');
      //   }
      // } catch (auditError) {
      //   logger.error('Error cleaning up audit trail:', auditError);
      // }

      // Close Elasticsearch connection
      // try {
      //   await elasticsearchManager.close();
      //   logger.info('Elasticsearch client connection closed');
      // } catch (esError) {
      //   logger.error('Error closing Elasticsearch client:', esError);
      // }

      if (options.exit) process.exit();
    });
  } else if (options.exit) {
    process.exit(1);
  }
};

// Start the server and initialize the database and Elasticsearch
const startServer = async () => {
  try {
    await initializeSecrets();
    const envConfiguration = createEnvConfiguration();
    logger.info('Environment configuration:', envConfiguration);

    // Initialize the database connection
    await databaseInstance.initialize();
    logger.info('Database has been initialized!');

    // Initialize Elasticsearch client
    // await elasticsearchManager.initialize();
    // logger.info('Elasticsearch client has been initialized!');

    // Initialize Audit Trail Service
    // auditTrailService = createAuditTrailService(
    //   elasticsearchManager.getClient(),
    //   {
    //     index: process.env.AUDIT_TRAIL_INDEX || 'audit-trail',
    //     retentionDays: process.env.AUDIT_TRAIL_RETENTION_DAYS
    //       ? parseInt(process.env.AUDIT_TRAIL_RETENTION_DAYS, 10)
    //       : 90,
    //   }
    // );
    // await auditTrailService.initialize();
    // logger.info('Audit Trail Service has been initialized!');

    // Make audit trail service available throughout the application
    // app.locals.auditTrailService = auditTrailService;

    // Start the Express server
    server = app.listen(port, () => {
      logger.info(
        `Server started on port ${port} in ${currentEnvironment} mode.`
      );
    });
    server.timeout = 10000; // Set server timeout to 10 seconds
  } catch (error) {
    logger.error('Failed to start the server:', error);
    process.exit(1); // Exit the process if the server fails to start
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, error);
  gracefulShutdown({ exit: true });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  gracefulShutdown({ exit: true });
});

// Handle SIGTERM for graceful shutdown (e.g., from Docker, Kubernetes)
process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  gracefulShutdown({ exit: true });
});

// Start the server
startServer();
