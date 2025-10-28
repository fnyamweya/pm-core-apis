import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { BaseModel } from '../baseEntity';
import { PropertyLeaseAgreement } from './propertyLeaseAgreementEntity';
import { PropertyUnitTenantEntity } from './propertyUnitTenantEntity';
import { Organization } from '../organizations/organizationEntity';
import { Transaction } from '../transactions/transactionEntity';
import { PropertyLeasePaymentType } from './propertyLeasePaymentTypeEntity';

@Entity('property_lease_transactions')
export class PropertyLeaseTransactionEntity extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PropertyLeaseAgreement, { eager: true })
  @JoinColumn({ name: 'lease_id' })
  lease!: PropertyLeaseAgreement;

  @ManyToOne(() => PropertyUnitTenantEntity, { eager: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: PropertyUnitTenantEntity;

  @ManyToOne(() => Organization, { eager: true })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @ManyToOne(() => Transaction, { eager: true })
  @JoinColumn({ name: 'transaction_id' })
  transaction!: Transaction;

  // Category/type for domain semantics (e.g., RENT, DEPOSIT, LATE_FEE)
  @ManyToOne(() => PropertyLeasePaymentType, { eager: true })
  @JoinColumn({ name: 'type_id' })
  type!: PropertyLeasePaymentType;

  // Optional payment date override if needed
  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date | null;
}

export default PropertyLeaseTransactionEntity;

