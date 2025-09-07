import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { IsOptional, IsString, MaxLength, IsEnum, IsNumber, IsJSON } from 'class-validator';
import { BaseModel } from '../baseEntity';
import { Property } from './propertyEntity';
import { Organization } from '../organizations/organizationEntity';
import { UserEntity } from '../users/userEntity';

export enum OwnerType {
  INDIVIDUAL = 'individual',
  ORGANIZATION = 'organization',
}

export enum OwnerRole {
  LANDLORD = 'landlord',
  CO_OWNER = 'co-owner',
  INVESTOR = 'investor',
  CUSTOM = 'custom',
}

@Entity('property_owners')
@Index(['property', 'user', 'organization'], { unique: true })
export class PropertyOwnerEntity extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * The property for which this entity is an owner.
   */
  @ManyToOne(() => Property, (property) => property.owners, { eager: true })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  /**
   * Owner type: INDIVIDUAL or ORGANIZATION
   */
  @Column({ type: 'enum', enum: OwnerType })
  @IsEnum(OwnerType)
  ownerType!: OwnerType;

  /**
   * Role of the owner (e.g., landlord, co-owner). 
   */
  @Column({ type: 'enum', enum: OwnerRole, default: OwnerRole.LANDLORD })
  @IsEnum(OwnerRole)
  role!: OwnerRole;

  /**
   * User (if individual owner).
   */
  @ManyToOne(() => UserEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'user_id' })
  @IsOptional()
  user?: UserEntity;

  /**
   * Organization (if organizational owner).
   */
  @ManyToOne(() => Organization, { nullable: true, eager: true })
  @JoinColumn({ name: 'organization_id' })
  @IsOptional()
  organization?: Organization;

  /**
   * Ownership percentage (for fractional or joint ownership).
   * E.g., 100 = sole owner, 50 = joint, etc.
   */
  @Column({ type: 'float', default: 100 })
  @IsOptional()
  @IsNumber()
  ownershipPercentage?: number;

  /**
   * Status of this ownership (e.g., active, pending transfer, relinquished).
   */
  @Column({ type: 'varchar', length: 24, default: 'active' })
  @IsString()
  @MaxLength(24)
  status!: string;

  /**
   * KYC or compliance details (JSONB, extensible for audit/tracking).
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON()
  kyc?: Record<string, any>;

  /**
   * Metadata (notes, tags, docs, etc.).
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