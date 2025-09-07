import { IsJSON, IsOptional, IsString, MaxLength } from 'class-validator';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseModel } from '../baseEntity';

@Entity('insurance_providers')
export class InsuranceProvider extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Code for the insurance provider, used for identification.
   */
  @Column({ type: 'varchar', length: 20 })
  @IsString({ message: 'Insurance provider code must be a string.' })
  @MaxLength(20, {
    message: 'Insurance provider code cannot exceed 20 characters.',
  })
  insuranceProviderCode: string;

  /**
   * Name of the insurance provider.
   */
  @Column({ type: 'varchar', length: 100 })
  @IsString({ message: 'Insurance provider name must be a string.' })
  @MaxLength(100, {
    message: 'Insurance provider name cannot exceed 100 characters.',
  })
  name: string;

  /**
   * Integration handler or type to indicate the type of interaction required.
   * Examples: "API", "manual", "batch", "OAuth", "SFTP", etc.
   */
  @Column({ type: 'varchar', length: 50, default: 'manual' })
  @IsString({ message: 'Handler must be a string.' })
  @MaxLength(50, { message: 'Handler cannot exceed 50 characters.' })
  handler: string;

  /**
   * Flexible JSON-based configurations for integration details.
   * Can store attributes like apiUrl, apiKey, sftp details, or other settings.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'Configurations must be a valid JSON object.' })
  configurations?: Record<string, any>;

  /**
   * Additional instructions or metadata related to this provider.
   * This could include portal URLs, contact information, or claims guidelines.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'Metadata must be a valid JSON object.' })
  metadata?: Record<string, any>;
}
