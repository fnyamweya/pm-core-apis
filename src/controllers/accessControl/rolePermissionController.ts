import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import ALLOWED_KINDS from '../../constants/allowedKinds';
import { AllowedKind } from '../../constants/allowedKinds';
import { RolePermission } from '../../entities/accessControl/rolePermissionEntity';
import rolePermissionService from '../../services/accessControl/rolePermissionService';
import { logger } from '../../utils/logger';
import BaseController from '../baseController';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE: 'Role permission created successfully',
    RETRIEVE: 'Role permission retrieved successfully',
    DELETE: 'Role permission deleted successfully',
  },
  ERROR: {
    ROLE_PERMISSION_NOT_FOUND: 'Role permission not found.',
    ROLE_PERMISSION_EXISTS:
      'Role permission with given identifiers already exists.',
  },
};

/**
 * RolePermissionController handles role permission-related requests, providing CRUD operations
 * and response handling, extending the BaseController.
 */
class RolePermissionController extends BaseController<RolePermission> {
  constructor() {
    super(rolePermissionService, ALLOWED_KINDS.ROLE.BASE as AllowedKind);
  }

  /**
   * Creates a new role permission.
   */
  public async createRolePermission(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    logger.info('Attempting to create a new role permission', {
      params: req.params,
      body: req.body,
    });

    const { roleId } = req.params;
    const { permissionId } = req.body;

    if (!roleId || !permissionId) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        'RoleId and PermissionId are required.'
      );
    }

    try {
      const rolePermission = await rolePermissionService.createRolePermission({
        roleId,
        permissionId,
      });

      logger.info('Role permission created successfully:', rolePermission);
      return this.sendCreated(
        req,
        res,
        rolePermission,
        RESPONSE_MESSAGES.SUCCESS.CREATE
      );
    } catch (error) {
      logger.error('Error creating role permission:', { error });

      // Handle error using unified error handler
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.ROLE_PERMISSION_EXISTS
      );
    }
  }

  /**
   * Retrieves a role permission by its ID.
   */
  public async getRolePermissionById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { id } = req.params;

    logger.info('Fetching role permission by ID:', { id });

    if (!id) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        'RolePermission ID is required.'
      );
    }

    try {
      const rolePermission = await rolePermissionService.getById(id);

      // Use BaseController's `sendOrNotFound` for missing data handling
      this.sendOrNotFound(
        rolePermission,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE,
        RESPONSE_MESSAGES.ERROR.ROLE_PERMISSION_NOT_FOUND
      );
    } catch (error) {
      logger.error('Error fetching role permission:', { error });
      this.handleError(error, req, res);
    }
  }

  /**
   * Retrieves all role permissions for a specific role.
   */
  public async getAllRolePermissions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { roleId } = req.params;

    logger.info('Fetching all role permissions for role:', { roleId });

    if (!roleId) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        'RoleId is required.'
      );
    }

    try {
      const rolePermissions =
        await rolePermissionService.getPermissionsByRole(roleId);

      // Use BaseController's `sendSuccess` for successful data retrieval
      this.sendSuccess(
        req,
        res,
        rolePermissions,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE
      );
    } catch (error) {
      logger.error('Error fetching all role permissions:', { error });
      this.handleError(error, req, res);
    }
  }

  // TODO fix error on fetch
  /**
   * Retrieves a specific role permission by role ID and permission ID.
   */
  public async getRolePermissionByRoleIdAndPermissionId(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { roleId, permissionId } = req.params;

    logger.info('Fetching role permission by role ID and permission ID:', {
      roleId,
      permissionId,
    });

    if (!roleId || !permissionId) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        'RoleId and PermissionId are required.'
      );
    }

    try {
      const rolePermission =
        await rolePermissionService.getByRoleIdAndPermissionId(
          roleId,
          permissionId
        );

      // Use BaseController's `sendOrNotFound` for missing data handling
      this.sendOrNotFound(
        rolePermission,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE,
        RESPONSE_MESSAGES.ERROR.ROLE_PERMISSION_NOT_FOUND
      );
    } catch (error) {
      logger.error('Error fetching role permission:', { error });
      this.handleError(error, req, res);
    }
  }

  /**
   * Deletes a role permission by its ID.
   */
  public async deleteRolePermission(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { id } = req.params;

    logger.info('Attempting to delete role permission:', { id });

    if (!id) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        'RolePermission ID is required.'
      );
    }

    try {
      await rolePermissionService.deleteRolePermission(id);

      logger.info('Role permission deleted successfully:', { id });

      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      logger.error('Error deleting role permission:', { error });

      // Handle error using unified error handler
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.ROLE_PERMISSION_NOT_FOUND
      );
    }
  }
}

export default new RolePermissionController();
