import { PropertyOwnerEntity } from '../../entities/properties/propertyOwnerEntity';
import { logger } from '../../utils/logger';
import { OwnerRole } from '../../entities/properties/propertyOwnerEntity';
import BaseRepository from '../baseRepository';

class PropertyOwnerRepository extends BaseRepository<PropertyOwnerEntity> {
  constructor() {
    super(PropertyOwnerEntity);
  }

  /**
   * Get all owners for a specific property.
   */
  async getOwnersByPropertyId(propertyId: string): Promise<PropertyOwnerEntity[]> {
    try {
      return await this.find({
        where: { property: { id: propertyId } },
        relations: {
          property: true,
          user: true,
          organization: true,
        }
      });
    } catch (error) {
      this.handleError(error, `Error finding owners by property: ${propertyId}`);
    }
  }

  /**
   * Get owner by User ID (for individual owners).
   */
  async getOwnerByUserId(userId: string): Promise<PropertyOwnerEntity | null> {
    try {
      const owner = await this.findOne({
        where: { user: { id: userId } },
        relations: {
          property: true,
          user: true,
          organization: true,
        }
      });
      if (!owner) {
        logger.info(`Owner with user ID ${userId} not found.`);
      }
      return owner;
    } catch (error) {
      this.handleError(error, `Error finding owner by user ID: ${userId}`);
    }
  }

  /**
   * Get landlord by owner role
   */
  async getLandlordByOwnerRole(role: OwnerRole): Promise<PropertyOwnerEntity[]> {
    try {
      return await this.find({
        where: { role },
        relations: {
          property: true,
          user: true,
          organization: true,
        }
      });
    } catch (error) {
      this.handleError(error, `Error finding landlord by role: ${role}`);
    }
  }
}

const propertyOwnerRepository = new PropertyOwnerRepository();
export {
  PropertyOwnerRepository,
  propertyOwnerRepository as default
};
