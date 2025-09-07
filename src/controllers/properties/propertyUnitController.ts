import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { PropertyUnit } from '../../entities/properties/propertyUnitEntity';
import propertyUnitService from '../../services/properties/propertyUnitService';
import ALLOWED_KINDS, { AllowedKind } from '../../constants/allowedKinds';
import BaseController from '../baseController';
import { logger } from '../../utils/logger';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE:          'Unit created successfully',
    UPDATE:          'Unit updated successfully',
    RETRIEVE:        'Unit retrieved successfully',
    DELETE:          'Unit deleted successfully',
    BY_PROPERTY:     'Units for property retrieved successfully',
    AVAILABLE:       'Available units retrieved successfully',
    BY_NUMBER:       'Unit retrieved by number successfully',
    OCCUPIED:        'Occupied units retrieved successfully',
    SEARCH:          'Units search results retrieved successfully',
  },
  ERROR: {
    UNIT_NOT_FOUND:  'Property unit not found.',
    INVALID_INPUT:   'Invalid input data.',
  },
};

class PropertyUnitController extends BaseController<PropertyUnit> {
  constructor() {
    super(
      propertyUnitService,
      'PROPERTY_UNIT' as AllowedKind
    );
  }

  /** POST /units */
  public async createUnit(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    logger.info('Creating property unit', { body: req.body, propertyId });
    try {
      const unit = await propertyUnitService.createUnit({
        ...req.body,
        propertyId,
      });
      this.sendCreated(req, res, unit, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error: any) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.INVALID_INPUT);
    }
  }

  /** PUT /units/:id */
  public async updateUnit(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Updating property unit', { unitId: id, body: req.body });
    try {
      const updated = await propertyUnitService.updateUnit(id, req.body);
      this.sendOrNotFound(
        updated,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.UPDATE,
        RESPONSE_MESSAGES.ERROR.UNIT_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /units/:id */
  public async getUnitById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Fetching property unit by ID', { unitId: id });
    try {
      const unit = await propertyUnitService.getById(id);
      this.sendOrNotFound(
        unit,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE,
        RESPONSE_MESSAGES.ERROR.UNIT_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** DELETE /units/:id */
  public async deleteUnit(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Deleting property unit', { unitId: id });
    try {
      await propertyUnitService.deleteUnit(id);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.UNIT_NOT_FOUND);
    }
  }

  /** GET /units/property/:propertyId */
  public async getUnitsByProperty(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    const {
      page,
      limit,
      orderBy,
      orderDir,
      search,
      onlyListed,
      onlyAvailable,
      onlyOccupied,
      includeLeases,
      includeRequests,
    } = req.query as Record<string, string | undefined>;

    const opts = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      orderBy: (orderBy as any) || undefined,
      orderDir: (orderDir as any) || undefined,
      search,
      onlyListed: onlyListed === 'true' ? true : onlyListed === 'false' ? false : undefined,
      onlyAvailable: onlyAvailable === 'true' ? true : onlyAvailable === 'false' ? false : undefined,
      onlyOccupied: onlyOccupied === 'true' ? true : onlyOccupied === 'false' ? false : undefined,
      include: {
        leases: includeLeases === 'true',
        requests: includeRequests === 'true',
      },
    } as any;

    logger.info('Fetching units for property', { propertyId, opts });
    try {
      const result = await propertyUnitService.getUnitsByProperty(propertyId, opts);
      const page = result.page || 1;
      const limit = result.limit || (Array.isArray(result.data) ? result.data.length : 1);
      const total = result.total ?? (Array.isArray(result.data) ? result.data.length : 0);
      const totalPages = Math.ceil((total || 1) / (limit || 1));
      this.sendSuccess(
        req,
        res,
        result.data,
        RESPONSE_MESSAGES.SUCCESS.BY_PROPERTY,
        { page, limit, total, totalPages }
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /units/property/:propertyId/available */
  public async getAvailableUnits(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    logger.info('Fetching available units', { propertyId });
    try {
      const list = await propertyUnitService.getAvailableUnits(propertyId);
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.AVAILABLE);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /units/property/:propertyId/number/:unitNumber */
  public async getUnitByNumber(req: Request, res: Response): Promise<void> {
    const { propertyId, unitNumber } = req.params;
    logger.info('Fetching unit by number', { propertyId, unitNumber });
    try {
      const unit = await propertyUnitService.getUnitByNumber(propertyId, unitNumber);
      this.sendOrNotFound(
        unit,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.BY_NUMBER,
        RESPONSE_MESSAGES.ERROR.UNIT_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /units/property/:propertyId/occupied */
  public async getOccupiedUnits(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    logger.info('Fetching occupied units', { propertyId });
    try {
      const list = await propertyUnitService.getOccupiedUnits(propertyId);
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.OCCUPIED);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /units/property/:propertyId/search?query=&limit= */
  public async searchUnits(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    const { query, limit } = req.query;
    if (typeof query !== 'string' || (limit !== undefined && isNaN(Number(limit)))) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT
      );
    }
    const max = limit ? Number(limit) : undefined;
    logger.info('Searching units', { propertyId, query, max });
    try {
      const list = await propertyUnitService.searchUnits(propertyId, query, max);
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.SEARCH);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }
}

export default new PropertyUnitController();
