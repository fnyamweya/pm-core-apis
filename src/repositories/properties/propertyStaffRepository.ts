import { PropertyStaffEntity } from '../../entities/properties/propertyStaffEntity';
import { logger } from '../../utils/logger';
import BaseRepository from '../baseRepository';

class PropertyStaffRepository extends BaseRepository<PropertyStaffEntity> {
  constructor() {
    super(PropertyStaffEntity);
  }

  async getStaffByPropertyId(propertyId: string): Promise<PropertyStaffEntity[]> {
    try {
      return await this.find({
        where: { property: { id: propertyId } },
        relations: ['property', 'user'],
      });
    } catch (error) {
      this.handleError(error, `Error finding staff by property: ${propertyId}`);
    }
  }

  async getStaffByUserId(userId: string): Promise<PropertyStaffEntity[]> {
    try {
      return await this.find({
        where: { user: { id: userId } },
        relations: ['property', 'user'],
      });
    } catch (error) {
      this.handleError(error, `Error finding staff by user ID: ${userId}`);
    }
  }
}

const propertyStaffRepository = new PropertyStaffRepository();
export { PropertyStaffRepository, propertyStaffRepository as default };
