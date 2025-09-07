import {
  IsEnum,
  IsInt,
  IsJSON,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator'
import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
import { BaseModel } from '../baseEntity'
import { Subscription } from './subscriptionEntity'

export enum SubscriptionItemBillingMode {
  LICENSED = 'licensed',
  METERED = 'metered',
}

export enum UsageAggregation {
  SUM = 'sum',
  PEAK = 'peak',
  UNIQUE = 'unique',
}

@Entity('subscription_items')
@Index('IDX_subitem_subscription', ['subscription'])
@Unique('UQ_subitem_subscription_code', ['subscription', 'itemCode'])
export class SubscriptionItem extends BaseModel {
  /**
   * Unique id for each item on a subscription.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string

  /**
   * Parent subscription (items deleted when subscription is deleted).
   */
  @ManyToOne(() => Subscription, (s) => s.items, { onDelete: 'CASCADE' })
  subscription!: Subscription

  /**
   * Business identifier for the item (e.g., "SEATS", "API_CALLS").
   */
  @Column({ type: 'varchar', length: 80 })
  @IsString()
  @MaxLength(80)
  itemCode!: string

  /**
   * Human name (optional).
   */
  @Column({ type: 'varchar', length: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string | null

  /**
   * Quantity for licensed items (defaults to 1). For metered, this is the cap or
   * default included units (if applicable).
   */
  @Column({ type: 'integer', default: 1 })
  @IsInt()
  @Min(0)
  quantity!: number

  /**
   * Unit amount snapshot (amount per unit, if licensed) for invoices.
   */
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  @IsNumber()
  unitAmount!: number

  @Column({ type: 'char', length: 3, default: 'USD' })
  @IsString()
  @Length(3, 3)
  currency!: string

  /**
   * Billing mode: licensed vs. metered.
   */
  @Column({ type: 'enum', enum: SubscriptionItemBillingMode })
  @IsEnum(SubscriptionItemBillingMode)
  billingMode!: SubscriptionItemBillingMode

  /**
   * Metered usage aggregation policy (if metered).
   */
  @Column({ type: 'enum', enum: UsageAggregation, nullable: true })
  @IsOptional()
  @IsEnum(UsageAggregation)
  usageAggregation?: UsageAggregation | null

  /**
   * Unit of measure (e.g., "seat", "request", "GB").
   */
  @Column({ type: 'varchar', length: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  measureUnit?: string | null

  /**
   * Price snapshot for this item (taxes/discounts/tiers).
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'priceSnapshot must be a valid JSON object' })
  priceSnapshot?: Record<string, any>

  /**
   * External product/price references (Stripe price ID, etc.).
   */
  @Column({ type: 'varchar', length: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalPriceId?: string | null
}
