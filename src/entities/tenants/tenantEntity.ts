import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsJSON,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
  IsEnum,
} from 'class-validator'
import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  Unique,
  ManyToOne,
} from 'typeorm'
import { BaseModel } from '../baseEntity'
import { UserEntity } from '../users/userEntity'
import { Subscription } from '../subscriptions/subscriptionEntity'
import { Plan } from '../subscriptions/subscriptionPlanEntity'
import { UserTenantMembership } from '../users/userTenantMembershipEntity'
import { UserTenantRole } from '../users/userTenantRoleEntity'

export enum TenantStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
}

@Entity('tenants')
@Unique('UQ_tenant_slug', ['slug'])
@Unique('UQ_tenant_primary_domain', ['primaryDomain'])
@Index('IDX_tenant_status', ['status'])
export class Tenant extends BaseModel {
  /**
   * Unique id for each tenant (short, non-guessable).
   */
  @PrimaryColumn({ type: 'uuid' })
  id!: string

  /**
   * Optional owning tenant for private catalogs. Null => global/public tenant.
   */
  @IsOptional()
  @ManyToOne(() => Tenant, (t) => t.children, { nullable: true, onDelete: 'SET NULL' })
  parent?: Tenant | null

  /**
   * Reverse relation for child tenants (if hierarchical).
   */
  @OneToMany(() => Tenant, (t) => t.parent, { cascade: true })
  children!: Tenant[]

  /**
   * Display name for the tenant (e.g., company/firm/organization name).
   */
  @Column({ type: 'varchar', length: 120 })
  @IsString()
  @MaxLength(120)
  name!: string

  /**
   * URL-safe identifier (slug) for vanity URLs and routing.
   * Example: "acme-law", "greenfarms".
   */
  @Column({ type: 'varchar', length: 60 })
  @IsString()
  @MaxLength(60)
  slug!: string

  /**
   * Tenant lifecycle status.
   */
  @Column({ type: 'enum', enum: TenantStatus, default: TenantStatus.ACTIVE })
  @IsEnum(TenantStatus)
  status!: TenantStatus

  /**
   * Primary/canonical domain for the tenant (optional).
   * Use in SSO callbacks, whitelabel, or host-based routing.
   */
  @Column({ type: 'varchar', length: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  primaryDomain?: string | null

  /**
   * Additional domains (alternate/country domains, etc.).
   * NOTE: For Postgres, this uses text[].
   */
  @Column({ type: 'text', array: true, nullable: true })
  @IsOptional()
  domains?: string[] | null

  /**
   * Preferred locale, timezone and currency for formatting/billing.
   */
  @Column({ type: 'varchar', length: 10, default: 'en' })
  @IsString()
  @MaxLength(10)
  locale!: string

  @Column({ type: 'varchar', length: 60, default: 'Africa/Nairobi' })
  @IsString()
  @MaxLength(60)
  timezone!: string

  @Column({ type: 'char', length: 3, default: 'USD' })
  @IsString()
  @Length(3, 3)
  currency!: string

  /**
   * Billing settings: day-of-month anchor (1–28 to avoid month length issues),
   * trial end, and whether onboarding is complete.
   */
  @Column({ type: 'smallint', default: 1 })
  @IsInt()
  @Min(1)
  @Max(28)
  billingAnchorDay!: number

  @Column({ type: 'timestamptz', nullable: true })
  @IsOptional()
  trialEnd?: Date | null

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  onboardingCompleted!: boolean

  /**
   * Contact profile for tenant admins/finance.
   */
  @Column({ type: 'varchar', length: 160, nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  contactEmail?: string | null

  @Column({ type: 'varchar', length: 30, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string | null

  /**
   * Whitelabel/branding settings.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'branding must be a valid JSON object' })
  branding?: {
    logoUrl?: string
    faviconUrl?: string
    primaryColor?: string
    secondaryColor?: string
    [k: string]: any
  }

  /**
   * Feature flags and policy limits (forward-compatible).
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
   * Optional per-tenant database config for HARD isolation (BYO DB/schema).
   * DO NOT store secrets in plaintext—reference secret IDs/aliases instead.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'dbConfig must be a valid JSON object' })
  dbConfig?: {
    driver?: 'postgres'
    host?: string
    port?: number
    database?: string
    schema?: string
    readReplicas?: Array<{ host: string; port?: number }>
    secretRef?: string // e.g., ARN or vault path for credentials
    [k: string]: any
  }

  /**
   * Arbitrary configuration & metadata.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'config must be a valid JSON object' })
  config?: Record<string, any>

  /**
   * Reverse relations.
   */
  @OneToMany(() => UserEntity, (u) => u.tenant, { cascade: ['remove'] })
  users!: UserEntity[]

  @OneToMany(() => UserTenantRole, (utr) => utr.tenant, { cascade: ['remove'] })
  roles!: UserTenantRole[]

  /**
   * Memberships relations for subscriptions and plans.
   */
  @OneToMany(() => UserTenantMembership, (utm) => utm.tenant, { cascade: ['remove'] })
  memberships!: UserTenantMembership[]


  @OneToMany(() => Subscription, (s) => s.tenant, { cascade: ['remove'] })
  subscriptions!: Subscription[]

  @OneToMany(() => Plan, (p) => p.tenant, { cascade: ['remove'] })
  plans!: Plan[]
}
