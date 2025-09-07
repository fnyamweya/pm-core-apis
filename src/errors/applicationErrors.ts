import { BadRequestError, InternalServerError } from './httpErrors';

export class ValidationError extends BadRequestError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}

export class DatabaseError extends InternalServerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}
