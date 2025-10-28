import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { BaseModel } from '../baseEntity';
import { PropertyLeaseAgreement } from './propertyLeaseAgreementEntity';
import { PropertyUnitTenantEntity } from './propertyUnitTenantEntity';
import { Organization } from '../organizations/organizationEntity';
import PropertyLeaseCharge from './propertyLeaseChargeEntity';
import { PropertyLeasePaymentEntity } from './propertyLeasePaymentEntity';

export enum LeasePaymentCycleStatus {
  UPCOMING = 'upcoming',
  DUE = 'due',
  OVERDUE = 'overdue',
  PARTIAL = 'partial',
  PAID = 'paid',
  CANCELED = 'canceled',
}

@Entity('property_lease_payment_cycles')
@Index(['lease', 'charge', 'dueDate'], { unique: true })
export class PropertyLeasePaymentCycleEntity extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PropertyLeaseAgreement, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lease_id' })
  lease!: PropertyLeaseAgreement;

  @ManyToOne(() => PropertyUnitTenantEntity, { eager: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: PropertyUnitTenantEntity;

  @ManyToOne(() => Organization, { eager: true })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @ManyToOne(() => PropertyLeaseCharge, { eager: true, nullable: true })
  @JoinColumn({ name: 'charge_id' })
  charge?: PropertyLeaseCharge | null;

  /**
   * Convenience copy of the charge type (e.g. rent, garbage) for quick filtering.
   */
  @Column({ type: 'varchar', length: 64 })
  chargeType!: string;

  @Column({ type: 'date' })
  periodStart!: Date;

  @Column({ type: 'date' })
  periodEnd!: Date;

  @Column({ type: 'date' })
  dueDate!: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amountDue!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amountPaid!: number;

  @Column({ type: 'varchar', length: 3, default: 'KES' })
  currency!: string;

  @Column({ type: 'varchar', length: 16, default: LeasePaymentCycleStatus.UPCOMING })
  status!: LeasePaymentCycleStatus;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @OneToMany(() => PropertyLeasePaymentEntity, (payment) => payment.cycle)
  payments?: PropertyLeasePaymentEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

export default PropertyLeasePaymentCycleEntity;
