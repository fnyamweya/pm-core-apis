import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status-codes';
import ALLOWED_KINDS from '../../constants/allowedKinds';
import { AllowedKind } from '../../constants/allowedKinds';
import { Location } from '../../entities/locations/locationEntity';
import locationService from '../../services/locations/locationService';
import BaseController from '../baseController';
import { logger } from '../../utils/logger';
import type { Polygon } from 'geojson';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE: 'Location created successfully',
    UPDATE: 'Location updated successfully',
    RETRIEVE: 'Location retrieved successfully',
    DELETE: 'Location deleted successfully',
    LIST: 'Locations retrieved successfully',
    MOVE: 'Location moved successfully',
    ATTACH_COMPONENTS: 'Address components attached successfully',
    GEOJSON: 'GeoJSON exported successfully',
    AREA: 'Geofence area computed successfully',
    TREE: 'Location tree retrieved successfully',
  },
  ERROR: {
    NOT_FOUND: 'Location not found.',
    INVALID_INPUT: 'Invalid input.',
  },
};

function toBool(v: unknown): boolean | undefined {
  if (v === undefined) return undefined;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(s)) return true;
  if (['false', '0', 'no', 'n'].includes(s)) return false;
  return undefined;
}

function toNum(v: unknown): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toStringOrArray(v: unknown): string | string[] | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? (v as string[]) : String(v);
}

class LocationController extends BaseController<Location> {
  constructor() {
    super(locationService, ALLOWED_KINDS.LOCATION.BASE as AllowedKind);
  }

  /** Create a new location */
  public async createLocation(req: Request, res: Response): Promise<void> {
    logger.info('Creating location', { body: req.body });
    try {
      const created = await locationService.createLocation(req.body);
      this.sendCreated(req, res, created, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error) {
      logger.error('Error creating location', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.INVALID_INPUT);
    }
  }

  /** Update location by ID */
  public async updateLocation(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Updating location', { id, body: req.body });
    try {
      const updated = await locationService.updateLocation(id, req.body);
      this.sendSuccess(req, res, updated, RESPONSE_MESSAGES.SUCCESS.UPDATE);
    } catch (error) {
      logger.error('Error updating location', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  /** Get location by ID (with parent/children relations) */
  public async getLocationById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Fetching location by ID', { id });
    try {
      const item = await locationService.getById(id);
      this.sendOrNotFound(
        item,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE,
        RESPONSE_MESSAGES.ERROR.NOT_FOUND
      );
    } catch (error) {
      logger.error('Error fetching location by ID', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  /** Delete location by ID */
  public async deleteLocation(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Deleting location', { id });
    try {
      await locationService.deleteLocation(id);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      logger.error('Error deleting location', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  /** List locations with filters + pagination */
  public async listLocations(req: Request, res: Response): Promise<void> {
    const {
      search,
      county,
      town,
      parentId,
      isRootOnly,
      hasGeofence,
      includeDeleted,
      page,
      pageSize,
      sort,
    } = req.query;

    const filter = {
      search: search ? String(search) : undefined,
      county: toStringOrArray(county),
      town: toStringOrArray(town),
      parentId: parentId === undefined ? undefined : (parentId === 'null' ? null : String(parentId)),
      isRootOnly: toBool(isRootOnly),
      hasGeofence: toBool(hasGeofence),
      includeDeleted: toBool(includeDeleted),
      page: toNum(page),
      pageSize: toNum(pageSize),
      sort: sort ? (String(sort) as any) : undefined,
    };

    logger.info('Listing locations', { filter });

    try {
      const result = await locationService.list(filter);
      this.sendSuccess(req, res, result, RESPONSE_MESSAGES.SUCCESS.LIST);
    } catch (error) {
      logger.error('Error listing locations', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.INVALID_INPUT);
    }
  }

  public async moveLocation(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { newParentId } = req.body as { newParentId: string | null };
    logger.info('Moving location', { id, newParentId });
    try {
      const moved = await locationService.move(id, newParentId ?? null);
      this.sendSuccess(req, res, moved, RESPONSE_MESSAGES.SUCCESS.MOVE);
    } catch (error) {
      logger.error('Error moving location', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  public async getSubtree(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Getting subtree', { id });
    try {
      const tree = await locationService.getSubtree(id);
      this.sendSuccess(req, res, tree, RESPONSE_MESSAGES.SUCCESS.TREE);
    } catch (error) {
      logger.error('Error getting subtree', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  public async getRootTrees(req: Request, res: Response): Promise<void> {
    logger.info('Getting root trees');
    try {
      const trees = await locationService.getRoots();
      this.sendSuccess(req, res, trees, RESPONSE_MESSAGES.SUCCESS.TREE);
    } catch (error) {
      logger.error('Error getting root trees', { error });
      this.handleError(error, req, res);
    }
  }

  public async getAncestors(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Getting ancestors', { id });
    try {
      const rows = await locationService.getAncestors(id);
      this.sendSuccess(req, res, rows, RESPONSE_MESSAGES.SUCCESS.TREE);
    } catch (error) {
      logger.error('Error getting ancestors', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  public async getDescendants(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Getting descendants', { id });
    try {
      const rows = await locationService.getDescendants(id);
      this.sendSuccess(req, res, rows, RESPONSE_MESSAGES.SUCCESS.TREE);
    } catch (error) {
      logger.error('Error getting descendants', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  public async findNearest(req: Request, res: Response): Promise<void> {
    const { lat, lng, limit, county } = req.query;
    const q = {
      lat: Number(lat),
      lng: Number(lng),
      limit: toNum(limit),
      county: toStringOrArray(county),
    };
    if (!Number.isFinite(q.lat) || !Number.isFinite(q.lng)) {
      return this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_INPUT', 'lat and lng are required');
    }
    logger.info('Finding nearest locations', { q });
    try {
      const rows = await locationService.findNearest(q);
      this.sendSuccess(req, res, rows, RESPONSE_MESSAGES.SUCCESS.RETRIEVE);
    } catch (error) {
      logger.error('Error finding nearest', { error });
      this.handleError(error, req, res);
    }
  }

  public async findWithinRadius(req: Request, res: Response): Promise<void> {
    const { lat, lng, radiusMeters, limit, county } = req.query;
    const q = {
      lat: Number(lat),
      lng: Number(lng),
      radiusMeters: Number(radiusMeters),
      limit: toNum(limit),
      county: toStringOrArray(county),
    };
    if (!Number.isFinite(q.lat) || !Number.isFinite(q.lng) || !Number.isFinite(q.radiusMeters)) {
      return this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_INPUT', 'lat, lng and radiusMeters are required');
    }
    logger.info('Finding locations within radius', { q });
    try {
      const rows = await locationService.findWithinRadius(q);
      this.sendSuccess(req, res, rows, RESPONSE_MESSAGES.SUCCESS.RETRIEVE);
    } catch (error) {
      logger.error('Error finding within radius', { error });
      this.handleError(error, req, res);
    }
  }

  public async findContainingPoint(req: Request, res: Response): Promise<void> {
    const { lat, lng, limit } = req.query;
    const q = { lat: Number(lat), lng: Number(lng), limit: toNum(limit) };
    if (!Number.isFinite(q.lat) || !Number.isFinite(q.lng)) {
      return this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_INPUT', 'lat and lng are required');
    }
    logger.info('Finding geofences containing point', { q });
    try {
      const rows = await locationService.findContainingPoint(q);
      this.sendSuccess(req, res, rows, RESPONSE_MESSAGES.SUCCESS.RETRIEVE);
    } catch (error) {
      logger.error('Error finding containing point', { error });
      this.handleError(error, req, res);
    }
  }

  public async findIntersectingPolygon(req: Request, res: Response): Promise<void> {
    const { polygon, limit } = req.body as { polygon: Polygon; limit?: number };
    if (!polygon) {
      return this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_INPUT', 'polygon is required');
    }
    logger.info('Finding locations intersecting polygon', { limit });
    try {
      const rows = await locationService.findIntersectingPolygon({ polygon, limit });
      this.sendSuccess(req, res, rows, RESPONSE_MESSAGES.SUCCESS.RETRIEVE);
    } catch (error) {
      logger.error('Error finding intersecting polygon', { error });
      this.handleError(error, req, res);
    }
  }

  public async getGeofenceArea(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Computing geofence area', { id });
    try {
      const area = await locationService.getGeofenceAreaSqMeters(id);
      this.sendSuccess(req, res, { id, area }, RESPONSE_MESSAGES.SUCCESS.AREA);
    } catch (error) {
      logger.error('Error computing geofence area', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  public async exportGeoJSON(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Exporting GeoJSON', { id });
    try {
      const payload = await locationService.exportGeoJSON(id);
      this.sendSuccess(req, res, payload, RESPONSE_MESSAGES.SUCCESS.GEOJSON);
    } catch (error) {
      logger.error('Error exporting GeoJSON', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  public async attachAddressComponents(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { components, replaceExisting } = req.body as {
      components: Array<{
        addressComponentId: string;
        label?: string | null;
        sequence?: number | null;
        isPrimary?: boolean | null;
        centerPoint?: any; // Point | {lat,lng} converted by service
        metadata?: Record<string, any> | null;
      }>;
      replaceExisting?: boolean;
    };

    if (!Array.isArray(components) || components.length === 0) {
      return this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_INPUT', 'components array is required');
    }

    logger.info('Attaching address components', { id, replaceExisting, count: components.length });

    try {
      await locationService.attachAddressComponents(id, components, { replaceExisting: !!replaceExisting });
      this.sendSuccess(req, res, {}, RESPONSE_MESSAGES.SUCCESS.ATTACH_COMPONENTS);
    } catch (error) {
      logger.error('Error attaching address components', { error });
      this.handleError(error, req, res);
    }
  }

  public async getAddressComponents(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Getting address components for location', { id });
    try {
      const rows = await locationService.getAddressComponents(id);
      this.sendSuccess(req, res, rows, RESPONSE_MESSAGES.SUCCESS.RETRIEVE);
    } catch (error) {
      logger.error('Error getting address components', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }
}

export default new LocationController();
