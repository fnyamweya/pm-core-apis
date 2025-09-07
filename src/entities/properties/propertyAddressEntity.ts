import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsString, MaxLength, IsOptional, IsJSON, IsLatitude, IsLongitude } from 'class-validator';
import { Property } from './propertyEntity';
import { AddressComponent } from '../locations/addressComponentEntity';

@Entity('property_addresses')
@Index(['property', 'label'], { unique: true })
export class PropertyAddressEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * The property this address belongs to.
   */
  @ManyToOne(() => Property, (property) => property.addresses, { eager: true })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  /**
   * Human-readable address label, e.g., "Main Entrance", "Caretaker House", "Gate B".
   */
  @Column({ type: 'varchar', length: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label!: string;

  /**
   * List of hierarchical address components (estate, block, unit, etc.)
   */
  @OneToMany(
    () => AddressComponent,
    (component) => component,
    { cascade: true, eager: true }
  )
  addressComponents!: AddressComponent[];

  /**
   * Plain address string (optional for display or backup).
   */
  @Column({ type: 'varchar', length: 256, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  addressLine?: string;

  /**
   * Latitude for geolocation (optional).
   */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  /**
   * Longitude for geolocation (optional).
   */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  /**
   * Optional additional metadata (landmark, directions, Google Place ID, etc.)
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
