import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import ALLOWED_KINDS from '../../constants/allowedKinds';
import { OrganizationType } from '../../entities/organizations/organizationTypeEntity';
import organizationTypeService from '../../services/organizations/organizationTypeService';
import BaseController from '../baseController';
import { AllowedKind } from '../../constants/allowedKinds';


const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE: 'Organization type created successfully',
    UPDATE: 'Organization type updated successfully',
    RETRIEVE: 'Organization type retrieved successfully',
    DELETE: 'Organization type deleted successfully',
  },
  ERROR: {
    TYPE_NOT_FOUND: 'Organization type not found.',
    TYPE_EXISTS: 'An organization type with this name already exists.',
    INVALID_NAME: 'Organization type name is required.',
  },
};

class OrganizationTypeController extends BaseController<OrganizationType> {
  constructor() {
    super(organizationTypeService, ALLOWED_KINDS.ORGANIZATION_TYPE.BASE as AllowedKind);
  }

  /**
   * Creates a new organization type.
   */
  public async createOrganizationType(
    req: Request,
    res: Response
  ): Promise<void> {
    const { name, description, isActive } = req.body;

    if (!name) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_NAME
      );
    }

    try {
      const organizationType =
        await organizationTypeService.createOrganizationType({
          name,
          description,
          isActive,
        });

      this.sendCreated(
        req,
        res,
        organizationType,
        RESPONSE_MESSAGES.SUCCESS.CREATE
      );
    } catch (error) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.TYPE_EXISTS);
    }
  }

  /**
   * Updates an existing organization type.
   */
  public async updateOrganizationType(
    req: Request,
    res: Response
  ): Promise<void> {
    const { id } = req.params;
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
      const updatedOrganizationType =
        await organizationTypeService.updateOrganizationType(id, updateData);
      this.sendOrNotFound(
        updatedOrganizationType,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.UPDATE
      );
    } catch (error) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.TYPE_NOT_FOUND);
    }
  }

  /**
   * Retrieves an organization type by its ID.
   */
  public async getOrganizationTypeById(
    req: Request,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    try {
      const organizationType = await organizationTypeService.getById(id);
      this.sendOrNotFound(
        organizationType,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE
      );
    } catch (error) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.TYPE_NOT_FOUND);
    }
  }

  /**
   * Retrieves an organization type by its name.
   */
  public async getOrganizationTypeByName(
    req: Request,
    res: Response
  ): Promise<void> {
    const { name } = req.query;

    if (!name) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_NAME
      );
    }

    try {
      const organizationType =
        await organizationTypeService.getOrganizationTypeByName(name as string);
      this.sendOrNotFound(
        organizationType,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE
      );
    } catch (error) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.TYPE_NOT_FOUND);
    }
  }

  /**
   * Retrieves active organization types.
   */
  public async getActiveOrganizationTypes(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const organizationTypes =
        await organizationTypeService.getActiveOrganizationTypes();
      this.sendSuccess(
        req,
        res,
        organizationTypes,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE
      );
    } catch (error) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.TYPE_NOT_FOUND);
    }
  }

  /**
   * Deletes an organization type by its ID.
   */
  public async deleteOrganizationType(
    req: Request,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    try {
      await organizationTypeService.deleteOrganizationType(id);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.TYPE_NOT_FOUND);
    }
  }
}

export default new OrganizationTypeController();
