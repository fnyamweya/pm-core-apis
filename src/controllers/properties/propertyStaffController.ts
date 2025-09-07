import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { PropertyStaffEntity } from '../../entities/properties/propertyStaffEntity';
import propertyStaffService from '../../services/properties/propertyStaffService';
import ALLOWED_KINDS, { AllowedKind } from '../../constants/allowedKinds';
import BaseController from '../baseController';
import { logger } from '../../utils/logger';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE:         'Staff assignment created successfully',
    UPDATE:         'Staff assignment updated successfully',
    RETRIEVE:       'Staff assignment retrieved successfully',
    DELETE:         'Staff assignment deleted successfully',
    BY_PROPERTY:    'Staff for property retrieved successfully',
    BY_USER:        'Staff assignments for user retrieved successfully',
  },
  ERROR: {
    STAFF_NOT_FOUND: 'Staff assignment not found.',
    INVALID_INPUT:   'Invalid input data.',
  },
};

class PropertyStaffController extends BaseController<PropertyStaffEntity> {
  constructor() {
    super(
      propertyStaffService,
      'PROPERTY_STAFF' as AllowedKind
    );
  }

  /** POST /staff */
  public async createStaff(req: Request, res: Response): Promise<void> {
    logger.info('Creating property staff', { body: req.body });
    try {
      const staff = await propertyStaffService.createStaff(req.body);
      this.sendCreated(req, res, staff, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error: any) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.INVALID_INPUT);
    }
  }

  /** PUT /staff/:id */
  public async updateStaff(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Updating property staff', { staffId: id, body: req.body });
    try {
      const updated = await propertyStaffService.updateStaff(id, req.body);
      this.sendOrNotFound(
        updated,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.UPDATE,
        RESPONSE_MESSAGES.ERROR.STAFF_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** DELETE /staff/:id */
  public async deleteStaff(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Deleting property staff', { staffId: id });
    try {
      await propertyStaffService.deleteStaff(id);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.STAFF_NOT_FOUND);
    }
  }

  /** GET /staff/:id */
  public async getStaffById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Fetching property staff by ID', { staffId: id });
    try {
      const staff = await propertyStaffService.getById(id);
      this.sendOrNotFound(
        staff,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE,
        RESPONSE_MESSAGES.ERROR.STAFF_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /staff/property/:propertyId */
  public async getStaffByProperty(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    logger.info('Fetching staff for property', { propertyId });
    try {
      const list = await propertyStaffService.getStaffByProperty(propertyId);
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.BY_PROPERTY);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /staff/user/:userId */
  public async getStaffByUser(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    logger.info('Fetching staff assignments for user', { userId });
    try {
      const list = await propertyStaffService.getStaffByUser(userId);
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.BY_USER);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }
}

export default new PropertyStaffController();
