import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import ALLOWED_KINDS, { AllowedKind } from '../../constants/allowedKinds';
import { PaymentProviderConfig } from '../../entities/payments/paymentProviderConfigEntity';
import validate from '../../middlewares/common/validate';
import paymentProviderConfigService from '../../services/payments/paymentProviderConfigService';
import { logger } from '../../utils/logger';
import {
  createPaymentProviderConfigSchema,
  updatePaymentProviderConfigSchema,
} from '../../validations/payments/paymentProviderConfigValidation';
import BaseController from '../baseController';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE: 'PaymentProvider configuration created successfully',
    UPDATE: 'PaymentProvider configuration updated successfully',
    RETRIEVE: 'PaymentProvider configuration retrieved successfully',
    DELETE: 'PaymentProvider configuration deleted successfully',
  },
  ERROR: {
    CONFIG_NOT_FOUND: 'PaymentProvider configuration not found.',
    CONFIG_EXISTS: 'A configuration with this key already exists.',
    INVALID_REQUEST: 'Missing or invalid request parameters.',
  },
};

/**
 * PaymentProviderConfigController handles PaymentProvider configuration-related requests,
 * providing CRUD operations and response handling, extending the BaseController.
 */
class PaymentProviderConfigController extends BaseController<PaymentProviderConfig> {
  constructor() {
    super(
      paymentProviderConfigService,
      ALLOWED_KINDS.PAYMENT_PROVIDER.CONFIG as AllowedKind
    );
  }

  /**
   * Creates a new PaymentProvider configuration.
   */
  public async createConfig(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    logger.info('Creating PaymentProviderConfig', { body: req.body });

    try {
      await validate(createPaymentProviderConfigSchema)(req, res, next);

      const { key, value, metadata } = req.body;
      const { providerCode } = req.params;

      if (!providerCode) {
        return this.sendError(
          req,
          res,
          httpStatus.BAD_REQUEST,
          'INVALID_INPUT',
          'Provider code is required'
        );
      }

      const config =
        await paymentProviderConfigService.createPaymentProviderConfig({
          providerCode,
          key,
          value,
          metadata,
        });

      this.sendCreated(req, res, config, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error) {
      logger.error('Error creating PaymentProviderConfig:', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.CONFIG_EXISTS);
    }
  }

  /**
   * Retrieves all configurations for a specific PaymentProvider.
   */
  public async getConfigsByProviderCode(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerCode } = req.params;

    if (!providerCode) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_REQUEST
      );
    }

    logger.info('Fetching configs for providerCode:', { providerCode });

    try {
      const configs =
        await paymentProviderConfigService.getConfigsByProviderCode(
          providerCode
        );

      this.sendSuccess(req, res, configs, RESPONSE_MESSAGES.SUCCESS.RETRIEVE);
    } catch (error) {
      logger.error('Error fetching configs:', { error });
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.CONFIG_NOT_FOUND
      );
    }
  }

  /**
   * Updates a specific configuration by its provider code and key.
   */
  public async updateConfigByProviderCode(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerCode, key } = req.params;

    if (!providerCode || !key) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_REQUEST
      );
    }

    logger.info('Updating config for providerCode and key:', {
      providerCode,
      key,
      body: req.body,
    });

    try {
      await validate(updatePaymentProviderConfigSchema)(req, res, next);

      const { value, metadata } = req.body;

      const updatedConfig =
        await paymentProviderConfigService.updateConfigByProviderCode(
          providerCode,
          key,
          {
            value,
            metadata,
          }
        );

      this.sendOrNotFound(
        updatedConfig,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.UPDATE,
        RESPONSE_MESSAGES.ERROR.CONFIG_NOT_FOUND
      );
    } catch (error) {
      logger.error('Error updating config:', { error });
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.CONFIG_NOT_FOUND
      );
    }
  }

  /**
   * Deletes a specific configuration for a PaymentProvider by key.
   */
  public async deleteConfigByProviderCode(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerCode, key } = req.params;

    if (!providerCode || !key) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_REQUEST
      );
    }

    logger.info('Deleting config for providerCode and key:', {
      providerCode,
      key,
    });

    try {
      await paymentProviderConfigService.deleteConfigByProviderCode(
        providerCode,
        key
      );
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      logger.error('Error deleting config:', { error });
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.CONFIG_NOT_FOUND
      );
    }
  }
}

export default new PaymentProviderConfigController();
