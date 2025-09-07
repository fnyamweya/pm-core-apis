import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import ALLOWED_KINDS, { AllowedKind } from '../../constants/allowedKinds';
import { ClientAppConfig } from '../../entities/clientApps/clientAppConfigEntity';
import clientAppConfigService from '../../services/clientApps/clientAppConfigService';
import BaseController from '../baseController';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE: 'Client app config created successfully',
    UPDATE: 'Client app config updated successfully',
    RETRIEVE: 'Client app config retrieved successfully',
    DELETE: 'Client app config deleted successfully',
  },
  ERROR: {
    CLIENT_APP_CONFIG_NOT_FOUND: 'Client app config not found.',
    INVALID_APP_ID: 'Client app ID is required.',
  },
};

/**
 * ClientAppConfigController handles client app config-related requests, providing CRUD operations
 * and response handling, extending the BaseController.
 */
class ClientAppConfigController extends BaseController<ClientAppConfig> {
  constructor() {
    super(clientAppConfigService, ALLOWED_KINDS.APPLICATION.BASE as AllowedKind);
  }

  /**
   * Creates a new client app config.
   */
  public async createClientAppConfig(
    req: Request,
    res: Response
  ): Promise<void> {
    const {
      appId,
      redirectUris,
      grantTypes,
      scopes,
      accessTokenExpiry,
      refreshTokenExpiry,
      pkceRequired,
      tokenAlgorithm,
      tokenIssuer,
      tokenAudience,
      metadata,
    } = req.body;

    if (!appId) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        'AppId is required.'
      );
    }

    try {
      const clientAppConfig = await clientAppConfigService.create({
        application: { id: appId },
        redirectUris,
        grantTypes,
        scopes,
        accessTokenExpiry,
        refreshTokenExpiry,
        pkceRequired,
        tokenAlgorithm,
        tokenIssuer,
        tokenAudience,
        metadata,
      });

      this.sendCreated(
        req,
        res,
        clientAppConfig,
        RESPONSE_MESSAGES.SUCCESS.CREATE
      );
    } catch (error) {
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.CLIENT_APP_CONFIG_NOT_FOUND
      );
    }
  }

  /**
   * Updates a client app config by its appId.
   */
  public async updateClientAppConfig(
    req: Request,
    res: Response
  ): Promise<void> {
    const { appId } = req.params;
    const updateData = req.body;

    if (!updateData) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        'No update data provided.'
      );
    }

    try {
      await clientAppConfigService.updateClientAppConfigByAppId(
        appId,
        updateData
      );
      const updatedClientAppConfig =
        await clientAppConfigService.getClientAppConfigByAppId(appId);
      this.sendOrNotFound(
        updatedClientAppConfig,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.UPDATE
      );
    } catch (error) {
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.CLIENT_APP_CONFIG_NOT_FOUND
      );
    }
  }

  /**
   * Retrieves a client app config by its appId.
   */
  public async getClientAppConfigByAppId(
    req: Request,
    res: Response
  ): Promise<void> {
    const { appId } = req.params;

    try {
      const clientAppConfig =
        await clientAppConfigService.getClientAppConfigByAppId(appId);
      this.sendOrNotFound(
        clientAppConfig,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE
      );
    } catch (error) {
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.CLIENT_APP_CONFIG_NOT_FOUND
      );
    }
  }

  /**
   * Deletes a client app config by its appId.
   */
  public async deleteClientAppConfig(
    req: Request,
    res: Response
  ): Promise<void> {
    const { appId } = req.params;

    try {
      await clientAppConfigService.deleteClientAppConfigByAppId(appId);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.CLIENT_APP_CONFIG_NOT_FOUND
      );
    }
  }

  /**
   * Helper method to send success or not-found response based on data presence.
   */
  protected sendOrNotFound(
    data: ClientAppConfig | null,
    req: Request,
    res: Response,
    successMessage: string
  ): void {
    if (!data) {
      this.sendError(
        req,
        res,
        httpStatus.NOT_FOUND,
        'CLIENT_APP_CONFIG_NOT_FOUND',
        RESPONSE_MESSAGES.ERROR.CLIENT_APP_CONFIG_NOT_FOUND
      );
    } else {
      this.sendSuccess(req, res, data, successMessage);
    }
  }
}

export default new ClientAppConfigController();
