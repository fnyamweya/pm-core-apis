import { IsJSON, IsOptional } from 'class-validator';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseModel } from '../baseEntity';
import { CatalogItemPricing } from '../catalog/catalogItemPricingEntity';
import { Service } from './serviceEntity';

@Entity('service_configurations')
export class ServiceConfiguration extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * JSON field to store insurance details.
   * - `required`: Indicates if insurance is mandatory for the service.
   * - `value`: The insurance rate or amount.
   * - `valueType`: Specifies whether the value is a "percentage" or a "fixed" amount.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON()
  insuranceOptions?: {
    required: boolean;
    value: number;
    valueType: 'percentage' | 'fixed';
  };

  /**
   * Reference to the associated service.
   */
  @OneToOne(() => Service, (service) => service.configuration)
  @JoinColumn()
  service!: Service;

  /**
   * Custom pricing strategies or rules applied to the service.
   */
  @OneToMany(() => CatalogItemPricing, (pricing) => pricing.catalogItem, {
    cascade: true,
  })
  pricing: CatalogItemPricing[];

  /**
   * Additional custom configuration options.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON()
  additionalConfig?: Record<string, any>;
}
