import { PropertyAddressEntity } from '../../entities/properties/propertyAddressEntity';
import BaseRepository from '../baseRepository';
import { logger } from '../../utils/logger';

class PropertyAddressRepository extends BaseRepository<PropertyAddressEntity> {
  constructor() {
    super(PropertyAddressEntity);
  }

  /**
   * Find all addresses for a given property.
   */
  async getAddressesByProperty(propertyId: string): Promise<PropertyAddressEntity[]> {
    try {
      return await this.find({
        where: { property: { id: propertyId } },
        relations: { addressComponents: true },
      });
    } catch (error) {
      this.handleError(error, `Error finding addresses for property ${propertyId}`);
    }
  }

  /**
   * Find a property address by its label (e.g. "Main Entrance").
   */
  async getAddressByLabel(propertyId: string, label: string): Promise<PropertyAddressEntity | null> {
    try {
      return await this.findOne({
        where: {
          property: { id: propertyId },
          label,
        },
        relations: { addressComponents: true },
      });
    } catch (error) {
      this.handleError(error, `Error finding address "${label}" for property ${propertyId}`);
    }
  }

  /**
   * Find all addresses within a certain radius (in km) of given lat/lng.
   * Requires both latitude and longitude to be set.
   * NOTE: For large datasets, consider spatial extensions.
   */
  async findNearbyAddresses(latitude: number, longitude: number, radiusKm: number): Promise<PropertyAddressEntity[]> {
    try {
      const earthRadius = 6371;
      return await this.executeCustomQuery((repo) =>
        repo.createQueryBuilder('address')
          .where('address.latitude IS NOT NULL')
          .andWhere('address.longitude IS NOT NULL')
          .addSelect(`
            (${earthRadius} * acos(
              cos(radians(:lat)) * cos(radians(address.latitude)) *
              cos(radians(address.longitude) - radians(:lng)) +
              sin(radians(:lat)) * sin(radians(address.latitude))
            ))`, 'distance')
          .having('distance <= :radius', { radius: radiusKm })
          .setParameters({ lat: latitude, lng: longitude })
      );
    } catch (error) {
      this.handleError(error, `Error finding nearby addresses`);
    }
  }
}

const propertyAddressRepository = new PropertyAddressRepository();
export { propertyAddressRepository as default, PropertyAddressRepository };
