import {
  IsEnum,
  IsJSON,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator'
import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { BaseModel } from '../baseEntity'
import { Tenant } from '../tenants/tenantEntity'
import { UserEntity } from '../users/userEntity'
import { Plan } from '../subscriptions/subscriptionPlanEntity'
import { PaymentMethod } from '../payments/paymentMethodEntity'
import { SubscriptionItem } from './subscriptionItemEntity'
import { SubscriptionEvent } from './subscriptionEventEntity'
import { BillingCycle, SubscriptionStatus } from '../../constants/subscriptions/billingEnums' 

@Entity('subscriptions')
@Index('IDX_subscription_status', ['status'])
@Index('IDX_subscription_period', ['currentPeriodEnd'])
export class Subscription extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  /**
   * Tenant that owns this subscription (hard isolation for multi-tenant SaaS).
   */
  @ManyToOne(() => Tenant, (t) => t.subscriptions, { onDelete: 'CASCADE' })
  tenant!: Tenant

  /**
   * The customer/end-user this subscription applies to.
   * Could be your "organization", "account", or "user" model depending on your domain.
   */
  @ManyToOne(() => UserEntity, (c) => c.subscriptions, { onDelete: 'CASCADE' })
  user!: UserEntity

  /**
   * The pricing plan chosen when the subscription was created.
   * Keep a price snapshot to protect against plan changes over time.
   */
  @ManyToOne(() => Plan, (p) => p.subscriptions)
  plan!: Plan

  /**
   * Current state of the subscription lifecycle.
   */
  @Column({ type: 'enum', enum: SubscriptionStatus })
  @IsEnum(SubscriptionStatus)
  status!: SubscriptionStatus

  /**
   * Billing cadence for the subscription.
   */
  @Column({ type: 'enum', enum: BillingCycle })
  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle

  /**
   * Period tracking (used for invoicing, renewals, proration).
   */
  @Column({ type: 'timestamptz', default: () => 'now()' })
  startDate!: Date

  @Column({ type: 'timestamptz' })
  currentPeriodStart!: Date

  @Column({ type: 'timestamptz' })
  currentPeriodEnd!: Date

  /**
   * Optional trial window and end-of-life timestamps.
   */
  @Column({ type: 'timestamptz', nullable: true })
  @IsOptional()
  trialEnd?: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  @IsOptional()
  canceledAt?: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  @IsOptional()
  endedAt?: Date | null

  /**
   * Price snapshot at time of (latest) activation/change.
   * Keep both structured fields for common queries and a JSON snapshot for fidelity.
   */
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  @IsNumber()
  amount!: number

  @Column({ type: 'char', length: 3, default: 'USD' })
  @IsString()
  @Length(3, 3)
  currency!: string

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'priceSnapshot must be a valid JSON object' })
  priceSnapshot?: {
    priceId?: string
    baseAmount: number
    currency: string
    components?: Array<{
      code: string
      amount: number
      unit?: 'percentage' | 'fixed'
      description?: string
    }>
    taxes?: Array<{ code: string; rate: number }>
    discounts?: Array<{ code: string; amount?: number; percent?: number }>
    [k: string]: any
  }

  /**
   * Payment method used for auto-renewal (nullable when invoice-based).
   */
  @ManyToOne(() => PaymentMethod, (pm) => pm.subscriptions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @IsOptional()
  paymentMethod?: PaymentMethod | null

  /**
   * Optional external references (Stripe/PayPal/etc).
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalProvider?: string | null

  @Column({ type: 'varchar', length: 150, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  externalSubscriptionId?: string | null

  /**
   * Optional reason/status detail (e.g., dunning reason, compliance hold).
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  statusReason?: string | null

  /**
   * Relations to items (feature quantities, add-ons) and event log (audit trail).
   */
  @OneToMany(() => SubscriptionItem, (i) => i.subscription, { cascade: true })
  items!: SubscriptionItem[]

  @OneToMany(() => SubscriptionEvent, (e) => e.subscription, { cascade: true })
  events!: SubscriptionEvent[]
}
