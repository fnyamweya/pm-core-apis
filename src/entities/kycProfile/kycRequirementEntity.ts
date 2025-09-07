import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from '../accessControl/roleEntity';
import { BaseModel } from '../baseEntity';
import { OrganizationType } from '../organizations/organizationTypeEntity';

export enum KycDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  JSON = 'json',
}

@Entity('kyc_requirements')
@Index(['role', 'organizationType', 'name'], { unique: true })
@Index(['dataType', 'isRequired'])
export class KycRequirement extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  @IsString({ message: 'KYC name must be a string.' })
  @MaxLength(100, { message: 'KYC name cannot exceed 100 characters.' })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString({ message: 'Description must be a string.' })
  @MaxLength(255, { message: 'Description cannot exceed 255 characters.' })
  description?: string;

  @Column({
    type: 'enum',
    enum: KycDataType,
  })
  @IsEnum(KycDataType, {
    message:
      'Data type must be one of: string, number, boolean, date, or json.',
  })
  dataType!: KycDataType;

  @Column({ type: 'boolean', default: true })
  @IsBoolean({ message: 'isRequired must be a boolean value.' })
  isRequired!: boolean;

  @ManyToOne(() => Role, (role) => role.KycRequirements, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  role?: Role;

  @ManyToOne(() => OrganizationType, (orgType) => orgType.KycRequirements, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  organizationType?: OrganizationType;
}
