import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
} from 'typeorm';
import {
  KycDataType,
  KycRequirement,
} from '../../entities/kycProfile/kycRequirementEntity';
import BaseRepository, {
  PaginatedResult,
  PaginationOptions,
} from '../baseRepository';

class KycRequirementRepository extends BaseRepository<KycRequirement> {
  constructor() {
    super(KycRequirement);
  }

  /**
   * Finds a KYC requirement by its ID.
   * @param id - The ID of the KYC requirement.
   * @returns The KYC requirement entity or null if not found.
   */
  async getKycRequirementById(id: string): Promise<KycRequirement | null> {
    try {
      return await this.findOne({ where: { id } });
    } catch (error) {
      this.handleError(error, `Error finding KYC requirement by ID: ${id}`);
    }
  }

  /**
   * Finds KYC requirements by their name.
   * @param name - The name of the KYC requirements.
   * @returns Array of KYC requirement entities matching the name.
   */
  async getKycRequirementByName(name: string): Promise<KycRequirement[]> {
    try {
      return await this.find({ where: { name } });
    } catch (error) {
      this.handleError(
        error,
        `Error finding KYC requirements by name: ${name}`
      );
    }
  }

  /**
   * Finds KYC requirements by their data type.
   * @param dataType - The data type of the KYC requirements.
   * @returns Array of KYC requirement entities matching the data type.
   */
  async getKycRequirementByDataType(
    dataType: KycDataType
  ): Promise<KycRequirement[]> {
    try {
      return await this.find({ where: { dataType } });
    } catch (error) {
      this.handleError(
        error,
        `Error finding KYC requirements by data type: ${dataType}`
      );
    }
  }

  /**
   * Creates a new KYC requirement.
   * @param data - The data to create the KYC requirement.
   * @returns The created KYC requirement entity.
   */
  async createKycRequirement(
    data: Partial<KycRequirement>
  ): Promise<KycRequirement> {
    try {
      return await this.create(data);
    } catch (error) {
      this.handleError(error, `Error creating KYC requirement`);
    }
  }

  /**
   * Updates a KYC requirement by its ID.
   * @param id - The ID of the KYC requirement to update.
   * @param data - The data to update the KYC requirement.
   */
  async updateKycRequirement(
    id: string,
    data: Partial<KycRequirement>
  ): Promise<void> {
    try {
      await this.update(id, data);
    } catch (error) {
      this.handleError(error, `Error updating KYC requirement with ID: ${id}`);
    }
  }

  /**
   * Deletes a KYC requirement by its ID.
   * @param id - The ID of the KYC requirement to delete.
   */
  async deleteKycRequirement(id: string): Promise<void> {
    try {
      await this.delete(id);
    } catch (error) {
      this.handleError(error, `Error deleting KYC requirement with ID: ${id}`);
    }
  }

  /**
   * Finds KYC requirements with pagination.
   * @param options - Pagination options such as page number, limit, and order.
   * @param where - Optional where clause for filtering entities.
   * @param relations - Optional relations to include.
   * @param select - Optional select fields.
   * @returns Paginated result with items, total count, and page information.
   */
  async findKycRequirementWithPagination(
    options: PaginationOptions,
    where?: FindOptionsWhere<KycRequirement>,
    relations?: FindOptionsRelations<KycRequirement>,
    select?: FindOptionsSelect<KycRequirement>
  ): Promise<PaginatedResult<KycRequirement>> {
    try {
      const result = await this.findWithPagination(
        options,
        where,
        relations,
        select
      );
      if (!result) {
        throw new Error('Failed to fetch paginated KYC requirements');
      }
      return result;
    } catch (error) {
      this.handleError(error, `Error fetching paginated KYC requirements`);
    }
  }
}

// Export an instance of `KycRequirementRepository`
const kycRequirementRepository = new KycRequirementRepository();
export { kycRequirementRepository as default, KycRequirementRepository };
