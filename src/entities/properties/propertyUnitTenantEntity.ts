import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
} from 'typeorm';
import { IsEnum, IsOptional, IsString, MaxLength, IsJSON } from 'class-validator';
import { BaseModel } from '../baseEntity';
import { Property } from './propertyEntity';
import { PropertyUnit } from './propertyUnitEntity';
import { UserEntity } from '../users/userEntity';

export enum UnitTenantStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  PAST = 'past',
  EVICTED = 'evicted',
  REJECTED = 'rejected',
}

@Entity('unit_tenants')
@Index(['property', 'unit', 'user'], { unique: true })
export class PropertyUnitTenantEntity extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Property, { eager: true })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @ManyToOne(() => PropertyUnit, { eager: true })
  @JoinColumn({ name: 'unit_id' })
  unit!: PropertyUnit;

  @ManyToOne(() => UserEntity, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'enum', enum: UnitTenantStatus, default: UnitTenantStatus.ACTIVE })
  @IsEnum(UnitTenantStatus)
  status!: UnitTenantStatus;

  @Column({ type: 'date', nullable: true })
  @IsOptional()
  moveInDate?: Date;

  @Column({ type: 'date', nullable: true })
  @IsOptional()
  moveOutDate?: Date;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON()
  kyc?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON()
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
