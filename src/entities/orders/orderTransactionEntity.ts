import { IsNotEmpty } from 'class-validator';
import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseModel } from '../baseEntity';
import { Transaction } from '../transactions/transactionEntity';
import { Order } from './orderEntity';

@Entity('order_transactions')
export class OrderTransaction extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Reference to the order in this transaction relationship.
   */
  @ManyToOne(() => Order, (order) => order.orderTransactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  @IsNotEmpty({ message: 'Order reference cannot be empty.' })
  order: Order;

  // /**
  //  * Reference to the transaction in this order relationship.
  //  */
  // @ManyToOne(
  //   () => Transaction,
  //   (transaction) => transaction.orderTransactions,
  //   {
  //     onDelete: 'CASCADE',
  //   }
  // )
  // @JoinColumn({ name: 'transaction_id' })
  // @IsNotEmpty({ message: 'Transaction reference cannot be empty.' })
  // transaction: Transaction;
}
