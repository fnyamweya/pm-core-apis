import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
} from 'typeorm';
import { Organization } from '../../entities/organizations/organizationEntity';
import BaseRepository, {
  PaginatedResult,
  PaginationOptions,
} from '../baseRepository';

class OrganizationRepository extends BaseRepository<Organization> {
  constructor() {
    super(Organization);
  }

  /**
   * Finds organizations by their name.
   * @param name - The name of the organization.
   * @returns Array of organization entities matching the name.
   */
  async getOrganizationsByName(name: string): Promise<Organization[]> {
    try {
      return await this.find({ where: { name } });
    } catch (error) {
      this.handleError(error, `Error finding organizations by name: ${name}`);
    }
  }

  /**
   * Finds organizations by their type.
   * @param typeId - The ID of the organization type.
   * @returns Array of organization entities matching the type.
   */
  async getOrganizationsByType(typeId: string): Promise<Organization[]> {
    try {
      return await this.find({ where: { type: { id: typeId } } });
    } catch (error) {
      this.handleError(
        error,
        `Error finding organizations by type ID: ${typeId}`
      );
    }
  }

  /**
   * Creates a new organization.
   * @param data - The data to create the organization.
   * @returns The created Organization entity.
   */
  async createOrganization(data: Partial<Organization>): Promise<Organization> {
    try {
      return await this.create(data);
    } catch (error) {
      this.handleError(error, `Error creating organization`);
    }
  }

  /**
   * Updates an organization by its ID.
   * @param id - The ID of the organization to update.
   * @param data - The data to update the organization.
   */
  async updateOrganization(
    id: string,
    data: Partial<Organization>
  ): Promise<void> {
    try {
      await this.update(id, data);
    } catch (error) {
      this.handleError(error, `Error updating organization with ID: ${id}`);
    }
  }

  /**
   * Deletes an organization by its ID.
   * @param id - The ID of the organization to delete.
   */
  async deleteOrganization(id: string): Promise<void> {
    try {
      await this.delete(id);
    } catch (error) {
      this.handleError(error, `Error deleting organization with ID: ${id}`);
    }
  }

  /**
   * Finds organizations with pagination.
   * @param options - Pagination options such as page number, limit, and order.
   * @param where - Optional where clause for filtering entities.
   * @param relations - Optional relations to include.
   * @param select - Optional select fields.
   * @returns Paginated result with items, total count, and page information.
   */
  async findOrganizationsWithPagination(
    options: PaginationOptions,
    where?: FindOptionsWhere<Organization>,
    relations?: FindOptionsRelations<Organization>,
    select?: FindOptionsSelect<Organization>
  ): Promise<PaginatedResult<Organization>> {
    try {
      const result = await this.findWithPagination(
        options,
        where,
        relations,
        select
      );
      if (!result) {
        throw new Error('Failed to fetch paginated organizations');
      }
      return result;
    } catch (error) {
      this.handleError(error, `Error fetching paginated organizations`);
    }
  }
}

// Export an instance of `OrganizationRepository`
const organizationRepository = new OrganizationRepository();
export { organizationRepository as default, OrganizationRepository };
