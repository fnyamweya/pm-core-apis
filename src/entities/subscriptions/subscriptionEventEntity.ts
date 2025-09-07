import {
  IsEnum,
  IsJSON,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'
import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { BaseModel } from '../baseEntity'
import {
  Subscription,
} from './subscriptionEntity'
import { SubscriptionStatus } from '../../constants/subscriptions/billingEnums'

export enum SubscriptionEventType {
  CREATED = 'created',
  ACTIVATED = 'activated',
  RENEWED = 'renewed',
  PERIOD_ADVANCED = 'period_advanced',
  PLAN_CHANGED = 'plan_changed',
  QUANTITY_CHANGED = 'quantity_changed',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  PAST_DUE = 'past_due',
  PAUSED = 'paused',
  RESUMED = 'resumed',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
  TRIAL_STARTED = 'trial_started',
  TRIAL_ENDED = 'trial_ended',
}

@Entity('subscription_events')
@Index('IDX_subevent_subscription', ['subscription'])
@Index('IDX_subevent_occurred_at', ['occurredAt'])
export class SubscriptionEvent extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string

  /**
   * Parent subscription (events deleted when subscription is deleted).
   */
  @ManyToOne(() => Subscription, (s) => s.events, { onDelete: 'CASCADE' })
  subscription!: Subscription

  /**
   * Event type taxonomy for analytics/audit trails.
   */
  @Column({ type: 'enum', enum: SubscriptionEventType })
  @IsEnum(SubscriptionEventType)
  type!: SubscriptionEventType

  /**
   * Optional state transition details.
   */
  @Column({ type: 'enum', enum: SubscriptionStatus, nullable: true })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  previousStatus?: SubscriptionStatus | null

  @Column({ type: 'enum', enum: SubscriptionStatus, nullable: true })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  newStatus?: SubscriptionStatus | null

  /**
   * When the event happened (defaults to now()).
   */
  @Column({ type: 'timestamptz', default: () => 'now()' })
  occurredAt!: Date

  /**
   * Optional human-readable reason (e.g., "customer request", "dunning step 3").
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string | null

  /**
   * Arbitrary payload (webhook body, computed diff, etc.).
   */
  @Column({ type: 'jsonb', default: {} })
  @IsJSON({ message: 'payload must be a valid JSON object' })
  payload!: Record<string, any>

  /**
   * Correlation helpers for tracing.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  correlationId?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  requestId?: string | null

  @Column({ type: 'varchar', length: 45, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(45)
  ipAddress?: string | null
}
