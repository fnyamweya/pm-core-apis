import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import ALLOWED_KINDS, { AllowedKind } from '../../constants/allowedKinds';
import { OrganizationUser } from '../../entities/organizations/organizationUserEntity';
import organizationUserService from '../../services/organizations/organizationUserService';
import { logger } from '../../utils/logger';
import BaseController from '../baseController';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE: 'Organization user membership created/updated successfully',
    RETRIEVE: 'Organization user membership retrieved successfully',
    UPDATE_STATUS: 'Organization user status updated successfully',
    REPLACE_ROLES: 'Organization user roles replaced successfully',
    REMOVE_ROLES: 'Organization user roles removed successfully',
    RESTORE: 'Organization user membership restored successfully',
  },
  ERROR: {
    NOT_FOUND: 'Organization user membership not found.',
    INVALID_INPUT: 'Invalid organization or user data.',
  },
};

/**
 * Handles Organization–User membership endpoints.
 * Uses BaseController helpers for sendSuccess / sendCreated / sendOrNotFound / handleError.
 */
class OrganizationUserController extends BaseController<OrganizationUser> {
  constructor() {
    super(organizationUserService, ALLOWED_KINDS.ORGANIZATION_USER.BASE as AllowedKind);
  }

  /**
   * Create or merge a membership with roles.
   * Body: { organizationId: string, userId: string, roles?: OrganizationUserRole[], status?: string }
   */
  public async addUserToOrganizationWithRoles(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      logger.info('Creating/updating OrganizationUser with roles', { body: req.body, params: req.params });
      const relation = await organizationUserService.addUserToOrganizationWithRoles({
        ...req.body,
        organizationId: req.params.organizationId,
      } as any);
      this.sendCreated(req, res, relation, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error) {
      logger.error('Error creating/updating OrganizationUser with roles:', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.INVALID_INPUT);
    }
  }

  /**
   * Backward-compatible create (delegates to service which merges roles if provided).
   * Body: { organization: { id }, user: { id }, roles?: OrganizationUserRole[], status?: string }
   */
  public async addUserToOrganization(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      logger.info('Creating OrganizationUser (compat body)', { body: req.body });
      const relation = await organizationUserService.addUserToOrganization(req.body);
      this.sendCreated(req, res, relation, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error) {
      logger.error('Error creating OrganizationUser:', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.INVALID_INPUT);
    }
  }

  /**
   * Get membership by composite keys.
   * Params: :organizationId, :userId
   */
  public async getMembership(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const { organizationId, userId } = req.params;
    try {
      logger.info('Fetching OrganizationUser membership', { organizationId, userId });
      const relation = await organizationUserService.getUserMembership(organizationId, userId);
      this.sendOrNotFound(
        relation,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE,
        RESPONSE_MESSAGES.ERROR.NOT_FOUND
      );
    } catch (error) {
      logger.error('Error fetching OrganizationUser membership:', { error });
      this.handleError(error, req, res);
    }
  }

  /**
   * Get membership by row ID (if you sometimes reference the join row directly).
   * Params: :id
   */
  public async getOrganizationUserById(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const { id } = req.params;
    try {
      logger.info('Fetching OrganizationUser by ID', { id });
      const relation = await organizationUserService.getById(id);
      this.sendOrNotFound(
        relation,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE,
        RESPONSE_MESSAGES.ERROR.NOT_FOUND
      );
    } catch (error) {
      logger.error('Error fetching OrganizationUser by ID:', { error });
      this.handleError(error, req, res);
    }
  }

  /**
   * Replace roles exactly (overwrite).
   * Body: { organizationId: string, userId: string, roles: OrganizationUserRole[] }
   */
  public async replaceRoles(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      logger.info('Replacing roles for OrganizationUser', { body: req.body });
      await organizationUserService.replaceRoles(req.body);
      this.sendSuccess(req, res, {}, RESPONSE_MESSAGES.SUCCESS.REPLACE_ROLES);
    } catch (error) {
      logger.error('Error replacing roles:', { error });
      this.handleError(error, req, res);
    }
  }

  /**
   * Remove specific roles (no-op if a role isn’t present).
   * Body: { organizationId: string, userId: string, roles: OrganizationUserRole[] }
   */
  public async removeRoles(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      logger.info('Removing roles for OrganizationUser', { body: req.body });
      await organizationUserService.removeRoles(req.body);
      this.sendSuccess(req, res, {}, RESPONSE_MESSAGES.SUCCESS.REMOVE_ROLES);
    } catch (error) {
      logger.error('Error removing roles:', { error });
      this.handleError(error, req, res);
    }
  }

  /**
   * Update membership status.
   * Params: :organizationId, :userId
   * Body: { status: string }
   */
  public async updateStatus(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const { organizationId, userId } = req.params;
    const { status } = req.body || {};
    try {
      logger.info('Updating OrganizationUser status', { organizationId, userId, status });
      await organizationUserService.updateStatus(organizationId, userId, status);
      this.sendSuccess(req, res, {}, RESPONSE_MESSAGES.SUCCESS.UPDATE_STATUS);
    } catch (error) {
      logger.error('Error updating OrganizationUser status:', { error });
      this.handleError(error, req, res);
    }
  }

  /**
   * Soft-delete membership (composite keys).
   * Params: :organizationId, :userId
   */
  public async softDeleteOrganizationUser(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const { organizationId, userId } = req.params;
    try {
      logger.info('Soft deleting OrganizationUser', { organizationId, userId });
      await organizationUserService.softDeleteOrganizationUser(organizationId, userId);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      logger.error('Error soft deleting OrganizationUser:', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  /**
   * Restore soft-deleted membership (composite keys).
   * Params: :organizationId, :userId
   */
  public async restoreOrganizationUser(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const { organizationId, userId } = req.params;
    try {
      logger.info('Restoring OrganizationUser', { organizationId, userId });
      await organizationUserService.restoreOrganizationUser(organizationId, userId);
      this.sendSuccess(req, res, {}, RESPONSE_MESSAGES.SUCCESS.RESTORE);
    } catch (error) {
      logger.error('Error restoring OrganizationUser:', { error });
      this.handleError(error, req, res);
    }
  }

  /**
   * List all users in an organization.
   * Params: :organizationId
   */
  public async listUsersByOrganization(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const { organizationId } = req.params;
    try {
      logger.info('Listing users for organization', { organizationId });
      const members = await organizationUserService.getUsersByOrganizationId(organizationId);
      this.sendSuccess(req, res, members, RESPONSE_MESSAGES.SUCCESS.RETRIEVE);
    } catch (error) {
      logger.error('Error listing organization users:', { error });
      this.handleError(error, req, res);
    }
  }
}

export default new OrganizationUserController();
