import {
  IsDecimal,
  IsInt,
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
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseModel } from '../baseEntity';
import { OrderItemConfiguration } from '../orders/orderItemConfigurationEntity';
import { Product } from '../products/productEntity';
import { Service } from '../services/serviceEntity';
import { Order } from './orderEntity';

/**
 * Represents an individual item within an order, which can be a service or a product.
 * Tracks quantity, price, type, and optional configurations.
 */
@Entity('order_items')
export class OrderItem extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * The order that this item is associated with.
   * Establishes a many-to-one relationship with `Order`, with cascading delete.
   */
  @ManyToOne(() => Order, (order) => order.orderItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  /**
   * Type of item, which can be either 'service' or 'product'.
   * Used to determine whether the item relates to a service or a physical product.
   */
  @Column({ type: 'varchar', length: 20 })
  @IsNotEmpty({ message: 'Type cannot be empty' })
  @IsString({ message: 'Type must be a string' })
  @MaxLength(20, { message: 'Type cannot exceed 20 characters' })
  type: 'service' | 'product';

  /**
   * The associated service for this order item, if it is a service.
   * Nullable field, only populated if `type` is 'service'.
   */
  @ManyToOne(() => Service, { nullable: true })
  @JoinColumn({ name: 'service_id' })
  service?: Service;

  /**
   * The associated product for this order item, if it is a product.
   * Nullable field, only populated if `type` is 'product'.
   */
  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  /**
   * Quantity of the item ordered.
   * Defaults to 1 if not specified.
   */
  @Column({ type: 'int', default: 1 })
  @IsInt({ message: 'Quantity must be an integer' })
  quantity: number;

  /**
   * Price per unit of the item.
   * Stored as a decimal with precision for currency handling.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @IsDecimal({}, { message: 'Price must be a decimal number' })
  price: number;

  /**
   * Additional notes for this order item, such as special instructions or comments.
   */
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;

  /**
   * Configuration settings for this order item, if any.
   * This field allows further customization, such as insurance selection.
   */
  @OneToOne(() => OrderItemConfiguration, (config) => config.orderItem, {
    cascade: true,
    nullable: true,
  })
  @JoinColumn()
  configuration?: OrderItemConfiguration;
}
