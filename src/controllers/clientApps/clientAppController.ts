import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import ALLOWED_KINDS from '../../constants/allowedKinds';
import { AllowedKind } from '../../constants/allowedKinds';
import { ClientAppStatus } from '../../constants/clientApps/clientAppConstants';
import { ClientApp } from '../../entities/clientApps/clientAppEntity';
import clientAppService from '../../services/clientApps/clientAppService';
import BaseController from '../baseController';


const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE: 'Client app created successfully',
    UPDATE: 'Client app updated successfully',
    RETRIEVE: 'Client app retrieved successfully',
    DELETE: 'Client app deleted successfully',
  },
  ERROR: {
    CLIENT_APP_NOT_FOUND: 'Client app not found.',
    CLIENT_APP_EXISTS: 'A client app with this appId already exists.',
    INVALID_APP_ID: 'Client app ID is required.',
  },
};

/**
 * ClientAppController handles client app-related requests, providing CRUD operations
 * and response handling, extending the BaseController.
 */
class ClientAppController extends BaseController<ClientApp> {
  constructor() {
    super(clientAppService, ALLOWED_KINDS.APPLICATION.BASE as AllowedKind);
  }

  /**
   * Creates a new client app.
   */
  /**
   * Creates a new client app.
   * @param req - The Express request object.
   * @param res - The Express response object.
   */
  public async createClientApp(req: Request, res: Response): Promise<void> {
    const { name, status } = req.body;

    if (!name || !status) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        'Name and status are required.'
      );
    }

    try {
      const clientApp = await clientAppService.createClientApp(name, status);
      this.sendCreated(req, res, clientApp, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error) {
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.CLIENT_APP_EXISTS
      );
    }
  }

  /**
   * Updates a client app by its appId.
   */
  public async updateClientApp(req: Request, res: Response): Promise<void> {
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
      await clientAppService.updateClientAppByAppId(appId, updateData);
      const updatedClientApp =
        await clientAppService.getClientAppByAppId(appId);
      this.sendOrNotFound(
        updatedClientApp,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.UPDATE
      );
    } catch (error) {
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.CLIENT_APP_NOT_FOUND
      );
    }
  }

  /**
   * Retrieves a client app by its appId.
   */
  public async getClientAppByAppId(req: Request, res: Response): Promise<void> {
    const { appId } = req.params;

    try {
      const clientApp = await clientAppService.getClientAppByAppId(appId);
      this.sendOrNotFound(
        clientApp,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE
      );
    } catch (error) {
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.CLIENT_APP_NOT_FOUND
      );
    }
  }

  /**
   * Retrieves client apps by status.
   */
  public async getClientAppsByStatus(
    req: Request,
    res: Response
  ): Promise<void> {
    const { status } = req.query;

    if (!status) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        'Status parameter is required.'
      );
    }

    try {
      const clientApps = await clientAppService.getClientAppsByStatus(
        status as ClientAppStatus
      );
      this.sendSuccess(
        req,
        res,
        clientApps,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE
      );
    } catch (error) {
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.CLIENT_APP_NOT_FOUND
      );
    }
  }

  /**
   * Deletes a client app by its appId.
   */
  public async deleteClientApp(req: Request, res: Response): Promise<void> {
    const { appId } = req.params;

    try {
      await clientAppService.deleteClientAppByAppId(appId);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.CLIENT_APP_NOT_FOUND
      );
    }
  }

  /**
   * Helper method to send success or not-found response based on data presence.
   */
  protected sendOrNotFound(
    data: ClientApp | null,
    req: Request,
    res: Response,
    successMessage: string
  ): void {
    if (!data) {
      this.sendError(
        req,
        res,
        httpStatus.NOT_FOUND,
        'CLIENT_APP_NOT_FOUND',
        RESPONSE_MESSAGES.ERROR.CLIENT_APP_NOT_FOUND
      );
    } else {
      this.sendSuccess(req, res, data, successMessage);
    }
  }
}

export default new ClientAppController();
