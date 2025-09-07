import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Property } from './propertyEntity';
import { PropertyUnit } from './propertyUnitEntity';
import { PropertyMaintenanceRecordEntity } from './propertyMaintenanceRecordEntity';

export enum EquipmentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
}

@Entity({ name: 'property_equipment' })
export class PropertyEquipmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Friendly name of the equipment item */
  @Column()
  name: string;

  /** Images or media links */
  @Column({ type: 'jsonb', nullable: true })
  images?: string[];

  /** Longer description or notes */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /** Manufacturer or brand */
  @Column({ nullable: true })
  make?: string;

  /** Model identifier */
  @Column({ nullable: true })
  model?: string;

  /** Serial number for warranty / asset tracking */
  @Column({ nullable: true })
  serialNumber?: string;

  /** Date the asset was purchased */
  @Column({ type: 'date', nullable: true })
  purchaseDate?: Date;

  /** Date warranty or service contract expires */
  @Column({ type: 'date', nullable: true })
  warrantyExpiryDate?: Date;

  /** Estimated or recorded value (in local currency) */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  value?: number;

  /** Current operational status */
  @Column({
    type: 'enum',
    enum: EquipmentStatus,
    default: EquipmentStatus.ACTIVE,
  })
  status: EquipmentStatus;

  /** The property this equipment belongs to */
  @ManyToOne(() => Property, (property) => property.equipment, {
    onDelete: 'CASCADE',
  })
  property: Property;

  /**
   * If equipment is tied to a specific unit (e.g. AC in unit #101),
   * otherwise null.
   */
  @ManyToOne(() => PropertyUnit, (unit) => unit.equipment, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  unit?: PropertyUnit;

  /** Warranty Config
   * Optional warranty details for tracking service contracts */
  @Column({ type: 'jsonb', nullable: true })
  warrantyConfig?: {
    provider?: string;
    contact?: string;
    policyNumber?: string;
    serviceDetails?: string;
  };
  
  /** Maintenance or repair history */
  @OneToMany(
    () => PropertyMaintenanceRecordEntity,
    (record) => record.equipment,
    { cascade: true },
  )
  maintenanceRecords: PropertyMaintenanceRecordEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
