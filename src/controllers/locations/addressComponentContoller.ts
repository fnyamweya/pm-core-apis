import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import ALLOWED_KINDS, { AllowedKind } from '../../constants/allowedKinds';
import { AddressComponent } from '../../entities/locations/addressComponentEntity';
import addressComponentService, {
  CreateAddressComponentInput,
  UpdateAddressComponentInput,
  AddressComponentSearch,
} from '../../services/locations/addressComponentService';
import BaseController from '../baseController';
import { logger } from '../../utils/logger';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE: 'Address component created successfully',
    UPDATE: 'Address component updated successfully',
    RETRIEVE: 'Address component retrieved successfully',
    LIST: 'Address components retrieved successfully',
    DELETE: 'Address component deleted successfully',
    UPSERT: 'Address component upserted successfully',
    MOVE: 'Address component moved successfully',
    CHILDREN: 'Children retrieved successfully',
    ANCESTORS: 'Ancestors retrieved successfully',
    DESCENDANTS: 'Descendants retrieved successfully',
  },
  ERROR: {
    NOT_FOUND: 'Address component not found.',
    INVALID_INPUT: 'Invalid input.',
    DUPLICATE: 'An address component with these unique fields already exists.',
  },
};

/* ---------------- helpers ---------------- */

const toNum = (v: unknown): number | undefined => {
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const toStr = (v: unknown): string | undefined =>
  v === undefined || v === null ? undefined : String(v);
const toStrOrNull = (v: unknown): string | null | undefined =>
  v === undefined ? undefined : v === null || v === 'null' ? null : String(v);
const toArr = (v: unknown): string[] | undefined =>
  v === undefined ? undefined : Array.isArray(v) ? (v as string[]) : [String(v)];

/* ---------------- controller ---------------- */

class AddressComponentController extends BaseController<AddressComponent> {
  constructor() {
    super(addressComponentService, ALLOWED_KINDS.ADDRESS.ADDRESS_COMPONENT as AllowedKind);
  }

  /** Create */
  public async createAddressComponent(req: Request, res: Response): Promise<void> {
    const { type, value, parentId, metadata } = req.body as CreateAddressComponentInput;

    if (!type || !value) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        'Both "type" and "value" are required.'
      );
    }

    try {
      const created = await addressComponentService.createComponent({ type, value, parentId, metadata });
      this.sendCreated(req, res, created, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error) {
      logger.error('Error creating AddressComponent', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.DUPLICATE);
    }
  }

  /** Update */
  public async updateAddressComponent(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const update = req.body as UpdateAddressComponentInput;

    if (!update || Object.keys(update).length === 0) {
      return this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_INPUT', 'No update data provided.');
    }

    try {
      const updated = await addressComponentService.updateComponent(id, update);
      this.sendOrNotFound(updated, req, res, RESPONSE_MESSAGES.SUCCESS.UPDATE, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    } catch (error) {
      logger.error('Error updating AddressComponent', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  /** Get by ID */
  public async getAddressComponentById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const item = await addressComponentService.getById(id);
      this.sendOrNotFound(item, req, res, RESPONSE_MESSAGES.SUCCESS.RETRIEVE, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    } catch (error) {
      logger.error('Error fetching AddressComponent by ID', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  /** Get by (type, value) */
  public async getByTypeAndValue(req: Request, res: Response): Promise<void> {
    const type = toStr(req.query.type);
    const value = toStr(req.query.value);

    if (!type || !value) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        '"type" and "value" query params are required.'
      );
    }

    try {
      const row = await addressComponentService.getByTypeAndValue(type, value);
      this.sendOrNotFound(row, req, res, RESPONSE_MESSAGES.SUCCESS.RETRIEVE, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    } catch (error) {
      logger.error('Error fetching by type/value', { error });
      this.handleError(error, req, res);
    }
  }

  /** List by types */
  public async listByTypes(req: Request, res: Response): Promise<void> {
    const types = toArr(req.query.types);
    if (!types?.length) {
      return this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_INPUT', '"types" must be a non-empty array.');
    }

    try {
      const rows = await addressComponentService.listByTypes(types);
      this.sendSuccess(req, res, rows, RESPONSE_MESSAGES.SUCCESS.LIST);
    } catch (error) {
      logger.error('Error listing by types', { error });
      this.handleError(error, req, res);
    }
  }

  /** Get components linked to a location */
  public async getForLocation(req: Request, res: Response): Promise<void> {
    const { locationId } = req.params;
    try {
      const rows = await addressComponentService.getForLocation(locationId);
      this.sendSuccess(req, res, rows, RESPONSE_MESSAGES.SUCCESS.LIST);
    } catch (error) {
      logger.error('Error fetching components for location', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  /** Search + pagination */
  public async searchPaginated(req: Request, res: Response): Promise<void> {
    const opts: AddressComponentSearch = {
      q: toStr(req.query.q),
      type: req.query.type ? toArr(req.query.type) ?? undefined : undefined,
      parentId: toStrOrNull(req.query.parentId),
      page: toNum(req.query.page),
      limit: toNum(req.query.limit),
    };

    try {
      const result = await addressComponentService.searchPaginated(opts);
      this.sendSuccess(req, res, result, RESPONSE_MESSAGES.SUCCESS.LIST);
    } catch (error) {
      logger.error('Error searching AddressComponents', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.INVALID_INPUT);
    }
  }

  /** Delete */
  public async deleteAddressComponent(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      await addressComponentService.deleteComponent(id);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      logger.error('Error deleting AddressComponent', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  /** Bulk delete */
  public async bulkDelete(req: Request, res: Response): Promise<void> {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_INPUT', '"ids" must be a non-empty array.');
    }

    try {
      await addressComponentService.bulkDeleteComponents(ids);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      logger.error('Error bulk deleting AddressComponents', { error });
      this.handleError(error, req, res);
    }
  }

  /** Move (change parent) */
  public async move(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { newParentId } = req.body as { newParentId: string | null };
    try {
      const moved = await addressComponentService.move(id, newParentId ?? null);
      this.sendSuccess(req, res, moved, RESPONSE_MESSAGES.SUCCESS.MOVE);
    } catch (error) {
      logger.error('Error moving AddressComponent', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  /** Hierarchy */
  public async getChildren(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const rows = await addressComponentService.getChildren(id);
      this.sendSuccess(req, res, rows, RESPONSE_MESSAGES.SUCCESS.CHILDREN);
    } catch (error) {
      logger.error('Error getting children', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }
  public async getAncestors(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const rows = await addressComponentService.getAncestors(id);
      this.sendSuccess(req, res, rows, RESPONSE_MESSAGES.SUCCESS.ANCESTORS);
    } catch (error) {
      logger.error('Error getting ancestors', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }
  public async getDescendants(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const rows = await addressComponentService.getDescendants(id);
      this.sendSuccess(req, res, rows, RESPONSE_MESSAGES.SUCCESS.DESCENDANTS);
    } catch (error) {
      logger.error('Error getting descendants', { error });
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.NOT_FOUND);
    }
  }

  /** Upsert single */
  public async upsertByTypeValueParent(req: Request, res: Response): Promise<void> {
    const { type, value, parentId, metadata } = req.body as CreateAddressComponentInput;
    if (!type || !value) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        '"type" and "value" are required.'
      );
    }

    try {
      const row = await addressComponentService.upsertByTypeValueParent({ type, value, parentId, metadata });
      this.sendSuccess(req, res, row, RESPONSE_MESSAGES.SUCCESS.UPSERT);
    } catch (error) {
      logger.error('Error upserting AddressComponent', { error });
      this.handleError(error, req, res);
    }
  }

  /** Bulk upsert */
  public async bulkUpsert(req: Request, res: Response): Promise<void> {
    const { rows } = req.body as { rows: Array<CreateAddressComponentInput | UpdateAddressComponentInput> };
    if (!Array.isArray(rows) || rows.length === 0) {
      return this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_INPUT', '"rows" must be a non-empty array.');
    }

    try {
      const result = await addressComponentService.bulkUpsert(rows);
      this.sendSuccess(req, res, result, RESPONSE_MESSAGES.SUCCESS.UPSERT);
    } catch (error) {
      logger.error('Error bulk upserting AddressComponents', { error });
      this.handleError(error, req, res);
    }
  }
}

export default new AddressComponentController();
