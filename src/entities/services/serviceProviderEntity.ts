import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseModel } from '../baseEntity';
import { Location } from '../locations/locationEntity';
import { UserEntity } from '../users/userEntity';
import { ServiceProviderConfiguration } from './serviceProviderConfigurationEntity';

@Entity('service_providers')
export class ServiceProvider extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Reference to the user entity associated with this service provider.
   */
  @OneToOne(() => UserEntity, { cascade: true })
  @JoinColumn()
  user!: UserEntity;

  /**
   * Provider's rating based on customer feedback.
   */
  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Rating must be a number.' })
  rating?: number;

  /**
   * Provider's specialties or areas of expertise, stored as an array of strings.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsArray({ message: 'Specialties must be an array of strings.' })
  @IsString({ each: true, message: 'Each specialty must be a string.' })
  specialties?: string[];

  /**
   * Provider's certifications or licenses, stored as an array of strings.
   * Example: ["Certified Electrician", "Licensed Plumber"]
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsArray({ message: 'Certifications must be an array of strings.' })
  @IsString({ each: true, message: 'Each certification must be a string.' })
  certifications?: string[];

  /**
   * Service locations covered by the provider.
   */
  @ManyToMany(() => Location, { cascade: true })
  @JoinTable({
    name: 'service_provider_locations',
    joinColumn: { name: 'provider_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'location_id', referencedColumnName: 'id' },
  })
  serviceLocations!: Location[];

  /**
   * Configurations specific to each service that this provider offers.
   */
  @OneToMany(() => ServiceProviderConfiguration, (config) => config.provider, {
    cascade: true,
  })
  configurations!: ServiceProviderConfiguration[];

  /**
   * A brief description or introduction about the provider's services.
   */
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Description must be a string.' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters.' })
  description?: string;
}
