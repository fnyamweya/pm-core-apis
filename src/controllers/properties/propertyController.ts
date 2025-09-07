import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { Property } from '../../entities/properties/propertyEntity';
import propertyService from '../../services/properties/propertyService';
import ALLOWED_KINDS, { AllowedKind } from '../../constants/allowedKinds';
import BaseController from '../baseController';
import { logger } from '../../utils/logger';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE:        'Property created successfully',
    UPDATE:        'Property updated successfully',
    RETRIEVE:      'Property retrieved successfully',
    DELETE:        'Property deleted successfully',
    BY_CODE:       'Property retrieved by code successfully',
    BY_ORG:        'Properties by organization retrieved successfully',
    BY_OWNER:      'Properties by owner retrieved successfully',
    LISTED:        'Listed properties retrieved successfully',
    BY_CONFIG:     'Properties by config key/value retrieved successfully',
  },
  ERROR: {
    PROPERTY_NOT_FOUND: 'Property not found.',
    INVALID_INPUT:      'Invalid input data.',
  },
};

class PropertyController extends BaseController<Property> {
  constructor() {
    super(
      propertyService,
      'PROPERTY' as AllowedKind
    );
  }

  /** GET /properties (scoped)
   * If `organizationId` query or org header is provided (via orgScope middleware),
   * returns properties for that organization. Otherwise, if the user is authenticated
   * with organizationIds, returns properties for those organizations. Falls back to
   * generic pagination if no scoping info is present.
   */
  public async listScoped(req: Request, res: Response): Promise<void> {
    const { page, limit } = req.query as Record<string, string | undefined>;
    const options = { page: Number(page) || 1, limit: Number(limit) || 10 };
    const orgId = req.orgId as string | undefined;

    try {
      if (orgId) {
        const paged = await propertyService.getPaginated(
          options as any,
          { organization: { id: orgId } } as any,
          { organization: true } as any
        );
        return this.sendSuccess(
          req,
          res,
          paged.items,
          RESPONSE_MESSAGES.SUCCESS.BY_ORG,
          {
            page: paged.page,
            limit: paged.limit,
            total: paged.total,
            totalPages: paged.totalPages,
          }
        );
      }

      const userOrgIds = (req.user?.organizationIds || []) as string[];
      if (userOrgIds.length) {
        const list = await propertyService.getPropertiesByOrganizationIds(userOrgIds);
        return this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.BY_ORG);
      }

      // Fallback to generic paginated listing
      return super.getPaginated(req, res);
    } catch (error) {
      this.handleError(error as any, req, res);
    }
  }

  /** POST /properties */
  public async createProperty(req: Request, res: Response): Promise<void> {
    logger.info('Creating property', { body: req.body });
    try {
      const prop = await propertyService.createProperty(req.body);
      this.sendCreated(req, res, prop, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error: any) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.INVALID_INPUT);
    }
  }

  /** PUT /properties/:id */
  public async updateProperty(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Updating property', { propertyId: id, body: req.body });
    try {
      const updated = await propertyService.updateProperty(id, req.body);
      this.sendOrNotFound(
        updated,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.UPDATE,
        RESPONSE_MESSAGES.ERROR.PROPERTY_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /properties/:id */
  public async getPropertyById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Fetching property by ID', { propertyId: id });
    try {
      const prop = await propertyService.getById(id);
      this.sendOrNotFound(
        prop,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE,
        RESPONSE_MESSAGES.ERROR.PROPERTY_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** DELETE /properties/:id */
  public async deleteProperty(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Deleting property', { propertyId: id });
    try {
      await propertyService.deleteProperty(id);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.PROPERTY_NOT_FOUND);
    }
  }

  /** GET /properties/code/:code */
  public async getPropertyByCode(req: Request, res: Response): Promise<void> {
    const { code } = req.params;
    logger.info('Fetching property by code', { code });
    try {
      const prop = await propertyService.getPropertyByCode(code);
      this.sendOrNotFound(
        prop,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.BY_CODE,
        RESPONSE_MESSAGES.ERROR.PROPERTY_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /properties/organization/:organizationId */
  public async getPropertiesByOrganization(req: Request, res: Response): Promise<void> {
    const { organizationId } = req.params;
    logger.info('Fetching properties by organization', { organizationId });
    try {
      const list = await propertyService.getPropertiesByOrganization(organizationId);
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.BY_ORG);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /properties/owner/:ownerId */
  public async getPropertiesByOwner(req: Request, res: Response): Promise<void> {
    const { ownerId } = req.params;
    logger.info('Fetching properties by owner', { ownerId });
    try {
      const list = await propertyService.getPropertiesByOwner(ownerId);
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.BY_OWNER);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /properties/listed */
  public async getListedProperties(req: Request, res: Response): Promise<void> {
    logger.info('Fetching listed properties');
    try {
      const list = await propertyService.getListedProperties();
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.LISTED);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /properties/config?key=&value= */
  public async findByConfigKeyValue(req: Request, res: Response): Promise<void> {
    const { key, value } = req.query;
    if (typeof key !== 'string' || typeof value !== 'string') {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT
      );
    }
    logger.info('Finding properties by config key/value', { key, value });
    try {
      const list = await propertyService.findByConfigKeyValue(key, value);
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.BY_CONFIG);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * GET /properties/my-orgs?orgIds=a,b
   * Returns properties scoped to the caller's organizations.
   * If orgIds is provided, it must be a subset of req.user.organizationIds.
   */
  public async getPropertiesForUserOrganizations(req: Request, res: Response): Promise<void> {
    const userOrgIds = (req.user?.organizationIds || []) as string[];
    const orgIdsParam = (req.query.orgIds as string | undefined)?.trim();
    const filterIds = orgIdsParam ? orgIdsParam.split(',').map((s) => s.trim()).filter(Boolean) : userOrgIds;

    if (!userOrgIds.length) {
      return this.sendSuccess(req, res, [], RESPONSE_MESSAGES.SUCCESS.BY_ORG);
    }

    // Ensure requested IDs are subset of user's org IDs
    const invalid = filterIds.filter((id) => !userOrgIds.includes(id));
    if (invalid.length) {
      return this.sendError(
        req,
        res,
        httpStatus.FORBIDDEN,
        'FORBIDDEN_ORG_SCOPE',
        `You are not a member of organization(s): ${invalid.join(', ')}`
      );
    }

    logger.info('Fetching properties for user organizations', { userOrgIds, filterIds });
    try {
      const list = await propertyService.getPropertiesByOrganizationIds(filterIds);
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.BY_ORG);
    } catch (error) {
      this.handleError(error as any, req, res);
    }
  }
}

export default new PropertyController();
