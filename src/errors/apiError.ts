import { BaseError } from './baseError';

export class ApiError extends BaseError {
  statusCode: number;
  isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    isOperational = true,
    details?: Record<string, unknown>
  ) {
    super(message, details);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
  }
}
