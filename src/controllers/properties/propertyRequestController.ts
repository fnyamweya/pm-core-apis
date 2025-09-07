import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import {
  PropertyRequestEntity,
  MaintenanceStatus,
  MaintenancePriority,
} from '../../entities/properties/propertyRequestEntity';
import propertyRequestService from '../../services/properties/propertyRequestService';
import ALLOWED_KINDS, { AllowedKind } from '../../constants/allowedKinds';
import BaseController from '../baseController';
import { logger } from '../../utils/logger';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE:           'Maintenance request created successfully',
    UPDATE:           'Maintenance request updated successfully',
    RETRIEVE:         'Maintenance request retrieved successfully',
    DELETE:           'Maintenance request deleted successfully',
    LIST_BY_PROPERTY: 'Requests for property retrieved successfully',
    LIST_BY_UNIT:     'Requests for unit retrieved successfully',
    BY_STATUS:        'Requests by status retrieved successfully',
    OPEN:             'Open requests retrieved successfully',
    UNASSIGNED:       'Unassigned requests retrieved successfully',
    PRIORITY:         'Priority requests retrieved successfully',
    RECENT:           'Recent requests retrieved successfully',
  },
  ERROR: {
    REQUEST_NOT_FOUND: 'Maintenance request not found.',
    INVALID_INPUT:     'Invalid input data.',
  },
};

class PropertyRequestController extends BaseController<PropertyRequestEntity> {
  constructor() {
    super(
      propertyRequestService,
      // cast until you add PROPERTY.REQUEST to ALLOWED_KINDS
      'PROPERTY_REQUEST' as AllowedKind
    );
  }

  /** GET /properties/requests/my-orgs (scoped)
   * Lists maintenance requests across the selected org or all user's orgs.
   */
  public async listRequestsForUserOrganizations(req: Request, res: Response): Promise<void> {
    const orgId = req.orgId as string | undefined;
    const userOrgIds = (req.user?.organizationIds || []) as string[];
    try {
      if (orgId) {
        const list = await propertyRequestService.getRequestsByOrganization(orgId);
        return this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.LIST_BY_PROPERTY);
      }
      if (userOrgIds.length) {
        const list = await propertyRequestService.getRequestsByOrganizationIds(userOrgIds);
        return this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.LIST_BY_PROPERTY);
      }
      return this.sendSuccess(req, res, [], RESPONSE_MESSAGES.SUCCESS.LIST_BY_PROPERTY);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** POST /requests */
  public async createRequest(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    logger.info('Creating maintenance request', { body: req.body, propertyId });
    try {
      const request = await propertyRequestService.createRequest({
        ...req.body,
        propertyId,
      });
      this.sendCreated(req, res, request, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error: any) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.INVALID_INPUT);
    }
  }

  /** PUT /requests/:id */
  public async updateRequest(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Updating maintenance request', { requestId: id, body: req.body });
    try {
      const updated = await propertyRequestService.updateRequest(id, req.body);
      this.sendOrNotFound(
        updated,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.UPDATE,
        RESPONSE_MESSAGES.ERROR.REQUEST_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** DELETE /requests/:id */
  public async deleteRequest(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Deleting maintenance request', { requestId: id });
    try {
      await propertyRequestService.deleteRequest(id);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.REQUEST_NOT_FOUND);
    }
  }

  /** GET /requests/:id */
  public async getRequestById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Fetching maintenance request by ID', { requestId: id });
    try {
      const request = await propertyRequestService.getById(id);
      this.sendOrNotFound(
        request,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE,
        RESPONSE_MESSAGES.ERROR.REQUEST_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /requests/property/:propertyId */
  public async getRequestsByProperty(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    logger.info('Fetching requests for property', { propertyId });
    try {
      const list = await propertyRequestService.getRequestsByProperty(propertyId);
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.LIST_BY_PROPERTY);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /requests/unit/:unitId */
  public async getRequestsByUnit(req: Request, res: Response): Promise<void> {
    const { unitId } = req.params;
    logger.info('Fetching requests for unit', { unitId });
    try {
      const list = await propertyRequestService.getRequestsByUnit(unitId);
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.LIST_BY_UNIT);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /requests/property/:propertyId/status/:status */
  public async getRequestsByStatus(req: Request, res: Response): Promise<void> {
    const { propertyId, status } = req.params;
    logger.info('Fetching requests by status', { propertyId, status });
    try {
      const list = await propertyRequestService.getRequestsByStatus(
        propertyId,
        status as MaintenanceStatus
      );
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.BY_STATUS);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /requests/property/:propertyId/open */
  public async getOpenRequests(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    logger.info('Fetching open requests', { propertyId });
    try {
      const list = await propertyRequestService.getOpenRequests(propertyId);
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.OPEN);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /requests/property/:propertyId/unassigned */
  public async getUnassignedRequests(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    logger.info('Fetching unassigned requests', { propertyId });
    try {
      const list = await propertyRequestService.getUnassignedRequests(propertyId);
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.UNASSIGNED);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /requests/property/:propertyId/priority */
  public async getPriorityRequests(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    logger.info('Fetching priority requests', { propertyId });
    try {
      const list = await propertyRequestService.getPriorityRequests(propertyId);
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.PRIORITY);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /requests/property/:propertyId/recent?days=7 */
  public async getRecentRequests(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    const days = Number(req.query.days) || 7;
    if (isNaN(days) || days < 0) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT
      );
    }
    logger.info('Fetching recent requests', { propertyId, days });
    try {
      const list = await propertyRequestService.getRecentRequests(propertyId, days);
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.RECENT);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }
}

export default new PropertyRequestController();
