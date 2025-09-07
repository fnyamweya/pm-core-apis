import { PropertyAddressEntity } from '../../entities/properties/propertyAddressEntity';
import propertyAddressRepository, { PropertyAddressRepository } from '../../repositories/properties/propertyAddressRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import BaseService from '../baseService';

class PropertyAddressService extends BaseService<PropertyAddressEntity> {
  protected repository: PropertyAddressRepository;
  private readonly cacheNamespace = 'propertyAddress';

  constructor() {
    super(
      {
        repository: propertyAddressRepository as PropertyAddressRepository,
        redisCache: new RedisCache<PropertyAddressEntity>(3600),
        logger,
      },
      'propertyAddress'
    );
    this.repository = propertyAddressRepository as PropertyAddressRepository;
  }

  /**
   * Get all addresses for a specific property.
   */
  async getAddressesByProperty(propertyId: string): Promise<PropertyAddressEntity[]> {
    const cacheKey = `${this.cacheNamespace}:property:${propertyId}`;
    let addresses = await this.cache.getFromCache(this.cacheNamespace, cacheKey) as PropertyAddressEntity[] | null;
    if (addresses) return addresses;

    addresses = await this.repository.getAddressesByProperty(propertyId);
    await this.cache.setToCache(this.cacheNamespace, cacheKey, addresses);
    return addresses;
  }

  /**
   * Get an address for a property by label.
   */
  async getAddressByLabel(propertyId: string, label: string): Promise<PropertyAddressEntity | null> {
    const cacheKey = `${this.cacheNamespace}:property:${propertyId}:label:${encodeURIComponent(label)}`;
    let address = await this.cache.getFromCache(this.cacheNamespace, cacheKey) as PropertyAddressEntity | null;
    if (address) return address;

    address = await this.repository.getAddressByLabel(propertyId, label);
    if (address) await this.cache.setToCache(this.cacheNamespace, cacheKey, address);
    return address;
  }

  /**
   * Find all addresses within a given radius (in km) from a lat/lng point.
   */
  async findNearbyAddresses(latitude: number, longitude: number, radiusKm: number): Promise<PropertyAddressEntity[]> {
    // Geospatial queries are not cached by default
    return this.repository.findNearbyAddresses(latitude, longitude, radiusKm);
  }
}

const propertyAddressService = new PropertyAddressService();
export { propertyAddressService as default, PropertyAddressService };
