import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import ALLOWED_KINDS from '../../constants/allowedKinds';
import { PaymentProvider } from '../../entities/payments/paymentProviderEntity';
import validate from '../../middlewares/common/validate';
import paymentProviderService from '../../services/payments/paymentProviderService';
import { logger } from '../../utils/logger';
import {
  createPaymentProviderSchema,
  updatePaymentProviderSchema,
} from '../../validations/payments/paymentProviderValidation';
import BaseController from '../baseController';
import { AllowedKind } from '../../constants/allowedKinds';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE: 'PaymentProvider created successfully',
    UPDATE: 'PaymentProvider updated successfully',
    RETRIEVE: 'PaymentProvider retrieved successfully',
    DELETE: 'PaymentProvider deleted successfully',
  },
  ERROR: {
    PROVIDER_NOT_FOUND: 'PaymentProvider not found.',
    PROVIDER_EXISTS: 'PaymentProvider with this code already exists.',
    INVALID_INPUT: 'Invalid input data.',
  },
};

/**
 * Controller for handling Payment Provider-related requests.
 * Extends BaseController for shared functionality and implements specific CRUD operations.
 */
class PaymentProviderController extends BaseController<PaymentProvider> {
  constructor() {
    super(paymentProviderService, ALLOWED_KINDS.PAYMENT_PROVIDER.BASE as AllowedKind);
  }

  /**
   * Creates a new PaymentProvider.
   */
  public async createPaymentProvider(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    logger.info('Attempting to create a new PaymentProvider', {
      body: req.body,
    });

    try {
      // Validate request payload
      await validate(createPaymentProviderSchema)(req, res, next);

      const provider = await paymentProviderService.createPaymentProvider(
        req.body
      );
      logger.info('PaymentProvider created successfully:', provider);

      return this.sendCreated(
        req,
        res,
        provider,
        RESPONSE_MESSAGES.SUCCESS.CREATE
      );
    } catch (error) {
      logger.error('Error during PaymentProvider creation:', { error });

      // Handle known and unknown errors
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.PROVIDER_EXISTS
      );
    }
  }

  /**
   * Retrieves a PaymentProvider by its code.
   */
  public async getPaymentProviderByCode(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { code } = req.params;

    if (!code) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT
      );
    }

    try {
      const provider =
        await paymentProviderService.getPaymentProviderByCode(code);

      // Use `sendOrNotFound` to handle missing data
      this.sendOrNotFound(
        provider,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Updates a PaymentProvider by its code.
   */
  public async updatePaymentProviderByCode(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { code } = req.params;

    if (!code) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT
      );
    }

    try {
      // Validate request payload
      await validate(updatePaymentProviderSchema)(req, res, next);

      const updatedProvider =
        await paymentProviderService.updatePaymentProviderByCode(
          code,
          req.body
        );

      // Use `sendOrNotFound` to handle missing data
      this.sendOrNotFound(
        updatedProvider,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.UPDATE
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Deletes a PaymentProvider by its code.
   */
  public async deletePaymentProviderByCode(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { code } = req.params;

    if (!code) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT
      );
    }

    try {
      await paymentProviderService.deletePaymentProviderByCode(code);

      // Send no-content response
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.PROVIDER_NOT_FOUND
      );
    }
  }

  /**
   * Retrieves all PaymentProviders.
   */
  public async getAllPaymentProviders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const providers = await paymentProviderService.getAllPaymentProviders();

      this.sendSuccess(req, res, providers, RESPONSE_MESSAGES.SUCCESS.RETRIEVE);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }
}

export default new PaymentProviderController();
