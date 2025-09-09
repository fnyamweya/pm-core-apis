import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import httpStatus from 'http-status-codes';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerOptions from '../swagger';
import { EnvConfiguration } from './config/env';
import { errorConverter, errorHandler } from './middlewares/common/errors';
import i18nMiddleware from './middlewares/i18n/i18nMiddleware';
import v1Router from './routes/v1';
import CorrelationIdUtil from './utils/correlationId';

import { logger, morganMiddleware } from './utils/logger';

dotenv.config({
  path: path.resolve(process.cwd(), `.env`),
});

const env = EnvConfiguration;

// Initializing the Express application
const app = express();

// Initialize Swagger
// const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.set('env', env.NODE_ENV);

// Set security HTTP headers
app.use(helmet());

// Development logging
if (env.NODE_ENV === 'development') {
  app.use(morganMiddleware);
}

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Compress all routes
app.use(compression());

// Internationalization
app.use(i18nMiddleware);

// Serving static files
app.use(express.static(path.join(__dirname, '../public')));

// Enable CORS with specified origin
app.use(cors());

app.use(CorrelationIdUtil.correlationIdMiddleware());

// // API Routes
app.use('/api/v1', v1Router);

// Health check endpoint
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// 404 Error handling for unknown API requests
app.use((req: Request, res: Response, _next: NextFunction) => {
  logger.error(
    `${req.method} ${req.originalUrl} - ${httpStatus.NOT_FOUND} - ${req.headers['user-agent']} ${req.ip}`
  );
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: `API endpoint doesn't exist`,
    code: httpStatus.NOT_FOUND,
  });
});

// Convert error to ApiError, if needed
app.use(errorConverter);

// Error handler, send stacktrace only during development
app.use(errorHandler);

export default app;
