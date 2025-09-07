import { NextFunction, Request, RequestHandler, Response } from 'express';
import httpStatus from 'http-status-codes';
import Joi, { ObjectSchema, ValidationResult } from 'joi';
import CorrelationIdUtil from '../../utils/correlationId';
import pick from '../../utils/pick';

type ValidSchema = {
  params?: ObjectSchema;
  query?: ObjectSchema;
  body?: ObjectSchema;
};

type ValidationErrorDetail = {
  field: string;
  error: string;
};

/**
 * Middleware to validate request parameters, query, and body based on the provided schema.
 * Includes the correlation ID in the response for traceability.
 */
const validate = (schema: ValidSchema): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validSchema = pick(schema, ['params', 'query', 'body']);
    if (!Object.keys(validSchema).length) {
      next();
      return;
    }

    const objectToValidate = pick(
      req,
      Object.keys(validSchema) as Array<keyof Request>
    );

    const { value, error }: ValidationResult = Joi.object(validSchema)
      .prefs({ errors: { label: 'key' }, abortEarly: false })
      .validate(objectToValidate);

    if (error) {
      const correlationId = CorrelationIdUtil.getCorrelationId() || 'N/A';

      const validationErrors: ValidationErrorDetail[] = error.details.map(
        (detail) => ({
          field: detail.path.join('.'),
          error: detail.message,
        })
      );

      res.status(httpStatus.BAD_REQUEST).json({
        status: 'fail',
        code: 'VALIDATION_ERROR',
        message: 'Validation failed for one or more fields.',
        details: validationErrors,
        meta: {
          correlationId,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Assign validated values to `req` and proceed
    Object.assign(req, value);
    next();
  };
};

export default validate;
