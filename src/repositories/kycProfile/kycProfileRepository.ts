import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
} from 'typeorm';
import {
  KycProfile,
  KycProfileStatus,
  KycProfileType,
} from '../../entities/kycProfile/kycProfileEntity';
import BaseRepository, {
  PaginatedResult,
  PaginationOptions,
} from '../baseRepository';

class KycProfileRepository extends BaseRepository<KycProfile> {
  constructor() {
    super(KycProfile);
  }

  /**
   * Finds a KYC profile by its ID.
   * @param id - The ID of the KYC profile.
   * @returns The KYC profile entity or null if not found.
   */
  async getKycProfileById(id: string): Promise<KycProfile | null> {
    try {
      return await this.findOne({ where: { id } });
    } catch (error) {
      this.handleError(error, `Error finding KYC profile by ID: ${id}`);
    }
  }

  /**
   * Finds KYC profiles by their type.
   * @param type - The type of the KYC profiles.
   * @returns Array of KYC profile entities matching the type.
   */
  async getKycProfilesByType(type: KycProfileType): Promise<KycProfile[]> {
    try {
      return await this.find({ where: { type } });
    } catch (error) {
      this.handleError(error, `Error finding KYC profiles by type: ${type}`);
    }
  }

  /**
   * Finds KYC profiles by their status.
   * @param status - The status of the KYC profiles.
   * @returns Array of KYC profile entities matching the status.
   */
  async getKycProfilesByStatus(
    status: KycProfileStatus
  ): Promise<KycProfile[]> {
    try {
      return await this.find({ where: { status } });
    } catch (error) {
      this.handleError(
        error,
        `Error finding KYC profiles by status: ${status}`
      );
    }
  }

  /**
   * Creates a new KYC profile.
   * @param data - The data to create the KYC profile.
   * @returns The created KYC profile entity.
   */
  async createKycProfile(data: Partial<KycProfile>): Promise<KycProfile> {
    try {
      return await this.create(data);
    } catch (error) {
      this.handleError(error, `Error creating KYC profile`);
    }
  }

  /**
   * Updates a KYC profile by its ID.
   * @param id - The ID of the KYC profile to update.
   * @param data - The data to update the KYC profile.
   */
  async updateKycProfile(id: string, data: Partial<KycProfile>): Promise<void> {
    try {
      await this.update(id, data);
    } catch (error) {
      this.handleError(error, `Error updating KYC profile with ID: ${id}`);
    }
  }

  /**
   * Get profiles by user ID.
   * @param userId - The ID of the user.
   * @returns Array of KYC profiles for the user.
   */
  async getProfilesByUserId(userId: string): Promise<KycProfile[]> {
    try {
      const where: FindOptionsWhere<KycProfile> = { user: { id: userId } };
      return await this.find({ where });
    } catch (error) {
      this.handleError(
        error,
        `Error fetching KYC profiles for user ID: ${userId}`
      );
    }
  }

  /**
   * Get profiles by organization ID.
   * @param organizationId - The ID of the organization.
   * @returns Array of KYC profiles for the organization.
   */
  async getProfilesByOrganizationId(
    organizationId: string
  ): Promise<KycProfile[]> {
    try {
      return await this.find({
        where: { organization: { id: organizationId } },
      });
    } catch (error) {
      this.handleError(
        error,
        `Error fetching KYC profiles for organization ID: ${organizationId}`
      );
    }
  }

  /**
   * Deletes a KYC profile by its ID.
   * @param id - The ID of the KYC profile to delete.
   */
  async deleteKycProfile(id: string): Promise<void> {
    try {
      await this.delete(id);
    } catch (error) {
      this.handleError(error, `Error deleting KYC profile with ID: ${id}`);
    }
  }

  /**
   * Finds KYC profiles with pagination.
   * @param options - Pagination options such as page number, limit, and order.
   * @param where - Optional where clause for filtering entities.
   * @param relations - Optional relations to include.
   * @param select - Optional select fields.
   * @returns Paginated result with items, total count, and page information.
   */
  async findKycProfilesWithPagination(
    options: PaginationOptions,
    where?: FindOptionsWhere<KycProfile>,
    relations?: FindOptionsRelations<KycProfile>,
    select?: FindOptionsSelect<KycProfile>
  ): Promise<PaginatedResult<KycProfile>> {
    try {
      const result = await this.findWithPagination(
        options,
        where,
        relations,
        select
      );
      if (!result) {
        throw new Error('Failed to fetch paginated KYC profiles');
      }
      return result;
    } catch (error) {
      this.handleError(error, `Error fetching paginated KYC profiles`);
    }
  }
}

// Export an instance of `KycProfileRepository`
const kycProfileRepository = new KycProfileRepository();
export { kycProfileRepository as default, KycProfileRepository };
