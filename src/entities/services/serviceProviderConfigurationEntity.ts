import { IsJSON, IsOptional } from 'class-validator';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseModel } from '../baseEntity';
import { ServiceProvider } from './serviceProviderEntity';

@Entity('service_provider_configurations')
export class ServiceProviderConfiguration extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Reference to the service provider who owns this configuration.
   * This establishes a many-to-one relationship with `ServiceProvider`.
   */
  @ManyToOne(() => ServiceProvider, (provider) => provider.configurations, {
    cascade: ['insert', 'update'],
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  provider!: ServiceProvider;

  /**
   * Provider-specific pricing strategy.
   * Example: { "type": "tiered", "basePrice": 120.00, "tiers": [{ "min": 1, "max": 5, "price": 110.00 }] }
   * This field allows flexible pricing models specific to this provider for the given service.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'Pricing strategy must be a valid JSON object.' })
  pricingStrategy?: Record<string, any>;

  /**
   * Additional provider-specific settings, such as operational hours, lead times, or special requirements.
   * Example: { "leadTime": { "time": 12, "unit": "hours" }, "specialInstructions": "Requires extra preparation" }
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'Additional configuration must be a valid JSON object.' })
  additionalConfig?: Record<string, any>;
}
