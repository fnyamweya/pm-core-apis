import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { BaseModel } from '../baseEntity';
import { PropertyLeaseAgreement } from './propertyLeaseAgreementEntity';

export enum LeaseChargeFrequency {
  ONE_OFF = 'one-off',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'bi-weekly',
  QUARTERLY = 'quarterly',
  MONTHLY = 'monthly',
  BIYEARLY = 'bi-yearly',
  YEARLY = 'yearly',
}

@Entity('lease_charges')
@Index(['lease', 'chargeType', 'label'])
export class PropertyLeaseCharge extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PropertyLeaseAgreement, (lease) => lease.id, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lease_id' })
  lease!: PropertyLeaseAgreement;

  @Column({ type: 'varchar', length: 64 })
  @IsString()
  @MaxLength(64)
  chargeType!: string; // rent, garbage, deposit, custom, etc.

  @Column({ type: 'varchar', length: 128, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  label?: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  @IsNumber()
  amount!: number;

  @Column({ type: 'varchar', length: 16 })
  @IsEnum(LeaseChargeFrequency)
  frequency!: LeaseChargeFrequency;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  @IsOptional()
  lastNotifiedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

export default PropertyLeaseCharge;
