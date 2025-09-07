import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import ALLOWED_KINDS, { AllowedKind } from '../../constants/allowedKinds';
import { LocationAddressComponent } from '../../entities/locations/locationAddressComponentEntity';
import locationAddressComponentService, {
  CreateLinkInput,
  UpdateLinkInput,
  BulkUpsertLinkInput,
} from '../../services/locations/locationAddressComponentService';
import BaseController from '../baseController';
import { logger } from '../../utils/logger';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE: 'Location-address component link created successfully',
    UPDATE: 'Location-address component link updated successfully',
    RETRIEVE: 'Location-address component link(s) retrieved successfully',
    DELETE: 'Location-address component link deleted successfully',
    BULK_DELETE: 'Location-address component links deleted successfully',
    UPSERT: 'Location-address component link upserted successfully',
    BULK_UPSERT: 'Location-address component links upserted successfully',
    REORDER: 'Sequences reordered successfully',
    CLEAR_GEOM: 'Center point cleared successfully',
  },
  ERROR: {
    NOT_FOUND: 'Location-address component link not found.',
    INVALID_INPUT: 'Invalid input.',
  },
};

/* ---------------- helpers ---------------- */
const toNum = (v: unknown): number | undefined => {
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const reqNum = (v: unknown, name: string): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number`);
  return n;
};
const reqStr = (v: unknown, name: string): string => {
  if (typeof v !== 'string' || !v.trim()) throw new Error(`${name} is required`);
  return v.trim();
};

class LocationAddressComponentController extends BaseController<LocationAddressComponent> {
  constructor() {
    super(
      locationAddressComponentService,
      (ALLOWED_KINDS as any).LOCATION_ADDRESS_COMPONENT?.BASE as AllowedKind
    );
  }

  /** Create a link */
  public async createLink(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as CreateLinkInput;
      if (!body?.locationId || !body?.addressComponentId) {
        return this.sendError(
          req,
          res,
          httpStatus.BAD_REQUEST,
          'INVALID_INPUT',
          'locationId and addressComponentId are required.'
        );
      }

      const created = await locationAddressComponentService.createLink(body);
      this.sendCreated(req, res, created, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error) {
      logger.error('Error creating LAC link', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.INVALID_INPUT);
    }
  }

  /** Update a link */
  public async updateLink(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const updated = await locationAddressComponentService.updateLink(id, req.body as UpdateLinkInput);
      this.sendOrNotFound(updated, req, res, RESPONSE_MESSAGES.SUCCESS.UPDATE, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    } catch (error) {
      logger.error('Error updating LAC link', { error });
      this.handleError(error, req, res);
    }
  }

  /** Delete a link */
  public async deleteLink(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      await locationAddressComponentService.deleteLink(id);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      logger.error('Error deleting LAC link', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  /** Bulk delete links */
  public async bulkDeleteLinks(req: Request, res: Response): Promise<void> {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_INPUT', '"ids" must be a non-empty array.');
    }
    try {
      await locationAddressComponentService.bulkDeleteLinks(ids);
      this.sendSuccess(req, res, {}, RESPONSE_MESSAGES.SUCCESS.BULK_DELETE);
    } catch (error) {
      logger.error('Error bulk deleting LAC links', { error });
      this.handleError(error, req, res);
    }
  }

  /** Get link by ID */
  public async getLinkById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const row = await locationAddressComponentService.getById(id);
      this.sendOrNotFound(row, req, res, RESPONSE_MESSAGES.SUCCESS.RETRIEVE, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    } catch (error) {
      logger.error('Error fetching LAC by ID', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  /** List links for a location */
  public async listByLocation(req: Request, res: Response): Promise<void> {
    const { locationId } = req.params;
    try {
      const rows = await locationAddressComponentService.getByLocation(locationId);
      this.sendSuccess(req, res, rows, RESPONSE_MESSAGES.SUCCESS.RETRIEVE);
    } catch (error) {
      logger.error('Error fetching LAC by location', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  /** List links for an address component */
  public async listByAddressComponent(req: Request, res: Response): Promise<void> {
    const { addressComponentId } = req.params;
    try {
      const rows = await locationAddressComponentService.getByAddressComponent(addressComponentId);
      this.sendSuccess(req, res, rows, RESPONSE_MESSAGES.SUCCESS.RETRIEVE);
    } catch (error) {
      logger.error('Error fetching LAC by address component', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  /** Get primary link for a location */
  public async getPrimaryForLocation(req: Request, res: Response): Promise<void> {
    const { locationId } = req.params;
    try {
      const row = await locationAddressComponentService.getPrimaryComponent(locationId);
      this.sendOrNotFound(
        row ?? undefined,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE,
        RESPONSE_MESSAGES.ERROR.NOT_FOUND
      );
    } catch (error) {
      logger.error('Error fetching primary LAC for location', { error });
      this.handleError(error, req, res);
    }
  }

  /** Reorder sequences for a location’s links (body: orderedLinkIds: string[]) */
  public async reorderSequences(req: Request, res: Response): Promise<void> {
    const { locationId } = req.params;
    const { orderedLinkIds } = req.body as { orderedLinkIds: string[] };
    if (!Array.isArray(orderedLinkIds) || orderedLinkIds.length === 0) {
      return this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_INPUT', '"orderedLinkIds" must be a non-empty array.');
    }
    try {
      await locationAddressComponentService.reorderSequences(locationId, orderedLinkIds);
      this.sendSuccess(req, res, {}, RESPONSE_MESSAGES.SUCCESS.REORDER);
    } catch (error) {
      logger.error('Error reordering sequences', { error });
      this.handleError(error, req, res);
    }
  }

  /** Upsert one link */
  public async upsertLink(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateLinkInput;
    if (!body?.locationId || !body?.addressComponentId) {
      return this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_INPUT', 'locationId and addressComponentId are required.');
    }
    try {
      const link = await locationAddressComponentService.upsertLink(body);
      this.sendSuccess(req, res, link, RESPONSE_MESSAGES.SUCCESS.UPSERT);
    } catch (error) {
      logger.error('Error upserting LAC link', { error });
      this.handleError(error, req, res);
    }
  }

  /** Bulk upsert links */
  public async bulkUpsertLinks(req: Request, res: Response): Promise<void> {
    const { rows } = req.body as { rows: BulkUpsertLinkInput[] };
    if (!Array.isArray(rows) || rows.length === 0) {
      return this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_INPUT', '"rows" must be a non-empty array.');
    }
    try {
      const result = await locationAddressComponentService.bulkUpsertLinks(rows);
      this.sendSuccess(req, res, result, RESPONSE_MESSAGES.SUCCESS.BULK_UPSERT);
    } catch (error) {
      logger.error('Error bulk upserting LAC links', { error });
      this.handleError(error, req, res);
    }
  }

  /** Clear geometry for a link */
  public async clearCenterPoint(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      await locationAddressComponentService.clearCenterPoint(id);
      this.sendSuccess(req, res, {}, RESPONSE_MESSAGES.SUCCESS.CLEAR_GEOM);
    } catch (error) {
      logger.error('Error clearing center point', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  /** Spatial: find links near a point (query: lat,lng,distanceMeters,limit?) */
  public async findComponentsNearPoint(req: Request, res: Response): Promise<void> {
    try {
      const lat = reqNum(req.query.lat, 'lat');
      const lng = reqNum(req.query.lng, 'lng');
      const distanceMeters = reqNum(req.query.distanceMeters, 'distanceMeters');
      const limit = toNum(req.query.limit) ?? 50;

      const rows = await locationAddressComponentService.findComponentsNearPoint(lat, lng, distanceMeters, limit);
      this.sendSuccess(req, res, rows, RESPONSE_MESSAGES.SUCCESS.RETRIEVE);
    } catch (error) {
      logger.error('Error finding components near point', { error });
      this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_INPUT', (error as Error).message);
    }
  }
}

export default new LocationAddressComponentController();
