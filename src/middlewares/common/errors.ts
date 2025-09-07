import { NextFunction, Request, Response } from 'express';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import {
  isDevelopmentEnvironment,
  isProductionEnvironment,
} from '../../config/env';
import { ApiError } from '../../errors/apiError';
import { BaseError } from '../../errors/baseError';
import { logger } from '../../utils/logger';

/**
 * Converts any non-BaseError to an ApiError, providing a standard structure for all errors.
 */
export const errorConverter = (
  err: unknown,
  _req: Request,
  _res: Response,
  next: NextFunction
): void => {
  let error = err;
  if (!(error instanceof BaseError)) {
    const statusCode =
      (error as ApiError)?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    const message = (error as Error)?.message || getReasonPhrase(statusCode);
    error = new ApiError(statusCode, message, false, { originalError: err });
  }
  next(error as ApiError);
};

/**
 * Centralized error handler that responds with different levels of detail based on environment.
 */
export const errorHandler = (
  err: BaseError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const { statusCode, message, isOperational, details } = err;

  // Selects response code and message based on environment and error nature
  const responseStatusCode =
    isProductionEnvironment && !isOperational
      ? StatusCodes.INTERNAL_SERVER_ERROR
      : statusCode;

  const responseMessage =
    isProductionEnvironment && !isOperational
      ? getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR)
      : message;

  res.locals.errorMessage = message;

  const response = {
    code: responseStatusCode,
    message: responseMessage,
    ...(isDevelopmentEnvironment && { stack: err.stack, details }),
  };

  // Logs the error with comprehensive detail for debugging
  logger.error({
    message,
    statusCode,
    stack: err.stack,
    isOperational,
    details,
  });

  res.status(responseStatusCode).json(response);
};
