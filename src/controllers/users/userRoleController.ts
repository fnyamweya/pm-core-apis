import { NextFunction, Request, Response } from 'express';
import ALLOWED_KINDS from '../../constants/allowedKinds';
import { BaseService } from '../../services/baseService';
import userRoleService from '../../services/users/userRoleService';
import BaseController from '../baseController';
import { AllowedKind } from '../../constants/allowedKinds';


/**
 * UserRoleController manages CRUD operations and validation
 * for user roles, leveraging BaseController functionality.
 */
class UserRoleController extends BaseController<any> {
  constructor() {
    super(
      userRoleService as unknown as BaseService<any>,
      ALLOWED_KINDS.ROLE.BASE as AllowedKind
    ); 
  }

  /**
   * Adds a role to a specific user.
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function for error handling
   */
  public async addUserRole(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const { roleId } = req.body;

      if (!userId || !roleId) {
        return this.sendError(
          req,
          res,
          400,
          'INVALID_INPUT',
          'userId and roleId are required.'
        );
      }

      const result = await userRoleService.createUserRole({ userId, roleId });
      this.sendSuccess(req, res, result, 'User role added successfully');
    } catch (error) {
      this.handleException(error, req, res);
    }
  }

  /**
   * Retrieves all roles for a specific user.
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function for error handling
   */
  public async getUserRoles(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        return this.sendError(
          req,
          res,
          400,
          'INVALID_INPUT',
          'userId is required.'
        );
      }

      const roles = await userRoleService.getRolesByUserId(userId);
      this.sendSuccess(req, res, roles, 'User roles retrieved successfully');
    } catch (error) {
      this.handleException(error, req, res);
    }
  }

  /**
   * Removes a specific role from a user.
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function for error handling
   */
  public async removeUserRole(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId, roleId } = req.params;

      if (!userId || !roleId) {
        return this.sendError(
          req,
          res,
          400,
          'INVALID_INPUT',
          'userId and roleId are required.'
        );
      }

      await userRoleService.deleteUserRole(userId, roleId);
      this.sendSuccess(req, res, {}, 'User role removed successfully');
    } catch (error) {
      this.handleException(error, req, res);
    }
  }

  /**
   * Removes all roles from a specific user.
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function for error handling
   */
  public async removeAllUserRoles(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        return this.sendError(
          req,
          res,
          400,
          'INVALID_INPUT',
          'userId is required.'
        );
      }

      await userRoleService.removeAllRolesFromUser(userId);
      this.sendSuccess(req, res, {}, 'All user roles removed successfully');
    } catch (error) {
      this.handleException(error, req, res);
    }
  }
}

export default new UserRoleController();
