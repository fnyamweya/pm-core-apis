import {
  PropertyRequestEntity,
  MaintenanceStatus,
  MaintenancePriority,
} from '../../entities/properties/propertyRequestEntity';
import BaseRepository from '../baseRepository';
import { logger } from '../../utils/logger';
import { Raw, IsNull } from 'typeorm';

class PropertyRequestRepository extends BaseRepository<PropertyRequestEntity> {
  constructor() {
    super(PropertyRequestEntity);
  }

  /**
   * Get all maintenance requests across an organization.
   */
  async getRequestsByOrganizationId(orgId: string): Promise<PropertyRequestEntity[]> {
    try {
      const qb = this.repository
        .createQueryBuilder('req')
        .leftJoinAndSelect('req.property', 'property')
        .leftJoinAndSelect('property.organization', 'org')
        .leftJoinAndSelect('req.unit', 'unit')
        .leftJoinAndSelect('req.requester', 'requester')
        .leftJoinAndSelect('req.assignee', 'assignee')
        .where('org.id = :orgId', { orgId })
        .andWhere('req.deletedAt IS NULL')
        .orderBy('req.createdAt', 'DESC');
      return await qb.getMany();
    } catch (error) {
      this.handleError(error, `Error finding requests for organization ${orgId}`);
    }
  }

  /**
   * Get maintenance requests across multiple organizations.
   */
  async getRequestsByOrganizationIds(orgIds: string[]): Promise<PropertyRequestEntity[]> {
    try {
      if (!orgIds.length) return [];
      const qb = this.repository
        .createQueryBuilder('req')
        .leftJoinAndSelect('req.property', 'property')
        .leftJoinAndSelect('property.organization', 'org')
        .leftJoinAndSelect('req.unit', 'unit')
        .leftJoinAndSelect('req.requester', 'requester')
        .leftJoinAndSelect('req.assignee', 'assignee')
        .where('org.id IN (:...orgIds)', { orgIds })
        .andWhere('req.deletedAt IS NULL')
        .orderBy('req.createdAt', 'DESC');
      return await qb.getMany();
    } catch (error) {
      this.handleError(error, `Error finding requests for organizations ${orgIds.join(',')}`);
    }
  }

  /**
   * Get all maintenance requests for a property.
   */
  async getRequestsByProperty(propertyId: string): Promise<PropertyRequestEntity[]> {
    try {
      return await this.find({
        where: { property: { id: propertyId } },
        relations: { unit: true, requester: true, assignee: true },
        order: { createdAt: 'DESC' }
      });
    } catch (error) {
      this.handleError(error, `Error finding maintenance requests for property ${propertyId}`);
    }
  }

  /**
   * Get all requests for a specific unit.
   */
  async getRequestsByUnit(unitId: string): Promise<PropertyRequestEntity[]> {
    try {
      return await this.find({
        where: { unit: { id: unitId } },
        relations: { requester: true, assignee: true },
        order: { createdAt: 'DESC' }
      });
    } catch (error) {
      this.handleError(error, `Error finding requests for unit ${unitId}`);
    }
  }

  /**
   * Get all requests by status for a property.
   */
  async getRequestsByStatus(propertyId: string, status: MaintenanceStatus): Promise<PropertyRequestEntity[]> {
    try {
      return await this.find({
        where: { property: { id: propertyId }, status },
        relations: { unit: true, requester: true, assignee: true },
        order: { createdAt: 'DESC' }
      });
    } catch (error) {
      this.handleError(error, `Error finding requests with status ${status} for property ${propertyId}`);
    }
  }

  /**
   * Get open (pending or in-progress) requests for dashboard and automation.
   */
  async getOpenRequests(propertyId: string): Promise<PropertyRequestEntity[]> {
    try {
      return await this.find({
        where: [
          { property: { id: propertyId }, status: MaintenanceStatus.PENDING },
          { property: { id: propertyId }, status: MaintenanceStatus.IN_PROGRESS }
        ],
        relations: { unit: true, requester: true, assignee: true },
        order: { createdAt: 'ASC' }
      });
    } catch (error) {
      this.handleError(error, `Error finding open requests for property ${propertyId}`);
    }
  }

  /**
   * Get all unassigned requests for triage or auto-assignment.
   */
  async getUnassignedRequests(propertyId: string): Promise<PropertyRequestEntity[]> {
    try {
      return await this.find({
        where: {
          property: { id: propertyId },
          assignee: IsNull()
        },
        relations: { unit: true, requester: true },
        order: { createdAt: 'ASC' }
      });
    } catch (error) {
      this.handleError(error, `Error finding unassigned requests for property ${propertyId}`);
    }
  }

  /**
   * Get all urgent or high-priority requests for a property.
   */
  async getPriorityRequests(propertyId: string): Promise<PropertyRequestEntity[]> {
    try {
      return await this.find({
        where: [
          { property: { id: propertyId }, priority: MaintenancePriority.HIGH },
          { property: { id: propertyId }, priority: MaintenancePriority.URGENT }
        ],
        relations: { unit: true, requester: true, assignee: true },
        order: { createdAt: 'ASC' }
      });
    } catch (error) {
      this.handleError(error, `Error finding priority requests for property ${propertyId}`);
    }
  }

  /**
   * Find requests for a property created within the last X days.
   */
  async getRecentRequests(propertyId: string, days = 7): Promise<PropertyRequestEntity[]> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      return await this.find({
        where: {
          property: { id: propertyId },
          createdAt: Raw(alias => `${alias} >= :since`, { since }),
        },
        relations: { unit: true, requester: true, assignee: true },
        order: { createdAt: 'DESC' }
      });
    } catch (error) {
      this.handleError(error, `Error finding recent requests for property ${propertyId}`);
    }
  }
}

const propertyRequestRepository = new PropertyRequestRepository();
export { propertyRequestRepository as default, PropertyRequestRepository };
