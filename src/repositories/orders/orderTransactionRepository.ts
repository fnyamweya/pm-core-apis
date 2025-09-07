import { DeepPartial } from 'typeorm';
import { Order } from '../../entities/orders/orderEntity';
import { OrderTransaction } from '../../entities/orders/orderTransactionEntity';
import { Transaction } from '../../entities/transactions/transactionEntity';
import BaseRepository from '../baseRepository';

class OrderTransactionRepository extends BaseRepository<OrderTransaction> {
  constructor() {
    super(OrderTransaction);
  }

  /**
   * Creates a new OrderTransaction link between an order and a transaction.
   * @param orderTransactionData - Data for the new OrderTransaction link.
   * @returns The created OrderTransaction entity.
   */
  async createOrderTransaction(
    orderTransactionData: DeepPartial<OrderTransaction>
  ): Promise<OrderTransaction> {
    return await this.create(orderTransactionData);
  }

  /**
   * Ensures an OrderTransaction exists by order ID and transaction ID or throws an error.
   * @param orderId - The ID of the Order.
   * @param transactionId - The ID of the Transaction.
   * @returns The OrderTransaction entity.
   */
  private async ensureOrderTransactionExists(
    orderId: string,
    transactionId: string
  ): Promise<OrderTransaction> {
    const orderTransaction = await this.repository
      .createQueryBuilder('orderTransaction')
      .innerJoin('orderTransaction.order', 'order')
      .innerJoin('orderTransaction.transaction', 'transaction')
      .where('order.id = :orderId', { orderId })
      .andWhere('transaction.id = :transactionId', { transactionId })
      .getOne();

    if (!orderTransaction) {
      throw new Error(
        `OrderTransaction link not found for order ID: ${orderId} and transaction ID: ${transactionId}`
      );
    }

    return orderTransaction;
  }

  /**
   * Retrieves all orders associated with a specific transaction by transaction ID.
   * @param transactionId - The ID of the Transaction.
   * @returns Array of Order entities associated with the Transaction.
   */
  async getOrdersByTransactionId(transactionId: string): Promise<Order[]> {
    const orderTransactions = await this.repository
      .createQueryBuilder('orderTransaction')
      .innerJoinAndSelect('orderTransaction.order', 'order')
      .innerJoin('orderTransaction.transaction', 'transaction')
      .where('transaction.id = :transactionId', { transactionId })
      .getMany();

    return orderTransactions.map((ot) => ot.order);
  }

  /**
   * Deletes an OrderTransaction link by order ID and transaction ID.
   * @param orderId - The ID of the Order.
   * @param transactionId - The ID of the Transaction.
   */
  async deleteOrderTransaction(
    orderId: string,
    transactionId: string
  ): Promise<void> {
    await this.ensureOrderTransactionExists(orderId, transactionId);

    await this.repository
      .createQueryBuilder()
      .delete()
      .where('order_id = :orderId', { orderId })
      .andWhere('transaction_id = :transactionId', { transactionId })
      .execute();
  }
}

const orderTransactionRepository = new OrderTransactionRepository();
export { orderTransactionRepository as default, OrderTransactionRepository };
