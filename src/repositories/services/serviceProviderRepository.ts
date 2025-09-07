import { DeepPartial } from 'typeorm';
import { ServiceLocation } from '../../entities/locations/locationEntity';
import { ServiceProvider } from '../../entities/services/serviceProviderEntity';
import BaseRepository from '../baseRepository';

class ServiceProviderRepository extends BaseRepository<ServiceProvider> {
  constructor() {
    super(ServiceProvider);
  }

  /**
   * Creates a new ServiceProvider.
   * @param providerData - Data for the new ServiceProvider.
   * @returns The created ServiceProvider entity.
   */
  async createServiceProvider(
    providerData: DeepPartial<ServiceProvider>
  ): Promise<ServiceProvider> {
    return this.create(providerData);
  }

  /**
   * Retrieves a ServiceProvider by its associated user ID.
   * @param userId - The ID of the associated UserEntity.
   * @returns The ServiceProvider entity.
   * @throws Error if not found.
   */
  async ensureProviderExistsByUserId(userId: string): Promise<ServiceProvider> {
    const provider = await this.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'serviceLocations', 'configurations'],
    });
    if (!provider) {
      throw new Error(`ServiceProvider not found for User ID: ${userId}`);
    }
    return provider;
  }

  /**
   * Updates the rating for a ServiceProvider by User ID.
   * @param userId - The ID of the associated UserEntity.
   * @param rating - The new rating for the provider.
   */
  async updateRatingByUserId(userId: string, rating: number): Promise<void> {
    const provider = await this.ensureProviderExistsByUserId(userId);
    await this.update(provider.id, { rating });
  }

  /**
   * Adds a service location to a ServiceProvider.
   * @param userId - The ID of the associated UserEntity.
   * @param location - The ServiceLocation entity to add.
   */
  async addLocationToProvider(
    userId: string,
    location: ServiceLocation
  ): Promise<void> {
    const provider = await this.ensureProviderExistsByUserId(userId);
    provider.serviceLocations.push(location);
    await this.save(provider);
  }

  /**
   * Removes a service location from a ServiceProvider.
   * @param userId - The ID of the associated UserEntity.
   * @param locationId - The ID of the location to remove.
   */
  async removeLocationFromProvider(
    userId: string,
    locationId: string
  ): Promise<void> {
    const provider = await this.ensureProviderExistsByUserId(userId);
    provider.serviceLocations = provider.serviceLocations.filter(
      (location) => location.id !== locationId
    );
    await this.save(provider);
  }

  /**
   * Updates specialties for a ServiceProvider by User ID.
   * @param userId - The ID of the associated UserEntity.
   * @param specialties - Array of specialties to update.
   */
  async updateSpecialtiesByUserId(
    userId: string,
    specialties: string[]
  ): Promise<void> {
    const provider = await this.ensureProviderExistsByUserId(userId);
    await this.update(provider.id, { specialties });
  }

  /**
   * Deletes a ServiceProvider by User ID.
   * @param userId - The ID of the associated UserEntity.
   */
  async deleteProviderByUserId(userId: string): Promise<void> {
    const provider = await this.ensureProviderExistsByUserId(userId);
    await this.delete(provider.id);
  }
}

const serviceProviderRepository = new ServiceProviderRepository();
export { serviceProviderRepository as default, ServiceProviderRepository };
