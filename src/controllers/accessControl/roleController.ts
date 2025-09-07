import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import ALLOWED_KINDS, { AllowedKind } from '../../constants/allowedKinds';
import { Role } from '../../entities/accessControl/roleEntity';
import roleService from '../../services/accessControl/roleService';
import { logger } from '../../utils/logger';
import BaseController from '../baseController';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE: 'Role created successfully',
    UPDATE: 'Role updated successfully',
    RETRIEVE: 'Role retrieved successfully',
    DELETE: 'Role deleted successfully',
  },
  ERROR: {
    ROLE_NOT_FOUND: 'Role not found.',
    ROLE_EXISTS: 'A role with this identifier already exists.',
  },
};

/**
 * RoleController handles role-related requests, providing CRUD operations
 * and response handling, extending the BaseController.
 */
class RoleController extends BaseController<Role> {
  constructor() {
    // Initialize the controller with the roleService and allowed kind
    super(roleService, ALLOWED_KINDS.ROLE.BASE as AllowedKind);
  }

  /**
   * Creates a new role.
   */
  public async createRole(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    logger.info('Attempting to create a new role', { body: req.body });

    try {
      const { name, description } = req.body;

      const role = await this.service.create({ name, description });
      logger.info('Role created successfully:', role);

      return this.sendCreated(req, res, role, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error) {
      logger.error('Error creating role:', { error });

      // Handle error using BaseController's unified error handler
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.ROLE_EXISTS);
    }
  }

  /**
   * Updates an existing role by its identifier.
   */
  public async updateRole(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    logger.info('Attempting to update role', {
      roleId: req.params.roleId,
      body: req.body,
    });

    try {
      const updatedRole = await this.service.update(
        req.params.roleId,
        req.body
      );

      // Use BaseController's `sendOrNotFound` for missing data handling
      this.sendOrNotFound(
        updatedRole,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.UPDATE,
        RESPONSE_MESSAGES.ERROR.ROLE_NOT_FOUND
      );
    } catch (error) {
      logger.error('Error updating role:', { error });
      this.handleError(error, req, res);
    }
  }

  /**
   * Retrieves a role by its identifier.
   */
  public async getRoleById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    logger.info('Fetching role by identifier:', {
      roleId: req.params.roleId,
    });

    try {
      const role = await this.service.getById(req.params.roleId);

      // Use BaseController's `sendOrNotFound` for missing data handling
      this.sendOrNotFound(
        role,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE,
        RESPONSE_MESSAGES.ERROR.ROLE_NOT_FOUND
      );
    } catch (error) {
      logger.error('Error fetching role:', { error });
      this.handleError(error, req, res);
    }
  }

  /**
   * Deletes a role by its identifier.
   */
  public async deleteRole(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    logger.info('Attempting to delete role:', {
      roleId: req.params.roleId,
    });

    try {
      await this.service.delete(req.params.roleId);

      logger.info('Role deleted successfully:', {
        roleId: req.params.roleId,
      });

      // Send no-content response for successful deletion
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      logger.error('Error deleting role:', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.ROLE_NOT_FOUND);
    }
  }
}

export default new RoleController();
