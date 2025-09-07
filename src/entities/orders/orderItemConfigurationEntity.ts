import { IsBoolean, IsObject, IsOptional } from 'class-validator';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseModel } from '../baseEntity';
import { InsurancePolicy } from '../insurance/insurancePolicyEntity';
import { OrderItem } from './orderItemEntity';

/**
 * Configuration details associated with a specific order item.
 * Allows customization of insurance selection and additional configurations.
 */
@Entity('order_item_configurations')
export class OrderItemConfiguration extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * The associated order item for this configuration.
   * A one-to-one relationship with `OrderItem`, which will be deleted if the associated order item is deleted.
   */
  @OneToOne(() => OrderItem, (orderItem) => orderItem.configuration, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  orderItem: OrderItem;

  /**
   * Indicates if insurance is selected for this order item.
   * Defaults to `false` if not specified.
   */
  @Column({ type: 'boolean', default: false })
  @IsBoolean({ message: 'insuranceSelected must be a boolean' })
  insuranceSelected: boolean;

  /**
   * Associated insurance policy for the order item, if any.
   * Nullable; if the policy is deleted, this field will be set to `NULL`.
   */
  @OneToOne(() => InsurancePolicy, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  insurancePolicy?: InsurancePolicy;

  /**
   * Additional configuration details for the order item.
   * Stored as a JSON object, allowing for flexible customization options.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject({ message: 'additionalConfig must be a valid JSON object' })
  additionalConfig?: Record<string, any>;
}
