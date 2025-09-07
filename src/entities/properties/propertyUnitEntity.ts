import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsNumber,
  IsJSON,
} from 'class-validator';
import { BaseModel } from '../baseEntity';
import { Property } from './propertyEntity';
import { UserEntity } from '../users/userEntity';
import { PropertyLeaseAgreement } from './propertyLeaseAgreementEntity';
import { PropertyRequestEntity } from './propertyRequestEntity';
import { PropertyAddressEntity } from './propertyAddressEntity';
import { PropertyEquipmentEntity } from './propertyEquipmentEntity';
import { PropertyMaintenanceRecordEntity } from './propertyMaintenanceRecordEntity';


export enum PropertyUnitStatus {
  VACANT = 'vacant',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  MAINTENANCE = 'maintenance',
  UNAVAILABLE = 'unavailable',
}

@Entity('property_units')
@Index(['property', 'unitNumber'], { unique: true })
export class PropertyUnit extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * The property this unit belongs to.
   */
  @ManyToOne(() => Property, (property) => property.units, { eager: true })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  /**
   * Unit number or identifier (e.g., "A-101", "Block B-2", "Room 5").
   */
  @Column({ type: 'varchar', length: 32 })
  @IsString()
  @IsNotEmpty({ message: 'Unit number is required' })
  @MaxLength(32)
  unitNumber!: string;

  /**
   * (Optional) Name or label, e.g., "Penthouse", "Office 1".
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  /**
   * Floor/Level (optional, for apartments/commercial spaces).
   */
  @Column({ type: 'varchar', length: 32, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  floor?: string;

  /**
   * Area in square meters/feet (optional).
   */
  @Column({ type: 'float', nullable: true })
  @IsOptional()
  @IsNumber()
  area?: number;

  /**
   * Optional description or remarks.
   */
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * (Optional) User currently occupying the unit (tenant).
   */
  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  @IsOptional()
  tenant?: UserEntity;

  /**
   * List of lease agreements for this unit.
   */
  @OneToMany(() => PropertyLeaseAgreement, (lease) => lease.unit)
  leases?: PropertyLeaseAgreement[];

  /**
   * List of maintenance/repair requests for this unit.
   */
  @OneToMany(() => PropertyRequestEntity, (request) => request.unit)
  requests?: PropertyRequestEntity[];

  /**
   * Equipment or assets associated with this unit.
   */
  @OneToMany(() => PropertyEquipmentEntity, (equipment) => equipment.unit, {
    cascade: true,
  })
  equipment?: PropertyEquipmentEntity[];

  /**
   * Maintenance records logged against this unit.
   */
  @OneToMany(() => PropertyMaintenanceRecordEntity, (record) => record.unit, {
    cascade: true,
  })
  maintenanceRecords?: PropertyMaintenanceRecordEntity[];

  /**
   * Config for dynamic unit settings (IoT, smart meters, etc.)
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON()
  config?: Record<string, any>;

  /**
   * Metadata field for arbitrary flags, tags, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON()
  metadata?: Record<string, any>;

  /**
   * List of amenities offered in/with the unit (e.g., pool, gym, elevator).
   */
  @Column({ type: 'text', array: true, nullable: true })
  @IsOptional()
  amenities?: string[] | null;

  /**
   * Operational status of the unit (vacant/occupied/etc.).
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: PropertyUnitStatus.VACANT,
  })
  status!: PropertyUnitStatus;

  /**
   * Is this unit active/available?
   */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * Is this unit currently listed or rentable?
   */
  @Column({ type: 'boolean', default: true })
  isListed!: boolean;

  static defaultMetadata(): Record<string, any> {
    return {
      bedrooms: 0,
      bathrooms: 0,
      features: [] as string[],
      floorPlan: null as string | null,
      furnishing: 'unfurnished',
      utilities: {
        waterIncluded: false,
        electricityIncluded: false,
        internetIncluded: false,
      },
      sizeUnit: 'sqm',
      parkingSpaces: 0,
      rent: null as number | null,
      deposit: null as number | null,
      view: null as string | null,
      orientation: null as string | null,
      appliances: [] as string[],
      images: [] as string[],
      notes: null as string | null,
    };
  }

  private applyDefaults() {
    this.isActive = this.isActive !== false;
    this.isListed = this.isListed !== false;
    // default status
    this.status = this.status || PropertyUnitStatus.VACANT;
    // merge metadata defaults
    const defaults = PropertyUnit.defaultMetadata();
    this.metadata = { ...defaults, ...(this.metadata || {}) };
    // derive status from tenant when not explicitly set
    if (!this.status) {
      this.status = this.tenant ? PropertyUnitStatus.OCCUPIED : PropertyUnitStatus.VACANT;
    }
  }

  @BeforeInsert()
  setDefaults() {
    this.applyDefaults();
  }

  @BeforeUpdate()
  setUpdateDefaults() {
    // If tenant assigned/removed and status not explicitly set by update, auto-adjust
    if (!this.status) {
      this.status = this.tenant ? PropertyUnitStatus.OCCUPIED : PropertyUnitStatus.VACANT;
    }
    // Keep metadata keys stable after updates
    const defaults = PropertyUnit.defaultMetadata();
    this.metadata = { ...defaults, ...(this.metadata || {}) };
  }
}
// This entity represents a property unit, which can be an apartment, office, room, etc.
// It includes details like unit number, floor, area, tenant, and relationships to leases and maintenance requests.
