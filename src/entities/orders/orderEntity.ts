import {
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderStatus, PaymentStatus } from '../../constants/orders';
import { BaseModel } from '../baseEntity';
import { UserAddress } from '../users/userAddressEntity';
import { UserOrder } from '../users/userOrderEntity';
import { OrderItem } from './orderItemEntity';
import { OrderTransaction } from './orderTransactionEntity';

/**
 * Order entity representing a user's order containing various items.
 * Tracks the status, payment status, date, and associated users and items.
 */
@Entity('orders')
export class Order extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Unique code for tracking the order within the system.
   * Typically used for reference in customer communications and order tracking.
   */
  @Column({ type: 'varchar', length: 20, unique: true })
  @IsNotEmpty({ message: 'Order number cannot be empty' })
  @IsString({ message: 'Order number must be a string' })
  @MaxLength(20, { message: 'Order number cannot exceed 20 characters' })
  orderNumber: string;

  /**
   * Total price of all items included in the order.
   * Calculated as the sum of the price of each order item multiplied by its quantity.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @IsDecimal({}, { message: 'Total price must be a decimal number' })
  orderTotal: number;

  /**
   * Current status of the order, indicating the progress through the order workflow.
   * Example values include 'pending', 'confirmed', 'completed', or 'canceled'.
   */
  @Column({ type: 'enum', enum: OrderStatus })
  @IsEnum(OrderStatus, { message: 'Invalid order status' })
  orderStatus: OrderStatus;

  /**
   * Payment status of the order, showing if the order has been paid, is unpaid, or was refunded.
   */
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.UNPAID })
  @IsEnum(PaymentStatus, { message: 'Invalid payment status' })
  paymentStatus: PaymentStatus;

  /**
   * Date and time when the order was placed.
   * This field is optional and may be null if the order date is not provided at creation.
   */
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  orderDate?: Date;

  /**
   * Additional notes or instructions associated with the order.
   * These may include special requests, delivery instructions, or customer comments.
   */
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;

  /**
   * Collection of user associations for this order, such as the customer placing the order or admins managing it.
   * This establishes a one-to-many relationship with the `UserOrder` entity.
   */
  @OneToMany(() => UserOrder, (userOrder) => userOrder.order, {
    onDelete: 'CASCADE',
  })
  userOrders: UserOrder[];

  /**
   * Collection of items included within the order.
   * Each item may represent a service or physical product and has an associated quantity and price.
   * Establishes a one-to-many relationship with the `OrderItem` entity.
   */
  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { cascade: true })
  orderItems: OrderItem[];

  /**
   * Collection of transactions associated with this order.
   * Allows an order to reference multiple transactions through the OrderTransaction join table.
   */
  @OneToMany(
    () => OrderTransaction,
    (orderTransaction) => orderTransaction.order
  )
  orderTransactions: OrderTransaction[];

  /**
   * Reference to the address associated with this order, such as for delivery.
   */
  @ManyToOne(() => UserAddress, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'address_id' })
  @IsOptional()
  address?: UserAddress;
}
