import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseModel } from '../baseEntity';

/**
 * ValidityPeriod defines the start and end date for a policy's validity.
 */
class ValidityPeriod {
  @IsOptional()
  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate!: string;
}

/**
 * TimeConstraints defines the time-based constraints for a policy.
 */
class TimeConstraints {
  @IsOptional()
  @IsString({ message: 'Start time must be a valid string (e.g., 09:00:00)' })
  startTime!: string;

  @IsOptional()
  @IsString({ message: 'End time must be a valid string (e.g., 17:00:00)' })
  endTime!: string;

  @IsOptional()
  @IsEnum(
    [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ],
    { each: true, message: 'Days of week must be valid weekdays' }
  )
  daysOfWeek?: string[];
}

/**
 * GeoConstraints defines the geographical constraints for a policy.
 */
class GeoConstraints {
  @IsOptional()
  @IsUUID(undefined, {
    each: true,
    message: 'Allowed service locations must be valid UUIDs',
  })
  @IsString({
    each: true,
    message: 'Allowed regions must be an array of strings',
  })
  allowedRegions?: string[];

  @IsOptional()
  @IsUUID(undefined, {
    each: true,
    message: 'Denied service locations must be valid UUIDs',
  })
  @IsString({
    each: true,
    message: 'Denied regions must be an array of strings',
  })
  deniedRegions?: string[];
}

/**
 * AuditMetadata defines audit-related information for a policy.
 */
class AuditMetadata {
  @IsOptional()
  @IsString({ message: 'Last modified by must be a string' })
  lastModifiedBy?: string;

  @IsOptional()
  @IsDateString()
  lastModifiedAt?: string;

  @IsOptional()
  @IsDateString()
  lastEvaluatedAt?: string;
}

/**
 * PolicyEntity represents access control policies.
 */
@Entity('access_policies')
export class AccessPolicy extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  @IsNotEmpty({ message: 'Resource name cannot be empty' })
  @IsString({ message: 'Resource name must be a string' })
  @MaxLength(128, { message: 'Resource name cannot exceed 128 characters' })
  resource!: string;

  @Column({ type: 'varchar', length: 128 })
  @IsNotEmpty({ message: 'Action cannot be empty' })
  @IsString({ message: 'Action must be a string' })
  @MaxLength(128, { message: 'Action cannot exceed 128 characters' })
  action!: string;

  @Column({
    type: 'enum',
    enum: ['ALLOW', 'DENY', 'LOG', 'NOTIFY', 'AUDIT'],
    default: 'ALLOW',
  })
  @IsEnum(['ALLOW', 'DENY', 'LOG', 'NOTIFY', 'AUDIT'], {
    message: 'Effect must be one of ALLOW, DENY, LOG, NOTIFY, AUDIT',
  })
  effect!: 'ALLOW' | 'DENY' | 'LOG' | 'NOTIFY' | 'AUDIT';

  @Column({ type: 'int', default: 1 })
  @Min(1, { message: 'Priority must be at least 1' })
  priority!: number;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsArray({ message: 'Conditions must be an array' })
  conditions?: Array<{
    attribute: string;
    operator: string;
    value: string | number | boolean | string[];
  }>;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsArray({ message: 'Nested conditions must be an array' })
  nestedConditions?: Array<{
    logicalOperator: 'AND' | 'OR';
    conditions: Array<{
      attribute: string;
      operator: string;
      value: string | number | boolean | string[];
    }>;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsArray({ message: 'Overrides must be an array of strings' })
  overrides?: string[];

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimeConstraints)
  timeConstraints?: TimeConstraints;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeoConstraints)
  geoConstraints?: GeoConstraints;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ValidityPeriod)
  validity?: ValidityPeriod;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Custom logic must be a string' })
  customLogic?: string;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AuditMetadata)
  audit?: AuditMetadata;
}
