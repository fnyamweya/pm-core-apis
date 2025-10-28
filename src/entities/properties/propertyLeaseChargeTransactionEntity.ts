import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, Index } from 'typeorm';
import { BaseModel } from '../baseEntity';
import PropertyLeaseCharge from './propertyLeaseChargeEntity';
import PropertyLeaseTransactionEntity from './propertyLeaseTransactionEntity';

@Entity('property_lease_charge_transactions')
@Index(['charge', 'appliesToDate'])
export class PropertyLeaseChargeTransactionEntity extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PropertyLeaseTransactionEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lease_transaction_id' })
  leaseTransaction!: PropertyLeaseTransactionEntity;

  @ManyToOne(() => PropertyLeaseCharge, { eager: true })
  @JoinColumn({ name: 'charge_id' })
  charge!: PropertyLeaseCharge;

  // The specific schedule occurrence this allocation applies to
  @Column({ type: 'date', nullable: true })
  appliesToDate?: Date | null;

  // Amount allocated from the parent transaction to this charge occurrence
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount!: number;
}

export default PropertyLeaseChargeTransactionEntity;

