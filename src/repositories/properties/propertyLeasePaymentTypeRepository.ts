import { PropertyLeasePaymentType } from '../../entities/properties/propertyLeasePaymentTypeEntity';
import BaseRepository from '../baseRepository';
import { logger } from '../../utils/logger';

class PropertyLeasePaymentTypeRepository extends BaseRepository<PropertyLeasePaymentType> {
  constructor() {
    super(PropertyLeasePaymentType);
  }

  /**
   * Get all payment types (system-wide).
   */
  async getAllPaymentTypes(): Promise<PropertyLeasePaymentType[]> {
    try {
      return await this.find({
        order: { name: 'ASC' }
      });
    } catch (error) {
      this.handleError(error, `Error fetching all payment types`);
    }
  }

  /**
   * Find a payment type by code.
   */
  async getPaymentTypeByCode(code: string): Promise<PropertyLeasePaymentType | null> {
    try {
      return await this.findOne({
        where: { code }
      });
    } catch (error) {
      this.handleError(error, `Error fetching payment type by code: ${code}`);
    }
  }

  /**
   * Search payment types by name or code (for admin UI/autocomplete).
   */
  async searchPaymentTypes(query: string, limit = 20): Promise<PropertyLeasePaymentType[]> {
    try {
      return await this.find({
        where: [
          { name: query },
          { code: query }
        ],
        take: limit,
        order: { name: 'ASC' }
      });
    } catch (error) {
      this.handleError(error, `Error searching payment types`);
    }
  }
}

const propertyLeasePaymentTypeRepository = new PropertyLeasePaymentTypeRepository();
export { propertyLeasePaymentTypeRepository as default, PropertyLeasePaymentTypeRepository };
