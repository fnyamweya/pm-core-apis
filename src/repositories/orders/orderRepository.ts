import { DeepPartial } from 'typeorm';
import { OrderStatus, PaymentStatus } from '../../constants/orders';
import { Order } from '../../entities/orders/orderEntity';
import { OrderItem } from '../../entities/orders/orderItemEntity';
import { OrderTransaction } from '../../entities/orders/orderTransactionEntity';
import BaseRepository from '../baseRepository';

class OrderRepository extends BaseRepository<Order> {
  constructor() {
    super(Order);
  }

  /**
   * Creates a new Order.
   * @param orderData - Data for the new Order.
   * @returns The created Order entity.
   */
  async createOrder(orderData: DeepPartial<Order>): Promise<Order> {
    return await this.create(orderData);
  }

  /**
   * Ensures an Order exists by order number or throws an error.
   * @param orderNumber - The order number of the Order.
   * @returns The Order entity.
   */
  private async ensureOrderExistsByOrderNumber(
    orderNumber: string
  ): Promise<Order> {
    const order = await this.findOne({ where: { orderNumber } });
    if (!order) {
      throw new Error(`Order not found for order number: ${orderNumber}`);
    }
    return order;
  }

  /**
   * Updates an Order by its order number.
   * @param orderNumber - The order number of the Order to update.
   * @param updateData - Partial data to update the Order with.
   * @returns The updated Order entity.
   */
  async updateOrderByOrderNumber(
    orderNumber: string,
    updateData: DeepPartial<Order>
  ): Promise<Order> {
    const order = await this.ensureOrderExistsByOrderNumber(orderNumber);
    await this.update(order.id, updateData);
    const updatedOrder = await this.findById(order.id);
    if (!updatedOrder) {
      throw new Error(
        `Failed to retrieve updated Order for order number: ${orderNumber}`
      );
    }
    return updatedOrder;
  }

  /**
   * Finds an Order by its order number.
   * @param orderNumber - The unique order number.
   * @returns The Order entity or null if not found.
   */
  async getOrderByOrderNumber(orderNumber: string): Promise<Order | null> {
    return await this.findOne({ where: { orderNumber } });
  }

  /**
   * Finds all Orders for a specific user.
   * @param userId - The ID of the user.
   * @returns Array of Order entities associated with the user.
   */
  async getOrdersByUserId(userId: string): Promise<Order[]> {
    try {
      return await this.find({
        where: { userOrders: { user: { id: userId } } }, // Nested relation path
        relations: ['userOrders'],
      });
    } catch (error) {
      this.handleError(error, `Error finding Orders for user ID: ${userId}`);
    }
  }

  /**
   * Updates the status of an Order by its order number.
   * @param orderNumber - The order number of the Order.
   * @param status - The new status for the Order.
   */
  async updateOrderStatusByOrderNumber(
    orderNumber: string,
    status: OrderStatus
  ): Promise<void> {
    await this.updateOrderByOrderNumber(orderNumber, { orderStatus: status });
  }

  /**
   * Updates the payment status of an Order by its order number.
   * @param orderNumber - The order number of the Order.
   * @param status - The new payment status for the Order.
   */
  async updatePaymentStatusByOrderNumber(
    orderNumber: string,
    status: PaymentStatus
  ): Promise<void> {
    await this.updateOrderByOrderNumber(orderNumber, { paymentStatus: status });
  }

  /**
   * Soft deletes an Order by its order number.
   * @param orderNumber - The order number of the Order to soft delete.
   */
  async softDeleteOrderByOrderNumber(orderNumber: string): Promise<void> {
    const order = await this.ensureOrderExistsByOrderNumber(orderNumber);
    await this.softDelete(order.id);
  }

  /**
   * Restores a soft-deleted Order by its order number.
   * @param orderNumber - The order number of the Order to restore.
   */
  async restoreOrderByOrderNumber(orderNumber: string): Promise<void> {
    const order = await this.ensureOrderExistsByOrderNumber(orderNumber);
    await this.restore(order.id);
  }

  /**
   * Retrieves all items for a specific Order by order number.
   * @param orderNumber - The order number of the Order.
   * @returns Array of OrderItem entities associated with the Order.
   */
  async getOrderItemsByOrderNumber(orderNumber: string): Promise<OrderItem[]> {
    const order = await this.ensureOrderExistsByOrderNumber(orderNumber);
    return order.orderItems || [];
  }

  /**
   * Retrieves all transactions for a specific Order by order number.
   * @param orderNumber - The order number of the Order.
   * @returns Array of OrderTransaction entities associated with the Order.
   */
  async getOrderTransactionsByOrderNumber(
    orderNumber: string
  ): Promise<OrderTransaction[]> {
    const order = await this.ensureOrderExistsByOrderNumber(orderNumber);
    return order.orderTransactions || [];
  }
}

const orderRepository = new OrderRepository();
export { orderRepository as default, OrderRepository };
