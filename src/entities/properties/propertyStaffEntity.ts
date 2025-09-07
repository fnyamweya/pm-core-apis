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
import { IsEnum, IsString, MaxLength, IsOptional, IsJSON } from 'class-validator';
import { BaseModel } from '../baseEntity';
import { Property } from './propertyEntity';
import { UserEntity } from '../users/userEntity';

export enum PropertyStaffRole {
  CARETAKER = 'caretaker',
  SECURITY = 'security',
  MANAGER = 'manager',
  MAINTENANCE = 'maintenance',
  AGENT = 'agent',
  CLEANER = 'cleaner',
  CUSTOM = 'custom', // For extensibility
}

export enum PropertyStaffStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
  PENDING = 'pending',
}

@Entity('property_staff')
@Index(['property', 'user', 'role'], { unique: true })
export class PropertyStaffEntity extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Property, (property) => property.staff, { eager: true })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @ManyToOne(() => UserEntity, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'enum', enum: PropertyStaffRole })
  @IsEnum(PropertyStaffRole)
  role!: PropertyStaffRole;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customRole?: string;

  @Column({ type: 'enum', enum: PropertyStaffStatus, default: PropertyStaffStatus.ACTIVE })
  @IsEnum(PropertyStaffStatus)
  status!: PropertyStaffStatus;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON()
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
