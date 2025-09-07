import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import ALLOWED_KINDS, { AllowedKind } from '../../constants/allowedKinds';
import { Permission } from '../../entities/accessControl/permissionsEntity';
import permissionService from '../../services/accessControl/permissionService';
import { logger } from '../../utils/logger';
import BaseController from '../baseController';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE: 'Permission created successfully',
    UPDATE: 'Permission updated successfully',
    RETRIEVE: 'Permission retrieved successfully',
    DELETE: 'Permission deleted successfully',
  },
  ERROR: {
    PERMISSION_NOT_FOUND: 'Permission not found.',
    PERMISSION_EXISTS: 'A permission with this identifier already exists.',
  },
};

/**
 * PermissionController handles permission-related requests, providing CRUD operations
 * and response handling, extending the BaseController.
 */
class PermissionController extends BaseController<Permission> {
  constructor() {
    // Initialize the controller with the permissionService and allowed kind
    super(permissionService, ALLOWED_KINDS.ROLE.BASE as AllowedKind);
  }

  /**
   * Creates a new permission.
   */
  public async createPermission(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    logger.info('Attempting to create a new permission', { body: req.body });

    try {
      const { name, description, category } = req.body;

      const permission = await this.service.create({
        name,
        description,
        category,
      });
      logger.info('Permission created successfully:', permission);

      return this.sendCreated(
        req,
        res,
        permission,
        RESPONSE_MESSAGES.SUCCESS.CREATE
      );
    } catch (error) {
      logger.error('Error creating permission:', { error });

      // Handle error using BaseController's unified error handler
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.PERMISSION_EXISTS
      );
    }
  }

  /**
   * Updates an existing permission by its identifier.
   */
  public async updatePermission(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    logger.info('Attempting to update permission', {
      permissionId: req.params.permissionId,
      body: req.body,
    });

    try {
      const updatedPermission = await this.service.update(
        req.params.permissionId,
        req.body
      );

      // Use BaseController's `sendOrNotFound` for missing data handling
      this.sendOrNotFound(
        updatedPermission,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.UPDATE,
        RESPONSE_MESSAGES.ERROR.PERMISSION_NOT_FOUND
      );
    } catch (error) {
      logger.error('Error updating permission:', { error });
      this.handleError(error, req, res);
    }
  }

  /**
   * Retrieves a permission by its identifier.
   */
  public async getPermissionById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    logger.info('Fetching permission by identifier:', {
      permissionId: req.params.permissionId,
    });

    try {
      const permission = await this.service.getById(req.params.permissionId);

      // Use BaseController's `sendOrNotFound` for missing data handling
      this.sendOrNotFound(
        permission,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE,
        RESPONSE_MESSAGES.ERROR.PERMISSION_NOT_FOUND
      );
    } catch (error) {
      logger.error('Error fetching permission:', { error });
      this.handleError(error, req, res);
    }
  }

  /**
   * Deletes a permission by its identifier.
   */
  public async deletePermission(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    logger.info('Attempting to delete permission:', {
      permissionId: req.params.permissionId,
    });

    try {
      await this.service.delete(req.params.permissionId);

      logger.info('Permission deleted successfully:', {
        permissionId: req.params.permissionId,
      });

      // Send no-content response for successful deletion
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      logger.error('Error deleting permission:', { error });
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.PERMISSION_NOT_FOUND
      );
    }
  }
}

export default new PermissionController();
