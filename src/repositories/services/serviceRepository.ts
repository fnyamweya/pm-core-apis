import { DeepPartial } from 'typeorm';
import { ServiceLocation } from '../../entities/locations/locationEntity';
import { Service } from '../../entities/services/serviceEntity';
import BaseRepository from '../baseRepository';

class ServiceRepository extends BaseRepository<Service> {
  constructor() {
    super(Service);
  }

  /**
   * Creates a new Service.
   * @param serviceData - Data for the new Service.
   * @returns The created Service entity.
   */
  async createService(serviceData: DeepPartial<Service>): Promise<Service> {
    try {
      return await this.create(serviceData);
    } catch (error) {
      this.handleError(error, 'Error creating new Service');
    }
  }

  /**
   * Ensures a Service exists by its code.
   * @param code - The code of the Service.
   * @returns The Service entity.
   * @throws Error if the Service does not exist.
   */
  /**
   * Ensures a Service exists by its code.
   * @param code - The code of the Service.
   * @returns The Service entity.
   * @throws Error if the Service does not exist.
   */
  private async ensureServiceExistsByCode(code: string): Promise<Service> {
    const service = await this.findOne({
      where: { serviceCode: code },
      relations: ['locations', 'configuration'],
    });
    if (!service) {
      throw new Error(`Service not found for code: ${code}`);
    }
    return service;
  }

  /**
   * Updates a Service by its code.
   * @param code - The code of the Service.
   * @param updateData - Partial data to update the Service with.
   * @returns The updated Service entity.
   */
  async updateServiceByCode(
    code: string,
    updateData: DeepPartial<Service>
  ): Promise<Service> {
    const service = await this.ensureServiceExistsByCode(code);
    await this.update(service.id, updateData);
    const updatedService = await this.findById(service.id);

    if (!updatedService) {
      throw new Error(`Error updating Service with code: ${code}`);
    }

    return updatedService;
  }

  /**
   * Retrieves a Service by its code.
   * @param code - The code of the Service.
   * @returns The Service entity or null if not found.
   */
  async getServiceByCode(code: string): Promise<Service | null> {
    try {
      return await this.findOne({
        where: { serviceCode: code },
        relations: ['locations', 'configuration'],
      });
    } catch (error) {
      this.handleError(error, `Error finding Service with code: ${code}`);
    }
  }

  /**
   * Retrieves all Services available in a specific location by location ID.
   * @param locationId - The ID of the ServiceLocation.
   * @returns Array of Service entities available in the specified location.
   */
  async getServicesByLocationId(locationId: string): Promise<Service[]> {
    try {
      return await this.find({
        where: { locations: { id: locationId } },
        relations: ['locations', 'configuration'],
      });
    } catch (error) {
      this.handleError(
        error,
        `Error retrieving Services for location ID: ${locationId}`
      );
    }
  }

  /**
   * Adds a location to a Service by service code.
   * @param code - The code of the Service.
   * @param location - The ServiceLocation entity to add.
   */
  async addLocationToService(
    code: string,
    location: ServiceLocation
  ): Promise<void> {
    const service = await this.ensureServiceExistsByCode(code);
    service.locations.push(location);
    await this.save(service);
  }

  /**
   * Removes a location from a Service by service code.
   * @param code - The code of the Service.
   * @param locationId - The ID of the location to remove.
   */
  async removeLocationFromService(
    code: string,
    locationId: string
  ): Promise<void> {
    const service = await this.ensureServiceExistsByCode(code);
    service.locations = service.locations.filter(
      (location) => location.id !== locationId
    );
    await this.save(service);
  }

  /**
   * Updates the configuration for a Service by service code.
   * @param code - The code of the Service.
   * @param configuration - Partial ServiceConfiguration data to update.
   */
  async updateServiceConfiguration(
    code: string,
    configuration: DeepPartial<Service['configuration']>
  ): Promise<void> {
    const service = await this.ensureServiceExistsByCode(code);
    await this.update(service.id, { configuration });
  }

  /**
   * Deletes a Service by its code.
   * @param code - The code of the Service.
   */
  async deleteServiceByCode(code: string): Promise<void> {
    const service = await this.ensureServiceExistsByCode(code);
    await this.delete(service.id);
  }
}

const serviceRepository = new ServiceRepository();
export { serviceRepository as default, ServiceRepository };
