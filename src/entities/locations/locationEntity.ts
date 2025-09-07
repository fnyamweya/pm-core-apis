import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Tree,
  TreeChildren,
  TreeParent,
  Index
} from 'typeorm';
import { BaseModel } from '../baseEntity';
import { LocationAddressComponent } from './locationAddressComponentEntity';

type GeoPoint = {
  type: 'Point';
  coordinates: [number, number];
};

type GeoPolygon = {
  type: 'Polygon';
  coordinates: Array<Array<[number, number]>>;
};

/**
 * ServiceLocation entity representing a serviceable area with PostGIS support.
 */
@Entity('locations')
@Tree('closure-table')
@Index('IDX_LOCATION_GEOFENCE', ['geofence'], {
  spatial: true,
})
@Index('IDX_LOCATION_CENTER_POINT', ['centerPoint'], {
  spatial: true,
})
@Index('IDX_LOCATION_LOCAL_AREA_NAME', ['localAreaName'])
export class Location extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * A name for the service area, if applicable.
   * @example 'Nairobi CBD'
   */
  @Column({ type: 'varchar', length: 100 })
  @IsNotEmpty({ message: 'Service area name cannot be empty' })
  @IsString({ message: 'Service area name must be a string' })
  @MaxLength(100, { message: 'Service area name cannot exceed 100 characters' })
  localAreaName!: string;

  /**
   * The county where services are available.
   * @example 'Nairobi County'
   */
  @Column({ type: 'varchar', length: 100 })
  @IsNotEmpty({ message: 'County cannot be empty' })
  @IsString({ message: 'County must be a string' })
  @MaxLength(100, { message: 'County cannot exceed 100 characters' })
  county!: string;

  /**
   * The town within the county where services are available.
   * @example 'Nairobi'
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString({ message: 'Town must be a string' })
  @MaxLength(100, { message: 'Town cannot exceed 100 characters' })
  town?: string;

  /**
   * The street name or description within the town where services are available.
   * @example 'Kenyatta Avenue'
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString({ message: 'Street must be a string' })
  @MaxLength(100, { message: 'Street cannot exceed 100 characters' })
  street?: string;

  /**
   * Additional coverage details or specific instructions for the service area.
   */
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Coverage details must be a string' })
  coverageDetails?: string;

  @OneToMany(
    () => LocationAddressComponent,
    (lac) => lac.location,
    { cascade: true }
  )
  addressComponents!: LocationAddressComponent[];

  /**
   * A point representing the central or representative location of the service area, for proximity queries.
   * @example POINT(-1.286389 36.817223)
   */
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  @IsOptional()
  centerPoint?: GeoPoint;

  /**
   * A polygon representing the boundary of the service area for geofencing.
   * This defines the precise area where services are available.
   */
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Polygon',
    srid: 4326,
    nullable: true,
  })
  @IsOptional()
  geofence?: GeoPolygon;

  /**
   * Parent location for hierarchical structure (e.g., region → country).
   */
  @TreeParent()
  parent?: Location;

  /**
   * Child locations under this location (e.g., towns within a region).
   */
  @TreeChildren()
  children?: Location[];
}
