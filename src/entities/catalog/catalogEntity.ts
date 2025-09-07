import {
  IsDecimal,
  IsJSON,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  Column,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { BaseModel } from '../baseEntity';
import { PricingRule } from '../pricing/pricingRuleEntity';
import { PricingTier } from '../pricing/pricingTierEntity';
import { CatalogCategory } from './catalogCategoryEntity';
import { CatalogItemPricing } from './catalogItemPricingEntity';

@Entity('catalog')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export abstract class Catalog extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * A unique, human-readable code for the catalog item.
   */
  @Column({ unique: true })
  @IsNotEmpty({ message: 'Catalog code cannot be empty.' })
  @IsString({ message: 'Catalog code must be a string.' })
  @MaxLength(20, { message: 'Catalog code cannot exceed 20 characters.' })
  catalogCode: string;

  /**
   * Name of the catalog item, such as a product or service name.
   */
  @Column()
  @IsString({ message: 'Name must be a string.' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters.' })
  name: string;

  /**
   * Description of the catalog item.
   */
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Description must be a string.' })
  description?: string;

  /**
   * The base price of the catalog item, which can be further adjusted by specific pricing rules or strategies.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsDecimal({}, { message: 'Base price must be a decimal value.' })
  basePrice?: number;

  /**
   * Categories that the catalog item belongs to (can be one or more).
   */
  @ManyToMany(() => CatalogCategory, (category) => category.catalogs)
  categories: CatalogCategory[];

  @OneToMany(() => PricingTier, (tier) => tier.catalogItem)
  pricingTiers: PricingTier[];

  @ManyToMany(() => PricingRule, (rule) => rule.catalogItems)
  pricingRules: PricingRule[];

  /**
   * Define the one-to-many relationship with CatalogItemPricing
   */
  @OneToMany(
    () => CatalogItemPricing,
    (catalogItemPricing) => catalogItemPricing.catalogItem
  )
  catalogItemPricing: CatalogItemPricing[];

  /**
   * Additional metadata for custom configurations or properties.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'Metadata must be a valid JSON object.' })
  metadata?: Record<string, any>;
}
