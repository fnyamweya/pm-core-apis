import { DeepPartial } from 'typeorm';
import { OrderItemConfiguration } from '../../entities/orders/orderItemConfigurationEntity';
import { OrderItem } from '../../entities/orders/orderItemEntity';
import BaseRepository from '../baseRepository';

class OrderItemRepository extends BaseRepository<OrderItem> {
  constructor() {
    super(OrderItem);
  }

  /**
   * Creates a new OrderItem.
   * @param orderItemData - Data for the new OrderItem.
   * @returns The created OrderItem entity.
   */
  async createOrderItem(
    orderItemData: DeepPartial<OrderItem>
  ): Promise<OrderItem> {
    return await this.create(orderItemData);
  }

  /**
   * Ensures an OrderItem exists by ID or throws an error.
   * @param id - The ID of the OrderItem.
   * @returns The OrderItem entity.
   */
  private async ensureOrderItemExists(id: string): Promise<OrderItem> {
    const orderItem = await this.findOne({
      where: { id },
      relations: ['order', 'configuration'],
    });
    if (!orderItem) {
      throw new Error(`OrderItem not found for ID: ${id}`);
    }
    return orderItem;
  }

  /**
   * Updates an OrderItem by its order number and item type.
   * @param orderNumber - The order number of the Order.
   * @param itemId - The ID of the item (e.g., service or product ID).
   * @param updateData - Partial data to update the OrderItem with.
   * @returns The updated OrderItem entity.
   */
  async updateOrderItemByOrderNumber(
    orderNumber: string,
    itemId: string,
    updateData: DeepPartial<OrderItem>
  ): Promise<OrderItem> {
    const orderItem = await this.repository
      .createQueryBuilder('orderItem')
      .innerJoinAndSelect('orderItem.order', 'order')
      .where('order.orderNumber = :orderNumber', { orderNumber })
      .andWhere(
        '(orderItem.product = :itemId OR orderItem.service = :itemId)',
        { itemId }
      )
      .getOne();

    if (!orderItem) {
      throw new Error(
        `OrderItem not found for order number: ${orderNumber} and item ID: ${itemId}`
      );
    }

    await this.update(orderItem.id, updateData);
    return await this.ensureOrderItemExists(orderItem.id);
  }

  /**
   * Retrieves all OrderItems of a specific type ('service' or 'product') for an order.
   * @param orderNumber - The unique order number.
   * @param type - The type of items to retrieve ('service' or 'product').
   * @returns Array of OrderItem entities of the specified type.
   */
  async getOrderItemsByType(
    orderNumber: string,
    type: 'service' | 'product'
  ): Promise<OrderItem[]> {
    return await this.repository
      .createQueryBuilder('orderItem')
      .innerJoinAndSelect('orderItem.order', 'order')
      .where('order.orderNumber = :orderNumber', { orderNumber })
      .andWhere('orderItem.type = :type', { type })
      .getMany();
  }

  /**
   * Retrieves the configuration associated with a specific OrderItem by ID.
   * @param id - The ID of the OrderItem.
   * @returns The configuration object or null if not found.
   */
  async getOrderItemConfiguration(
    id: string
  ): Promise<OrderItemConfiguration | null> {
    const orderItem = await this.ensureOrderItemExists(id);
    return orderItem.configuration ?? null;
  }

  /**
   * Updates the configuration of an OrderItem by ID.
   * @param id - The ID of the OrderItem.
   * @param configData - The configuration data to update or set.
   * @returns The updated OrderItem entity.
   */
  async updateOrderItemConfiguration(
    id: string,
    configData: DeepPartial<OrderItemConfiguration>
  ): Promise<OrderItem> {
    const orderItem = await this.ensureOrderItemExists(id);
    await this.update(orderItem.id, { configuration: configData });
    return await this.ensureOrderItemExists(orderItem.id);
  }

  /**
   * Deletes an OrderItem by its ID.
   * @param id - The ID of the OrderItem to delete.
   */
  async deleteOrderItem(id: string): Promise<void> {
    await this.ensureOrderItemExists(id);
    await this.delete(id);
  }
}

const orderItemRepository = new OrderItemRepository();
export { orderItemRepository as default, OrderItemRepository };
