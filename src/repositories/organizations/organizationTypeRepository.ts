import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
} from 'typeorm';
import { OrganizationType } from '../../entities/organizations/organizationTypeEntity';
import BaseRepository, {
  PaginatedResult,
  PaginationOptions,
} from '../baseRepository';

class OrganizationTypeRepository extends BaseRepository<OrganizationType> {
  constructor() {
    super(OrganizationType);
  }

  /**
   * Finds an organization type by its name.
   * @param name - The name of the organization type.
   * @returns The organization type entity or null if not found.
   */
  async getOrganizationTypeByName(
    name: string
  ): Promise<OrganizationType | null> {
    try {
      return await this.findOne({ where: { name } });
    } catch (error) {
      this.handleError(
        error,
        `Error finding organization type by name: ${name}`
      );
    }
  }

  /**
   * Finds organization types that are active.
   * @returns Array of active organization type entities.
   */
  async getActiveOrganizationTypes(): Promise<OrganizationType[]> {
    try {
      return await this.find({ where: { isActive: true } });
    } catch (error) {
      this.handleError(error, `Error finding active organization types`);
    }
  }

  /**
   * Creates a new organization type.
   * @param data - The data to create the organization type.
   * @returns The created OrganizationType entity.
   */
  async createOrganizationType(
    data: Partial<OrganizationType>
  ): Promise<OrganizationType> {
    try {
      return await this.create(data);
    } catch (error) {
      this.handleError(error, `Error creating organization type`);
    }
  }

  /**
   * Updates an organization type by its ID.
   * @param id - The ID of the organization type to update.
   * @param data - The data to update the organization type.
   */
  async updateOrganizationType(
    id: string,
    data: Partial<OrganizationType>
  ): Promise<void> {
    try {
      await this.update(id, data);
    } catch (error) {
      this.handleError(
        error,
        `Error updating organization type with ID: ${id}`
      );
    }
  }

  /**
   * Deletes an organization type by its ID.
   * @param id - The ID of the organization type to delete.
   */
  async deleteOrganizationType(id: string): Promise<void> {
    try {
      await this.delete(id);
    } catch (error) {
      this.handleError(
        error,
        `Error deleting organization type with ID: ${id}`
      );
    }
  }

  /**
   * Finds organization types with pagination.
   * @param options - Pagination options such as page number, limit, and order.
   * @param where - Optional where clause for filtering entities.
   * @param relations - Optional relations to include.
   * @param select - Optional select fields.
   * @returns Paginated result with items, total count, and page information.
   */
  async findOrganizationTypesWithPagination(
    options: PaginationOptions,
    where?: FindOptionsWhere<OrganizationType>,
    relations?: FindOptionsRelations<OrganizationType>,
    select?: FindOptionsSelect<OrganizationType>
  ): Promise<PaginatedResult<OrganizationType>> {
    try {
      const result = await this.findWithPagination(
        options,
        where,
        relations,
        select
      );
      if (!result) {
        throw new Error('Failed to fetch paginated organization types');
      }
      return result;
    } catch (error) {
      this.handleError(error, `Error fetching paginated organization types`);
    }
  }
}

// Export an instance of `OrganizationTypeRepository`
const organizationTypeRepository = new OrganizationTypeRepository();
export { organizationTypeRepository as default, OrganizationTypeRepository };
