export abstract class BaseError extends Error {
  abstract statusCode: number;
  abstract isOperational: boolean;
  details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
