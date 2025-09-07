import { IsJSON, IsString, MaxLength } from 'class-validator';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseModel } from '../baseEntity';
import { PaymentProvider } from './paymentProviderEntity';

@Entity('payment_provider_configs')
export class PaymentProviderConfig extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Configuration key (e.g., "apiKey", "endpoint", "callbackUrl").
   */
  @Column({ type: 'varchar', length: 50 })
  @IsString({ message: 'Config key must be a string.' })
  @MaxLength(50, { message: 'Config key cannot exceed 50 characters.' })
  key: string;

  /**
   * Configuration value.
   */
  @Column({ type: 'text' })
  @IsString({ message: 'Config value must be a string.' })
  value: string;

  /**
   * Additional metadata for the configuration (optional).
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsJSON({ message: 'Metadata must be a valid JSON object.' })
  metadata?: Record<string, any>;

  /**
   * The payment provider associated with this configuration.
   */
  @ManyToOne(() => PaymentProvider, (provider) => provider.configurations, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  paymentProvider: PaymentProvider;
}
