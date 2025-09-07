import morgan, { StreamOptions } from 'morgan';
import winston, { format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import CorrelationIdUtil from './correlationId';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Function to get correlation ID
const getCorrelationId = () => CorrelationIdUtil.getCorrelationId() ?? '';

// Define the format for console logs
const consoleFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.colorize({ all: true }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length
      ? JSON.stringify(meta, null, 2)
      : '';
    const correlationId = getCorrelationId();
    return `${timestamp} [${level.toUpperCase()}] [${correlationId}] ${message} ${metaString}`;
  })
);

// Define the format for file logs
const fileFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length
      ? JSON.stringify(meta, null, 2)
      : '';
    const correlationId = getCorrelationId();
    return `${timestamp} [${level.toUpperCase()}] [${correlationId}] ${message} ${metaString}`;
  })
);

// Create the logger with different transports
const logger = winston.createLogger({
  levels,
  format: fileFormat,
  transports: [
    new winston.transports.Console({
      level: 'debug',
      format: consoleFormat,
    }),
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
    }),
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

// Define the stream for morgan to use winston
const morganStream: StreamOptions = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Define custom morgan format
const morganFormat =
  ':method :url :status :response-time ms - :res[content-length]';

// Use morgan middleware with custom format and winston stream
const morganMiddleware = morgan(morganFormat, { stream: morganStream });

// Attach Correlation ID middleware to Express
const correlationIdMiddleware = CorrelationIdUtil.correlationIdMiddleware();

export { correlationIdMiddleware, logger, morganMiddleware };
