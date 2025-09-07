import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import {
  IsDate,
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsJSON,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { BaseModel } from '../baseEntity';
import { PropertyUnit } from './propertyUnitEntity';
import { PropertyUnitTenantEntity } from './propertyUnitTenantEntity';
import { Organization } from '../organizations/organizationEntity';
import { PropertyLeasePaymentEntity } from './propertyLeasePaymentEntity';
import { PropertyLeasePaymentType } from './propertyLeasePaymentTypeEntity';
import { PropertyOwnerEntity } from './propertyOwnerEntity';

export enum LeaseStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  TERMINATED = 'terminated',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
}

export enum LeaseType {
  FIXED_TERM = 'fixed_term',
  PERIODIC = 'periodic',
}

export enum LeaseChargeType {
  RENT = 'rent',
  OTHER = 'other',
}

export enum PaymentFrequency {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export enum EsignatureStatus {
  PENDING = 'pending',
  SIGNED = 'signed',
  REJECTED = 'rejected',
  CANCELED = 'canceled',
}

export interface EsignatureParty {
  role: 'landlord' | 'tenant' | 'witness' | 'agent' | string;
  userId: string;
  name: string;
  email: string;
  status: EsignatureStatus;
  signedAt?: Date;
  signatureUrl?: string;
  metadata?: Record<string, any>;
  provider?: string;
  providerSignatureId?: string;
}

@Entity('lease_agreements')
@Index(['unit', 'tenant', 'startDate'], { unique: true })
export class PropertyLeaseAgreement extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Property unit being leased.
   */
  @ManyToOne(() => PropertyUnit, (unit) => unit.leases, { eager: true })
  @JoinColumn({ name: 'unit_id' })
  unit!: PropertyUnit;

  /**
   * Tenant/user.
   */
  @ManyToOne(() => PropertyUnitTenantEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: PropertyUnitTenantEntity;

  /**
   * Owner with landlord rights.
   */
  @ManyToOne(() => PropertyOwnerEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'owner_id' })
  landlord?: PropertyOwnerEntity | null;

  /**
   * Owning organization (derived from the property's organization).
   */
  @ManyToOne(() => Organization, { eager: true, nullable: false })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  /**
   * Lease start and end dates.
   */
  @Column({ type: 'date' })
  @IsDate()
  startDate!: Date;

  @Column({ type: 'date' })
  @IsDate()
  endDate!: Date;

  /**
   * Monthly rent amount.
   */
  @Column({ type: 'decimal', precision: 14, scale: 2 })
  @IsNumber()
  amount!: number;

  /**
   * Lease modality and billing configuration.
   */
  @Column({ type: 'varchar', length: 20, default: LeaseType.FIXED_TERM })
  @IsEnum(LeaseType)
  leaseType!: LeaseType;

  @Column({ type: 'varchar', length: 20, default: LeaseChargeType.RENT })
  @IsEnum(LeaseChargeType)
  chargeType!: LeaseChargeType;

  @Column({ type: 'varchar', length: 20, default: PaymentFrequency.MONTHLY })
  @IsEnum(PaymentFrequency)
  paymentFrequency!: PaymentFrequency;

  /**
   * Optional first due date for the billing schedule (defaults to startDate when absent).
   */
  @Column({ type: 'date', nullable: true })
  @IsOptional()
  firstPaymentDate?: Date | null;

  /**
   * Status of the lease.
   */
  @Column({ type: 'varchar', length: 16, default: LeaseStatus.PENDING })
  @IsEnum(LeaseStatus)
  status!: LeaseStatus;

  /**
   * E-signature parties and workflow.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON()
  esignatures?: EsignatureParty[];

  /**
   * The final signed document (PDF, image, etc.).
   */
  @Column({ type: 'varchar', length: 256, nullable: true })
  @IsOptional()
  @IsString()
  signedDocumentUrl?: string;

  /**
   * Raw hash or blockchain hash of final signed contract (optional).
   */
  @Column({ type: 'varchar', length: 256, nullable: true })
  @IsOptional()
  @IsString()
  contractHash?: string;

  /**
   * Terms and conditions or extra details (JSON for future flexibility).
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON()
  terms?: Record<string, any>;

  /**
   * List of related payments for this lease.
   */
  @OneToMany(() => PropertyLeasePaymentEntity, (payment) => payment.lease)
  payments?: PropertyLeasePaymentEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
