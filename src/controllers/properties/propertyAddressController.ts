import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { PropertyAddressEntity } from '../../entities/properties/propertyAddressEntity';
import propertyAddressService from '../../services/properties/propertyAddressService';
import ALLOWED_KINDS, { AllowedKind } from '../../constants/allowedKinds';
import BaseController from '../baseController';
import { logger } from '../../utils/logger';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE:         'Address created successfully',
    UPDATE:         'Address updated successfully',
    RETRIEVE:       'Address retrieved successfully',
    DELETE:         'Address deleted successfully',
    LIST_BY_PROP:   'Addresses retrieved successfully',
    BY_LABEL:       'Address retrieved successfully',
    FIND_NEARBY:    'Nearby addresses retrieved successfully',
  },
  ERROR: {
    ADDRESS_NOT_FOUND: 'Address not found.',
    INVALID_INPUT:     'Invalid input data.',
  },
};

/**
 * PropertyAddressController handles all property-address–
 * related HTTP requests, extending the BaseController.
 */
class PropertyAddressController extends BaseController<PropertyAddressEntity> {
  constructor() {
    super(
      propertyAddressService,
      ALLOWED_KINDS.PROPERTY.ADDRESS as AllowedKind
    );
  }

  /**
   * Create a new property address.
   */
  public async createAddress(req: Request, res: Response): Promise<void> {
    logger.info('Attempting to create a new property address', { body: req.body });
    try {
      const address = await this.service.create(req.body);
      this.sendCreated(req, res, address, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error: any) {
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT
      );
    }
  }

  /**
   * Update an existing address by its ID.
   */
  public async updateAddress(req: Request, res: Response): Promise<void> {
    logger.info('Attempting to update property address', {
      addressId: req.params.id,
      body: req.body,
    });
    try {
      const updated = await this.service.update(req.params.id, req.body);
      this.sendOrNotFound(
        updated,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.UPDATE,
        RESPONSE_MESSAGES.ERROR.ADDRESS_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Retrieve a single address by its ID.
   */
  public async getAddressById(req: Request, res: Response): Promise<void> {
    logger.info('Fetching property address by ID', { addressId: req.params.id });
    try {
      const address = await this.service.getById(req.params.id);
      this.sendOrNotFound(
        address,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE,
        RESPONSE_MESSAGES.ERROR.ADDRESS_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Delete an address by its ID.
   */
  public async deleteAddress(req: Request, res: Response): Promise<void> {
    logger.info('Attempting to delete property address', { addressId: req.params.id });
    try {
      await this.service.delete(req.params.id);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.ADDRESS_NOT_FOUND
      );
    }
  }

  /**
   * List all addresses for a given property.
   */
  public async getAddressesByProperty(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    logger.info('Fetching addresses for property', { propertyId });
    try {
      const addresses = await propertyAddressService.getAddressesByProperty(propertyId);
      this.sendSuccess(
        req,
        res,
        addresses,
        RESPONSE_MESSAGES.SUCCESS.LIST_BY_PROP
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Retrieve a single address by propertyId and label.
   */
  public async getAddressByLabel(req: Request, res: Response): Promise<void> {
    const { propertyId, label } = req.params;
    logger.info('Fetching address by label', { propertyId, label });
    try {
      const address = await propertyAddressService.getAddressByLabel(propertyId, label);
      this.sendOrNotFound(
        address,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.BY_LABEL,
        RESPONSE_MESSAGES.ERROR.ADDRESS_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /**
   * Find all addresses within a radius (km) of a lat/lng point.
   */
  public async findNearbyAddresses(req: Request, res: Response): Promise<void> {
    const { latitude, longitude, radiusKm } = req.query;
    if (
      typeof latitude !== 'string' ||
      typeof longitude !== 'string' ||
      typeof radiusKm !== 'string'
    ) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT
      );
    }

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    const radiusNum = parseFloat(radiusKm);

    logger.info('Finding nearby addresses', { latNum, lngNum, radiusNum });
    try {
      const nearby = await propertyAddressService.findNearbyAddresses(
        latNum,
        lngNum,
        radiusNum
      );
      this.sendSuccess(
        req,
        res,
        nearby,
        RESPONSE_MESSAGES.SUCCESS.FIND_NEARBY
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }
}

export default new PropertyAddressController();
