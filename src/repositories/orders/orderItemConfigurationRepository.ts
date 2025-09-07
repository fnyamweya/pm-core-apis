import { DeepPartial } from 'typeorm';
import { OrderItemConfiguration } from '../../entities/orders/orderItemConfigurationEntity';
import BaseRepository from '../baseRepository';

class OrderItemConfigurationRepository extends BaseRepository<OrderItemConfiguration> {
  constructor() {
    super(OrderItemConfiguration);
  }

  /**
   * Creates a new OrderItemConfiguration.
   * @param configData - Data for the new OrderItemConfiguration.
   * @returns The created OrderItemConfiguration entity.
   */
  async createOrderItemConfiguration(
    configData: DeepPartial<OrderItemConfiguration>
  ): Promise<OrderItemConfiguration> {
    try {
      return await this.create(configData);
    } catch (error) {
      this.handleError(error, 'Error creating new OrderItemConfiguration');
    }
  }

  /**
   * Updates an OrderItemConfiguration by the associated order item ID.
   * @param orderItemId - The ID of the associated OrderItem.
   * @param updateData - Partial data to update the configuration with.
   * @returns The updated OrderItemConfiguration entity.
   */
  async updateOrderItemConfigurationByOrderItemId(
    orderItemId: string,
    updateData: DeepPartial<OrderItemConfiguration>
  ): Promise<OrderItemConfiguration | null> {
    try {
      const config = await this.findOne({
        where: { orderItem: { id: orderItemId } },
      });
      if (!config) {
        throw new Error(
          `OrderItemConfiguration not found for OrderItem ID: ${orderItemId}`
        );
      }
      await this.update(config.id, updateData);
      return this.findById(config.id); // Return the updated entity
    } catch (error) {
      this.handleError(
        error,
        `Error updating OrderItemConfiguration for OrderItem ID: ${orderItemId}`
      );
    }
  }

  /**
   * Retrieves the configuration for a specific OrderItem by its ID.
   * @param orderItemId - The ID of the associated OrderItem.
   * @returns The OrderItemConfiguration entity or null if not found.
   */
  async getOrderItemConfigurationByOrderItemId(
    orderItemId: string
  ): Promise<OrderItemConfiguration | null> {
    try {
      return await this.findOne({
        where: { orderItem: { id: orderItemId } },
        relations: ['insurancePolicy'],
      });
    } catch (error) {
      this.handleError(
        error,
        `Error retrieving configuration for OrderItem ID: ${orderItemId}`
      );
    }
  }

  /**
   * Updates the insurance policy associated with an OrderItemConfiguration by OrderItem ID.
   * @param orderItemId - The ID of the associated OrderItem.
   * @param insurancePolicyId - The ID of the new InsurancePolicy, or `null` to remove it.
   */
  async updateInsurancePolicy(
    orderItemId: string,
    insurancePolicyId: string | null
  ): Promise<void> {
    try {
      const config =
        await this.getOrderItemConfigurationByOrderItemId(orderItemId);
      if (!config) {
        throw new Error(
          `OrderItemConfiguration not found for OrderItem ID: ${orderItemId}`
        );
      }

      // Use `undefined` instead of `null` if `insurancePolicyId` is null
      await this.update(config.id, {
        insurancePolicy: { id: insurancePolicyId ?? undefined },
      });
    } catch (error) {
      this.handleError(
        error,
        `Error updating insurance policy for OrderItem ID: ${orderItemId}`
      );
    }
  }

  /**
   * Deletes an OrderItemConfiguration by the associated OrderItem ID.
   * @param orderItemId - The ID of the associated OrderItem.
   */
  async deleteOrderItemConfigurationByOrderItemId(
    orderItemId: string
  ): Promise<void> {
    try {
      const config =
        await this.getOrderItemConfigurationByOrderItemId(orderItemId);
      if (!config) {
        throw new Error(
          `OrderItemConfiguration not found for OrderItem ID: ${orderItemId}`
        );
      }
      await this.delete(config.id);
    } catch (error) {
      this.handleError(
        error,
        `Error deleting OrderItemConfiguration for OrderItem ID: ${orderItemId}`
      );
    }
  }
}

const orderItemConfigurationRepository = new OrderItemConfigurationRepository();
export {
  orderItemConfigurationRepository as default,
  OrderItemConfigurationRepository,
};
