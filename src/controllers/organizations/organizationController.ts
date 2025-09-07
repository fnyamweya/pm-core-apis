import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import ALLOWED_KINDS from '../../constants/allowedKinds';
import { Organization } from '../../entities/organizations/organizationEntity';
import organizationService from '../../services/organizations/organizationService';
import { logger } from '../../utils/logger';
import BaseController from '../baseController';
import { AllowedKind } from '../../constants/allowedKinds';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE: 'Organization created successfully',
    UPDATE: 'Organization updated successfully',
    RETRIEVE: 'Organization retrieved successfully',
    DELETE: 'Organization deleted successfully',
    RESTORE: 'Organization restored successfully',
  },
  ERROR: {
    ORGANIZATION_NOT_FOUND: 'Organization not found.',
    ORGANIZATION_EXISTS: 'An organization with this identifier already exists.',
  },
};

/**
 * OrganizationController handles organization-related requests, providing CRUD operations
 * and response handling, extending the BaseController.
 */
class OrganizationController extends BaseController<Organization> {
  constructor() {
    super(organizationService, ALLOWED_KINDS.ORGANIZATION.BASE as AllowedKind);
  }

  /**
   * Creates a new organization.
   */
  public async createOrganization(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    logger.info('Attempting to create a new organization', { body: req.body });

    try {
      const organization = await organizationService.createOrganization(
        req.body
      );
      logger.info('Organization created successfully:', organization);
      this.sendCreated(
        req,
        res,
        organization,
        RESPONSE_MESSAGES.SUCCESS.CREATE
      );
    } catch (error) {
      logger.error('Error creating organization:', { error });
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.ORGANIZATION_EXISTS
      );
    }
  }

  /**
   * Updates an organization by its ID.
   */
  public async updateOrganization(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { id } = req.params;
    logger.info('Attempting to update organization:', { id, body: req.body });

    try {
      await organizationService.updateOrganizationById(id, req.body);
      this.sendSuccess(req, res, {}, RESPONSE_MESSAGES.SUCCESS.UPDATE);
    } catch (error) {
      logger.error('Error updating organization:', { error });
      this.handleError(error, req, res);
    }
  }

  /**
   * Retrieves an organization by ID.
   */
  public async getOrganizationById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { id } = req.params;
    logger.info('Fetching organization by ID:', { id });

    try {
      const organization = await organizationService.getOrganizationById(id);
      this.sendOrNotFound(
        organization,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE,
        RESPONSE_MESSAGES.ERROR.ORGANIZATION_NOT_FOUND
      );
    } catch (error) {
      logger.error('Error fetching organization:', { error });
      this.handleError(error, req, res);
    }
  }

  /**
   * Deletes an organization by its ID.
   */
  public async deleteOrganization(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { id } = req.params;
    logger.info('Attempting to delete organization:', { id });

    try {
      await organizationService.deleteOrganizationById(id);
      logger.info('Organization deleted successfully:', { id });
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      logger.error('Error deleting organization:', { error });
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.ORGANIZATION_NOT_FOUND
      );
    }
  }

  /**
   * Soft deletes an organization by its ID.
   */
  public async softDeleteOrganization(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { id } = req.params;
    logger.info('Attempting to soft delete organization:', { id });

    try {
      await organizationService.softDeleteOrganization(id);
      logger.info('Organization soft deleted successfully:', { id });
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      logger.error('Error soft deleting organization:', { error });
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.ORGANIZATION_NOT_FOUND
      );
    }
  }

  /**
   * Restores a soft-deleted organization by its ID.
   */
  public async restoreOrganization(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { id } = req.params;
    logger.info('Attempting to restore organization:', { id });

    try {
      await organizationService.restoreOrganization(id);
      logger.info('Organization restored successfully:', { id });
      this.sendSuccess(req, res, {}, RESPONSE_MESSAGES.SUCCESS.RESTORE);
    } catch (error) {
      logger.error('Error restoring organization:', { error });
      this.handleError(error, req, res);
    }
  }

  /**
   * Retrieves an organization with all related entities by ID.
   */
  public async getOrganizationWithRelations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { id } = req.params;
    logger.info('Fetching organization with relations by ID:', { id });

    try {
      const organization =
        await organizationService.getOrganizationWithRelations(id);
      this.sendOrNotFound(
        organization,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE,
        RESPONSE_MESSAGES.ERROR.ORGANIZATION_NOT_FOUND
      );
    } catch (error) {
      logger.error('Error fetching organization with relations:', { error });
      this.handleError(error, req, res);
    }
  }
}

export default new OrganizationController();
