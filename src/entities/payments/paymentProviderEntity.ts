import { IsJSON, IsOptional, IsString, MaxLength } from 'class-validator';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseModel } from '../baseEntity';
import { PaymentProviderConfig } from './paymentProviderConfigEntity';
import { PaymentMethod } from './paymentMethodEntity';

@Entity('payment_providers')
export class PaymentProvider extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Unique code to identify the payment provider in a standard format.
   */
  @Column({ type: 'varchar', length: 20, unique: true })
  @IsString({ message: 'Payment provider code must be a string.' })
  @MaxLength(20, {
    message: 'Payment provider code cannot exceed 20 characters.',
  })
  paymentProviderCode: string;

  /**
   * The name of the payment provider, e.g., "Mpesa", "Pesapal", "iPay".
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  @IsString({ message: 'Provider name must be a string.' })
  @MaxLength(50, { message: 'Provider name cannot exceed 50 characters.' })
  name: string;

  /**
   * Metadata field for additional information or custom provider settings.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'Metadata must be a valid JSON object.' })
  metadata?: Record<string, any>;

  /**
   * List of configurations for the payment provider.
   */
  @OneToMany(() => PaymentProviderConfig, (config) => config.paymentProvider, {
    cascade: true,
  })
  configurations: PaymentProviderConfig[];

  /**
   * List of payment methods associated with this provider.
   */
  @OneToMany(() => PaymentMethod, (method) => method.paymentProvider, {
    cascade: true,
  })
  methods: PaymentMethod[];
}
