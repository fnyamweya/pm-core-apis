import httpStatus from 'http-status-codes';
import { ApiError } from './apiError';

class HttpError extends ApiError {
  constructor(
    statusCode: number,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(statusCode, message, true, details);
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(httpStatus.BAD_REQUEST, message, details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(httpStatus.UNAUTHORIZED, message, details);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(httpStatus.FORBIDDEN, message, details);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(httpStatus.NOT_FOUND, message, details);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(httpStatus.CONFLICT, message, details);
  }
}

export class InternalServerError extends HttpError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(httpStatus.INTERNAL_SERVER_ERROR, message, details);
  }
}

export { ApiError };
