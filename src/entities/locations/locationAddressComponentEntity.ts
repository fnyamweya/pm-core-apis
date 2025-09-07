import { Point } from 'geojson';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Location } from './locationEntity';
import { AddressComponent } from './addressComponentEntity';

@Entity('location_address_components')
@Unique('UQ_LOCATION_ADDRESS_COMPONENT', ['location', 'addressComponent'])
@Index('IDX_LAC_LOCATION_ID', ['location'])
@Index('IDX_LAC_ADDRESS_COMPONENT_ID', ['addressComponent'])
export class LocationAddressComponent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Parent Location this address component belongs to.
   */
  @ManyToOne(() => Location, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location!: Location;

  /**
   * The address component (Estate, Block, HouseNumber, etc.).
   */
  @ManyToOne(() => AddressComponent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'address_component_id' })
  addressComponent!: AddressComponent;

  /**
   * Optional friendly label shown to users, e.g. "Block A (Corner)".
   */
  @Column({ type: 'varchar', length: 120, nullable: true })
  label?: string;

  /**
   * Optional ordering to keep components sorted (e.g., Estate -> Block -> House).
   */
  @Column({ type: 'int', nullable: true })
  sequence?: number;

  /**
   * Mark the main/primary component for a location (e.g., the main estate).
   */
  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean;

  /**
   * Optional geospatial point for the exact spot of this component within the location.
   * SRID 4326 (WGS84).
   */
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  centerPoint?: Point;
}
