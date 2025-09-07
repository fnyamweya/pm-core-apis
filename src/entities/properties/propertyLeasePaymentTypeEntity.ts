import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
} from 'typeorm';
import { Organization } from '../organizations/organizationEntity';

@Entity('lease_payment_types')
@Index(['organization', 'code'], { unique: true })
export class PropertyLeasePaymentType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Payment type code (e.g., "RENT", "DEPOSIT", "LATE_FEE")
   */
  @Column({ type: 'varchar', length: 32 })
  code!: string;

  /**
   * Human-readable label ("Rent", "Deposit", "Late Payment Fee", etc.)
   */
  @Column({ type: 'varchar', length: 64 })
  name!: string;

  /**
   * Optional description/help text
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * (Optional) Organization, for per-landlord configs (null for system/default)
   */
  @ManyToOne(() => Organization, { nullable: true })
  organization?: Organization;

  /**
   * Extra config—icons, GL codes, tax, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  config?: Record<string, any>;
}
