import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IsEnum, IsNotEmpty, IsOptional, IsNumber, IsString, MaxLength, IsJSON } from 'class-validator';
import { BaseModel } from '../baseEntity';
import { PropertyLeaseAgreement } from './propertyLeaseAgreementEntity';
import { Organization } from '../organizations/organizationEntity';
import { PropertyUnitTenantEntity } from './propertyUnitTenantEntity';
import { Transaction } from '../transactions/transactionEntity';
import { PropertyLeasePaymentType } from './propertyLeasePaymentTypeEntity';


@Entity('property_lease_payments')
export class PropertyLeasePaymentEntity extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * The lease agreement this payment is for.
   */
  @ManyToOne(() => PropertyLeaseAgreement, (lease) => lease.payments, { eager: true })
  @JoinColumn({ name: 'lease_id' })
  lease!: PropertyLeaseAgreement;

  /**
   * The tenant (payer).
   */
  @ManyToOne(() => PropertyUnitTenantEntity, { eager: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: PropertyUnitTenantEntity;

  /**
   * The organization/landlord receiving the payment.
   */
  @ManyToOne(() => Organization, { eager: true })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  /**
   * Type of payment (rent, deposit, penalty, etc.).
   */
  @ManyToOne(() => PropertyLeasePaymentType, { eager: true })
  @JoinColumn({ name: 'type_id' })
  type!: PropertyLeasePaymentType;

  /**
   * Amount paid.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  @IsNumber()
  amount!: number;

  /**
   * Currency of the payment (ISO code).
   */
  @Column({ type: 'varchar', length: 3 })
  @IsString()
  @MaxLength(3)
  currency!: string;

  /**
   * Link to the transaction record (for payment rails, audits).
   */
  @ManyToOne(() => Transaction, { eager: true })
  @JoinColumn({ name: 'transaction_id' })
  transaction!: Transaction;

  /**
   * Date/time this payment was made.
   */
  @Column({ type: 'timestamp', nullable: false })
  @IsNotEmpty()
  paidAt!: Date;

  /**
   * Extra metadata (for method, split payment details, notes, etc.).
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON()
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
