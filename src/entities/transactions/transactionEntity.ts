import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  TransactionStatus,
  TransactionType,
} from '../../constants/transactions';
import { BaseModel } from '../baseEntity';
import { OrderTransaction } from '../orders/orderTransactionEntity';
import { Organization } from '../organizations/organizationEntity';
import { UserEntity } from '../users/userEntity';

@Entity('transactions')
export class Transaction extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Type of transaction, e.g., payment, refund, transfer.
   */
  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.PAYMENT,
  })
  type: TransactionType;

  /**
   * Status of the transaction.
   */
  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  /**
   * The monetary amount for the transaction.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  /**
   * Currency of the transaction, stored as an ISO currency code.
   */
  @Column({ type: 'varchar', length: 3 })
  currency: string;

  /**
   * Optional reference to the transaction ID of an external provider.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  providerTransactionId: string;

  /**
   * Securely generated transaction signature to verify authenticity.
   */
  @Column({ type: 'text', nullable: false })
  signature: string;

  /**
   * Metadata for storing additional details as JSON, such as custom properties.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
