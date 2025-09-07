import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { PropertyOwnerEntity } from '../../entities/properties/propertyOwnerEntity';
import propertyOwnerService from '../../services/properties/propertyOwnerService';
import ALLOWED_KINDS, { AllowedKind } from '../../constants/allowedKinds';
import BaseController from '../baseController';
import { logger } from '../../utils/logger';
import { OwnerRole } from '../../entities/properties/propertyOwnerEntity';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE:            'Property owner added successfully',
    UPDATE:            'Property owner updated successfully',
    RETRIEVE:          'Property owner retrieved successfully',
    DELETE:            'Property owner removed successfully',
    LIST_BY_PROPERTY:  'Owners for property retrieved successfully',
    BY_USER:           'Owner for user retrieved successfully',
    LANDLORDS_BY_ROLE: 'Landlords by role retrieved successfully',
  },
  ERROR: {
    OWNER_NOT_FOUND:   'Property owner not found.',
    INVALID_INPUT:     'Invalid input data.',
    ROLE_REQUIRED:     'Owner role is required.',
  },
};

class PropertyOwnerController extends BaseController<PropertyOwnerEntity> {
  constructor() {
    super(
      propertyOwnerService,
      'OWNER' as AllowedKind
    );
  }

  /** POST /owners */
  public async createOwner(req: Request, res: Response): Promise<void> {
    logger.info('Creating property owner', { body: req.body });
    try {
      const owner = await propertyOwnerService.createOwner(req.body);
      this.sendCreated(req, res, owner, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error: any) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.INVALID_INPUT);
    }
  }

  /** PUT /owners/:id */
  public async updateOwner(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Updating property owner', { ownerId: id, body: req.body });
    try {
      const updated = await propertyOwnerService.updateOwner(id, req.body);
      this.sendOrNotFound(
        updated,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.UPDATE,
        RESPONSE_MESSAGES.ERROR.OWNER_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** DELETE /owners/:id */
  public async deleteOwner(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Deleting property owner', { ownerId: id });
    try {
      await propertyOwnerService.deleteOwner(id);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.OWNER_NOT_FOUND);
    }
  }

  /** GET /owners/:id */
  public async getOwnerById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Fetching property owner by ID', { ownerId: id });
    try {
      const owner = await propertyOwnerService.getById(id);
      this.sendOrNotFound(
        owner,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE,
        RESPONSE_MESSAGES.ERROR.OWNER_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /owners/property/:propertyId */
  public async getOwnersByProperty(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    logger.info('Fetching owners for property', { propertyId });
    try {
      const owners = await propertyOwnerService.getOwnersByProperty(propertyId);
      this.sendSuccess(req, res, owners, RESPONSE_MESSAGES.SUCCESS.LIST_BY_PROPERTY);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /owners/user/:userId */
  public async getOwnerByUser(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    logger.info('Fetching owner by user', { userId });
    try {
      const owner = await propertyOwnerService.getOwnerByUser(userId);
      this.sendOrNotFound(
        owner,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.BY_USER,
        RESPONSE_MESSAGES.ERROR.OWNER_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /owners/landlords/:role */
  public async getLandlordsByRole(req: Request, res: Response): Promise<void> {
    const { role } = req.params;
    if (!role) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'ROLE_REQUIRED',
        RESPONSE_MESSAGES.ERROR.ROLE_REQUIRED
      );
    }
    logger.info('Fetching landlords by role', { role });
    try {
      const landlords = await propertyOwnerService.getLandlordsByRole(role as OwnerRole);
      this.sendSuccess(req, res, landlords, RESPONSE_MESSAGES.SUCCESS.LANDLORDS_BY_ROLE);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }
}

export default new PropertyOwnerController();
