import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Catalog } from '../catalog/catalogEntity';
import { Location } from '../locations/locationEntity';
import { ServiceConfiguration } from './serviceConfigurationEntity';

@Entity('services')
export class Service extends Catalog {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * A unique code for identifying the service, used for quick reference.
   */
  @Column({ type: 'varchar', length: 20, unique: true })
  @IsNotEmpty({ message: 'Service code cannot be empty.' })
  @IsString({ message: 'Service code must be a string.' })
  @MaxLength(20, { message: 'Service code cannot exceed 20 characters.' })
  serviceCode: string;

  /**
   * Brief description of the service, outlining its purpose or target use case.
   */
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Description must be a string.' })
  description?: string;

  /**
   * Locations where the service is available.
   */
  @ManyToMany(() => Location)
  @JoinTable()
  locations!: Location[];

  /**
   * Configuration settings specific to the service, including pricing and options.
   */
  @ManyToOne(() => ServiceConfiguration, { cascade: true, nullable: true })
  configuration?: ServiceConfiguration;

  /**
   * Notes or additional details relevant to the service.
   */
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  additionalNotes?: string;
}
