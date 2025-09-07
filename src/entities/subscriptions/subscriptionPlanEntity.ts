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
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
import { BaseModel } from '../baseEntity'
import { Tenant } from '../tenants/tenantEntity'
import { Subscription } from '../subscriptions/subscriptionEntity'
import { BillingCycle } from '../../constants/subscriptions/billingEnums'

export enum PlanStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

@Entity('plans')
@Unique('UQ_plan_code', ['code'])
@Index('IDX_plan_status', ['status'])
export class Plan extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  /**
   * Optional owning tenant for private catalogs. Null => global/public plan.
   */
  @ManyToOne(() => Tenant, (t) => t.plans, { nullable: true, onDelete: 'SET NULL' })
  @IsOptional()
  tenant?: Tenant | null

  /**
   * Short, human-readable code (unique).
   */
  @Column({ type: 'varchar', length: 60 })
  @IsString()
  @MaxLength(60)
  code!: string

  /**
   * Display name & description.
   */
  @Column({ type: 'varchar', length: 120 })
  @IsString()
  @MaxLength(120)
  name!: string

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null

  /**
   * Plan lifecycle & cadence.
   */
  @Column({ type: 'enum', enum: PlanStatus, default: PlanStatus.DRAFT })
  @IsEnum(PlanStatus)
  status!: PlanStatus

  @Column({ type: 'enum', enum: BillingCycle, default: BillingCycle.MONTHLY })
  @IsEnum(BillingCycle)
  defaultBillingCycle!: BillingCycle

  /**
   * Base price snapshot for the plan (you can also model tiered prices separately).
   */
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  @IsNumber()
  baseAmount!: number

  @Column({ type: 'char', length: 3, default: 'USD' })
  @IsString()
  @Length(3, 3)
  currency!: string

  /**
   * Free trial days (0 => no trial).
   */
  @Column({ type: 'integer', default: 0 })
  @IsInt()
  @Min(0)
  trialDays!: number

  /**
   * Feature flags/limits your app enforces (forward-compatible).
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'features must be a valid JSON object' })
  features?: Record<string, any>

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'limits must be a valid JSON object' })
  limits?: Record<string, any>

  /**
   * Visibility and metadata.
   */
  @Column({ type: 'boolean', default: true })
  isPublic!: boolean

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'metadata must be a valid JSON object' })
  metadata?: Record<string, any>

  /**
   * Reverse relation to subscriptions on this plan.
   */
  @OneToMany(() => Subscription, (s) => s.plan)
  subscriptions!: Subscription[]
}
