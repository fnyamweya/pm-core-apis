import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  IsJSON,
  IsNotEmpty,
} from 'class-validator';
import { BaseModel } from '../baseEntity';
import { Property } from './propertyEntity';
import { PropertyUnit } from './propertyUnitEntity';
import { PropertyUnitTenantEntity } from './propertyUnitTenantEntity';
import { PropertyStaffEntity } from './propertyStaffEntity';
import { PropertyMaintenanceRecordEntity } from './propertyMaintenanceRecordEntity';

export enum MaintenanceStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELED = 'canceled',
}

export enum MaintenancePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('property_maintenance')
export class PropertyRequestEntity extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * The property for this maintenance request.
   */
  @ManyToOne(() => Property, { nullable: false })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  /**
   * The specific unit (if applicable).
   */
  @ManyToOne(() => PropertyUnit, { nullable: true })
  @JoinColumn({ name: 'unit_id' })
  unit?: PropertyUnit;

  /**
   * The user (tenant/staff) who raised the maintenance request.
   */
  @ManyToOne(() => PropertyUnitTenantEntity, { nullable: false })
  @JoinColumn({ name: 'requester_id' })
  requester!: PropertyUnitTenantEntity;

  /**
   * (Optional) The staff/vendor/contractor assigned to handle the request.
   */
  @ManyToOne(() => PropertyStaffEntity, { nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee?: PropertyStaffEntity;

  /**
   * Title of the maintenance request.
   */
  @Column({ type: 'varchar', length: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  title!: string;

  /**
   * Detailed description of the maintenance issue.
   */
  @Column({ type: 'text' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  /**
   * Priority level of the maintenance.
   */
  @Column({ type: 'varchar', length: 16, default: MaintenancePriority.MEDIUM })
  @IsEnum(MaintenancePriority)
  priority!: MaintenancePriority;

  /**
   * Status of the maintenance request.
   */
  @Column({ type: 'varchar', length: 16, default: MaintenanceStatus.PENDING })
  @IsEnum(MaintenanceStatus)
  status!: MaintenanceStatus;

  /**
   * Optional: Images, attachments, or additional files as URLs.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON()
  attachments?: string[];

  /**
   * Optional: Additional metadata, flags, IoT readings, or workflow info.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON()
  metadata?: Record<string, any>;

  /**
   * Timestamp fields.
   */
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  /**
   * Optional: Track completion/resolution time.
   */
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  completedAt?: Date;

  /**
   * All maintenance records that have been logged against this request.
   */
  @OneToMany(
    () => PropertyMaintenanceRecordEntity,
    (record) => record.request,
    { cascade: true },
  )
  maintenanceRecords?: PropertyMaintenanceRecordEntity[];
}

