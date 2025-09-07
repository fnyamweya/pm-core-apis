import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsJSON,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import {
  InsuranceDeductibleRuleType,
  InsuranceRateType,
} from '../../constants/insurance';
import { BaseModel } from '../baseEntity';
import { InsuranceProvider } from './insuranceProviderEntity';

@Entity('insurance_policies')
export class InsurancePolicy extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Unique code for the insurance policy, typically used for identification.
   */
  @Column({ type: 'varchar', length: 20, unique: true })
  @IsString({ message: 'Insurance policy code must be a string.' })
  @MaxLength(20, {
    message: 'Insurance policy code cannot exceed 20 characters.',
  })
  insurancePolicyCode: string;

  /**
   * Name of the insurance policy.
   */
  @Column({ type: 'varchar', length: 100 })
  @IsString({ message: 'Policy name must be a string.' })
  @MaxLength(100, { message: 'Policy name cannot exceed 100 characters.' })
  name: string;

  /**
   * Reference to the insurance provider offering this policy.
   */
  @ManyToOne(() => InsuranceProvider, { onDelete: 'CASCADE', nullable: false })
  provider: InsuranceProvider;

  /**
   * Type of premium, either percentage-based or fixed.
   */
  @Column({ type: 'varchar', length: 20 })
  @IsEnum(InsuranceRateType, {
    message: 'Rate type must be either "percentage" or "fixed".',
  })
  rateType: InsuranceRateType;

  /**
   * The premium rate or cost of the policy, based on the rate type.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  @IsNumber({}, { message: 'Premium must be a numeric value.' })
  premium: number;

  /**
   * Maximum coverage amount, if applicable.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Maximum coverage amount must be a numeric value.' })
  maxCoverageAmount?: number;

  /**
   * Deductible rule configuration with dynamic conditions.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'Deductible rule must be a valid JSON object.' })
  deductibleRule?: {
    type: InsuranceDeductibleRuleType;
    conditions: Array<{ type: InsuranceRateType; value: number }>;
    nestedConditions?: Array<{
      type: InsuranceDeductibleRuleType;
      conditions: any[];
    }>;
  };

  /**
   * Additional policy details, exclusions, or specific terms.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'Policy details must be a valid JSON object.' })
  policyDetails?: Record<string, any>;

  /**
   * Description or notes about the policy.
   */
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Description must be a string.' })
  description?: string;

  /**
   * Status indicating if the policy is currently active.
   */
  @Column({ type: 'boolean', default: true })
  @IsBoolean({ message: 'isActive must be a boolean value.' })
  isActive: boolean;

  /**
   * Optional start date of the policy's effectiveness.
   */
  @Column({ type: 'date', nullable: true })
  @IsOptional()
  @IsDate({ message: 'Effective from must be a valid date.' })
  effectiveFrom?: Date;

  /**
   * Optional end date of the policy's effectiveness.
   */
  @Column({ type: 'date', nullable: true })
  @IsOptional()
  @IsDate({ message: 'Effective to must be a valid date.' })
  effectiveTo?: Date;
}
