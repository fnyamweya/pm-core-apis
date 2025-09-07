import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { PropertyEquipmentEntity } from './propertyEquipmentEntity';
import { MaintenanceTypeEntity } from './propertyMaintenanceTypeEntity';
import { PropertyRequestEntity } from './propertyRequestEntity';
import { PropertyUnit } from './propertyUnitEntity';

export enum MaintenanceStatus {
  SCHEDULED   = 'scheduled',
  COMPLETED   = 'completed',
  OVERDUE     = 'overdue',
  CANCELLED   = 'cancelled',
}

export enum MaintenancePriority {
  LOW      = 'low',
  MEDIUM   = 'medium',
  HIGH     = 'high',
  URGENT   = 'urgent',
}

@Entity({ name: 'property_maintenance_record' })
export class PropertyMaintenanceRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The unit this maintenance record is for */
  @ManyToOne(() => PropertyUnit, (unit) => unit.maintenanceRecords, {
    eager: true,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'unit_id' })
  unit: PropertyUnit;

  /** When the maintenance actually ran (or is planned) */
  @Column({ type: 'timestamptz' })
  performedAt: Date;

  /** Dynamic, user-defined “type” of maintenance */
  @ManyToOne(() => MaintenanceTypeEntity, (type) => type.records, {
    eager: true,
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'type_id' })
  type: MaintenanceTypeEntity;

  /** Back-pointer to the originating request (if any) */
  @ManyToOne(
    () => PropertyRequestEntity,
    (request) => request.maintenanceRecords,
    { nullable: true, onDelete: 'SET NULL' },
  )
  @JoinColumn({ name: 'request_id' })
  request?: PropertyRequestEntity;

  /** The equipment item this record is for */
  @ManyToOne(
    () => PropertyEquipmentEntity,
    (eq) => eq.maintenanceRecords,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'equipment_id' })
  equipment: PropertyEquipmentEntity;

  /** Technician, notes, cost, priority, recurrence, etc. */
  @Column({ nullable: true })
  technician?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cost?: number;

  @Column({
    type: 'enum',
    enum: MaintenanceStatus,
    default: MaintenanceStatus.SCHEDULED,
  })
  status: MaintenanceStatus;

  @Column({
    type: 'enum',
    enum: MaintenancePriority,
    default: MaintenancePriority.MEDIUM,
  })
  priority: MaintenancePriority;

  @Column({ type: 'timestamptz', nullable: true })
  nextScheduledAt?: Date;

  @Column({ type: 'boolean', default: false })
  isRecurring: boolean;

  @Column({ type: 'text', nullable: true })
  recurrenceRule?: string;

  @Column({ type: 'jsonb', nullable: true })
  partsUsed?: Array<{ partName: string; quantity: number; unitCost?: number }>;

  @Column({ type: 'jsonb', nullable: true })
  customFields?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
