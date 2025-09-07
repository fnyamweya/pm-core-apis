import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import {
  IsString,
  MaxLength,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsJSON,
} from 'class-validator';
import { BaseModel } from '../baseEntity';
import { PaymentProvider } from './paymentProviderEntity';
import { Subscription } from '../subscriptions/subscriptionEntity';

/**
 * Enum of common payment-method types.
 */
export enum PaymentMethodType {
  MOBILE_MONEY  = 'mobile_money',
  CARD          = 'card',
  BANK_TRANSFER = 'bank_transfer',
  E_WALLET      = 'e_wallet',
  QR            = 'qr',
}

@Entity('payment_methods')
export class PaymentMethod extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Short, unique code for this method (e.g. "MPESA_STK", "STRIPE_CARD").
   */
  @Column({ type: 'varchar', length: 20, unique: true })
  @IsString({ message: 'Method code must be a string.' })
  @MaxLength(20, { message: 'Method code cannot exceed 20 characters.' })
  methodCode!: string;

  /**
   * Human-readable name (e.g. "M-Pesa STK Push", "Stripe Credit Card").
   */
  @Column({ type: 'varchar', length: 50 })
  @IsString({ message: 'Name must be a string.' })
  @MaxLength(50, { message: 'Name cannot exceed 50 characters.' })
  name!: string;

  /**
   * Category of the method for filtering / reporting.
   */
  @Column({ type: 'enum', enum: PaymentMethodType })
  @IsEnum(PaymentMethodType, { message: 'Invalid payment method type.' })
  type!: PaymentMethodType;

  /**
   * Toggle on/off without deleting.
   */
  @Column({ type: 'boolean', default: true })
  @IsBoolean({ message: 'isActive must be a boolean.' })
  isActive!: boolean;

  /**
   * Freeform description.
   */
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Description must be a string.' })
  description?: string;

  /**
   * Subscriptions
   */
  @OneToMany(() => Subscription, (s) => s.paymentMethod)
  subscriptions!: Subscription[];

  /**
   * Link back to its parent provider.
   */
  @ManyToOne(() => PaymentProvider, (prov) => prov.methods, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_provider_id' })
  paymentProvider!: PaymentProvider;
}
