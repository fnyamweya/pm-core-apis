import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { ObjectLiteral } from 'typeorm';
import { AllowedKind } from '../constants/allowedKinds';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../errors/httpErrors';
import { BaseService } from '../services/baseService';
import { logger } from '../utils/logger';
import { ApiResponseFormatter, Pagination } from '../utils/responseFormatter';

/**
 * BaseController class that provides common CRUD operations and response handling.
 * This controller can be extended by other controllers to leverage common logic.
 * @template T - The entity type handled by the controller.
 */
abstract class BaseController<T extends ObjectLiteral> {
  protected service: BaseService<T>;
  private kind: AllowedKind;

  /**
   * Initializes the BaseController.
   * @param service - The service instance that handles the entity's business logic.
   * @param kind - The kind of entity this controller handles.
   */
  constructor(service: BaseService<T>, kind: AllowedKind) {
    this.service = service;
    this.kind = kind;
  }

  /**
   * Sends a success response with data.
   * @param req - The Express request object.
   * @param res - The Express response object.
   * @param data - The data to send in the response.
   * @param message - A message describing the success of the operation.
   * @param pagination - Optional pagination data.
   * @param omitFields - Optional fields to omit from the response.
   */
  protected sendSuccess(
    req: Request,
    res: Response,
    data: Record<string, any>,
    message: string = 'Operation successful',
    pagination?: Pagination,
    omitFields?: string[]
  ): void {
    const response = ApiResponseFormatter.success({
      req,
      data,
      kind: this.kind,
      pagination,
      metadata: { message },
      omitFields,
    });
    logger.info('Success response sent', { kind: this.kind, message });
    res.status(httpStatus.OK).json(response);
  }

  /**
   * Sends a created response with data.
   * @param req - The Express request object.
   * @param res - The Express response object.
   * @param data - The data to send in the response.
   * @param message - A message describing the success of the creation.
   */
  protected sendCreated(
    req: Request,
    res: Response,
    data: Record<string, any>,
    message: string = 'Resource created successfully'
  ): void {
    const response = ApiResponseFormatter.success({
      req,
      data,
      kind: this.kind,
      metadata: { message },
    });
    logger.info('Created response sent', { kind: this.kind, message });
    res.status(httpStatus.CREATED).json(response);
  }

  /**
   * Sends an error response with error details.
   * @param req - The Express request object.
   * @param res - The Express response object.
   * @param statusCode - The HTTP status code for the response.
   * @param errorCode - A unique code identifying the error type.
   * @param message - A message describing the error.
   */
  protected sendError(
    req: Request,
    res: Response,
    statusCode: number,
    errorCode: string,
    message: string
  ): void {
    if (res.headersSent) {
      logger.warn('Attempted to send error after headers were already sent.', {
        errorCode,
        message,
      });
      return;
    }

    const response = ApiResponseFormatter.error({
      req,
      errorCode,
      message,
      kind: this.kind,
    });

    logger.warn('Error response sent', { kind: this.kind, errorCode, message });
    res.status(statusCode).json(response);
  }

  /**
   * Handles and logs errors, distinguishing between known and unknown errors.
   * @param error - The error to handle.
   * @param req - The Express request object.
   * @param res - The Express response object.
   * @param fallbackMessage - Optional fallback message for unknown errors.
   */
  protected handleError(
    error: any,
    req: Request,
    res: Response,
    fallbackMessage = 'An unexpected error occurred. Please try again later.'
  ): void {
    if (res.headersSent) {
      logger.warn('Attempted to handle error after response was sent:', {
        error,
      });
      return;
    }

    if (error instanceof ConflictError) {
      this.sendError(
        req,
        res,
        httpStatus.CONFLICT,
        'CONFLICT_ERROR',
        error.message
      );
    } else if (error instanceof BadRequestError) {
      this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'BAD_REQUEST_ERROR',
        error.message
      );
    } else if (error instanceof NotFoundError) {
      this.sendError(
        req,
        res,
        httpStatus.NOT_FOUND,
        'NOT_FOUND_ERROR',
        error.message
      );
    } else {
      logger.error('Unhandled error encountered:', { error });
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: fallbackMessage,
        },
      });
    }
  }

  /**
   * Sends a success response or an error if the data is not found.
   * Reusable for various operations to keep code DRY.
   * @param data - The data to send if found.
   * @param req - The Express request object.
   * @param res - The Express response object.
   * @param successMessage - Message to include if the data exists.
   * @param notFoundMessage - Message to include if the data is not found.
   */
  protected sendOrNotFound(
    data: any,
    req: Request,
    res: Response,
    successMessage: string,
    notFoundMessage = 'Resource not found.'
  ): void {
    if (!data) {
      this.sendError(
        req,
        res,
        httpStatus.NOT_FOUND,
        'NOT_FOUND',
        notFoundMessage
      );
      return;
    }

    this.sendSuccess(req, res, data, successMessage);
  }

  /**
   * Handles exceptions during request processing.
   * Should be invoked as a fallback for unknown errors.
   * @param error - The error to handle.
   * @param req - The Express request object.
   * @param res - The Express response object.
   */
  protected handleException(error: any, req: Request, res: Response): void {
    this.handleError(error, req, res);
  }

  /**
   * Retrieves all entities and sends a success response.
   * @param req - The Express request object.
   * @param res - The Express response object.
   */
  public async getAll(req: Request, res: Response): Promise<void> {
    try {
      const entities = await this.service.getAll();
      this.sendSuccess(
        req,
        res,
        entities,
        'All records retrieved successfully'
      );
    } catch (error) {
      this.handleException(error, req, res);
    }
  }

  /**
   * Retrieves paginated entities based on pagination options in the request.
   * @param req - The Express request object.
   * @param res - The Express response object.
   */
  public async getPaginated(req: Request, res: Response): Promise<void> {
    const { page, limit } = req.query;
    const paginationOptions = {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    };

    try {
      const paginatedResult =
        await this.service.getPaginated(paginationOptions);
      this.sendSuccess(
        req,
        res,
        paginatedResult.items,
        'Paginated records retrieved successfully',
        {
          page: paginatedResult.page,
          limit: paginatedResult.limit,
          total: paginatedResult.total,
          totalPages: paginatedResult.totalPages,
        }
      );
    } catch (error) {
      this.handleException(error, req, res);
    }
  }

  /**
   * Retrieves a single entity by ID and sends a success response if found.
   * @param req - The Express request object.
   * @param res - The Express response object.
   */
  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const entity = await this.service.getById(req.params.id);
      this.sendOrNotFound(entity, req, res, 'Record retrieved successfully');
    } catch (error) {
      this.handleException(error, req, res);
    }
  }

  /**
   * Creates a new entity and sends a success response.
   * @param req - The Express request object.
   * @param res - The Express response object.
   */
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const entity = await this.service.create(req.body);
      this.sendCreated(req, res, entity, 'Record created successfully');
    } catch (error) {
      this.handleException(error, req, res);
    }
  }

  /**
   * Updates an existing entity and sends a success response if found.
   * @param req - The Express request object.
   * @param res - The Express response object.
   */
  public async update(req: Request, res: Response): Promise<void> {
    try {
      const entity = await this.service.update(req.params.id, req.body);
      this.sendOrNotFound(entity, req, res, 'Record updated successfully');
    } catch (error) {
      this.handleException(error, req, res);
    }
  }

  /**
   * Deletes an entity by ID and sends a success response if found.
   * @param req - The Express request object.
   * @param res - The Express response object.
   */
  public async delete(req: Request, res: Response): Promise<void> {
    try {
      await this.service.delete(req.params.id);
      this.sendSuccess(req, res, {}, 'Record deleted successfully');
    } catch (error) {
      this.handleException(error, req, res);
    }
  }
}

export default BaseController;
