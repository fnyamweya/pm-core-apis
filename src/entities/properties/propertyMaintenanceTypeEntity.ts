import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PropertyMaintenanceRecordEntity } from './propertyMaintenanceRecordEntity';

@Entity({ name: 'maintenance_type' })
export class MaintenanceTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** e.g. “Preventive”, “Corrective”, “Inspection” */
  @Column({ unique: true })
  name: string;

  /** Longer description or guidelines */
  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(
    () => PropertyMaintenanceRecordEntity,
    (record) => record.type,
  )
  records: PropertyMaintenanceRecordEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
