import {
  PropertyRequestEntity,
  MaintenanceStatus,
  MaintenancePriority,
} from '../../entities/properties/propertyRequestEntity';
import propertyRequestRepository from '../../repositories/properties/propertyRequestRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

interface CreateRequestDTO {
  propertyId: string;
  unitId?: string;
  requesterId: string;
  assigneeId?: string;
  title: string;
  description: string;
  priority?: MaintenancePriority;
  status?: MaintenanceStatus;
  attachments?: string[];
  metadata?: Record<string, any>;
}

interface UpdateRequestDTO {
  assigneeId?: string;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  description?: string;
}

class PropertyRequestService extends BaseService<PropertyRequestEntity> {
  private listCache = new RedisCache<PropertyRequestEntity[]>(3600);

  constructor() {
    super(
      {
        repository: propertyRequestRepository,
        redisCache: new RedisCache<PropertyRequestEntity>(3600),
        logger,
      },
      'propertyRequest'
    );
    this.logger.info('PropertyRequestService initialized');
  }

  private listCacheKey(prefix: string, id: string): string {
    return `${prefix}:${id}`;
  }

  /**
   * Create a new maintenance request.
   */
  async createRequest(data: CreateRequestDTO): Promise<PropertyRequestEntity> {
    this.logger.info('Creating maintenance request', data);
    const req = await this.repository.create({
      property:  { id: data.propertyId }   as any,
      unit:      data.unitId ? ({ id: data.unitId } as any) : undefined,
      requester: { id: data.requesterId }  as any,
      assignee:  data.assigneeId
        ? ({ id: data.assigneeId } as any)
        : undefined,
      title:       data.title,
      description: data.description,
      priority:    data.priority,
      status:      data.status,
      attachments: data.attachments,
      metadata:    data.metadata,
    });

    // Invalidate any cached lists for this property
    await this.listCache.deleteKey('requestsByProperty', data.propertyId);
    return req;
  }

  /**
   * Update an existing maintenance request.
   */
  async updateRequest(
    requestId: string,
    data: UpdateRequestDTO
  ): Promise<PropertyRequestEntity> {
    this.logger.info('Updating maintenance request', { requestId, ...data });
    // If changing assignee, convert id
    const payload: Partial<PropertyRequestEntity> = {
      description: data.description,
      status:      data.status,
      priority:    data.priority,
    };
    if ('assigneeId' in data) {
      payload.assignee = data.assigneeId
        ? ({ id: data.assigneeId } as any)
        : null;
    }
    await this.repository.update(requestId, payload as any);

    const updated = await this.getById(requestId);
    return updated;
  }

  /**
   * Delete a maintenance request.
   */
  async deleteRequest(requestId: string): Promise<void> {
    this.logger.info('Deleting maintenance request', { requestId });
    const req = await this.getById(requestId);
    await this.repository.delete(requestId);
    // Invalidate that property's list cache
    await this.listCache.deleteKey('requestsByProperty', req.property.id);
  }

  /**
   * Get all requests for a property, with caching.
   */
  async getRequestsByProperty(propertyId: string): Promise<PropertyRequestEntity[]> {
    this.logger.info('Fetching requests by property', { propertyId });
    const key = this.listCacheKey('requestsByProperty', propertyId);
    let list = await this.listCache.getFromCache('requestsByProperty', key);
    if (!list) {
      list = await propertyRequestRepository.getRequestsByProperty(propertyId);
      await this.listCache.setToCache('requestsByProperty', key, list);
    }
    return list;
  }

  /**
   * Get all requests for a unit.
   */
  async getRequestsByUnit(unitId: string): Promise<PropertyRequestEntity[]> {
    this.logger.info('Fetching requests by unit', { unitId });
    return propertyRequestRepository.getRequestsByUnit(unitId);
  }

  /**
   * Get requests by status.
   */
  async getRequestsByStatus(
    propertyId: string,
    status: MaintenanceStatus
  ): Promise<PropertyRequestEntity[]> {
    this.logger.info('Fetching requests by status', { propertyId, status });
    return propertyRequestRepository.getRequestsByStatus(propertyId, status);
  }

  /**
   * Get open (pending or in-progress) requests.
   */
  async getOpenRequests(propertyId: string): Promise<PropertyRequestEntity[]> {
    this.logger.info('Fetching open requests', { propertyId });
    return propertyRequestRepository.getOpenRequests(propertyId);
  }

  /**
   * Get unassigned requests.
   */
  async getUnassignedRequests(propertyId: string): Promise<PropertyRequestEntity[]> {
    this.logger.info('Fetching unassigned requests', { propertyId });
    return propertyRequestRepository.getUnassignedRequests(propertyId);
  }

  /**
   * Get high-priority or urgent requests.
   */
  async getPriorityRequests(propertyId: string): Promise<PropertyRequestEntity[]> {
    this.logger.info('Fetching priority requests', { propertyId });
    return propertyRequestRepository.getPriorityRequests(propertyId);
  }

  /**
   * Get requests created in the last `days` days.
   */
  async getRecentRequests(
    propertyId: string,
    days = 7
  ): Promise<PropertyRequestEntity[]> {
    this.logger.info('Fetching recent requests', { propertyId, days });
    return propertyRequestRepository.getRecentRequests(propertyId, days);
  }

  /**
   * Get requests for an organization or set of organizations.
   */
  async getRequestsByOrganization(orgId: string): Promise<PropertyRequestEntity[]> {
    this.logger.info('Fetching requests by organization', { orgId });
    return propertyRequestRepository.getRequestsByOrganizationId(orgId);
  }

  async getRequestsByOrganizationIds(orgIds: string[]): Promise<PropertyRequestEntity[]> {
    this.logger.info('Fetching requests by organizations', { orgIds });
    return propertyRequestRepository.getRequestsByOrganizationIds(orgIds);
  }
}

export default new PropertyRequestService();
