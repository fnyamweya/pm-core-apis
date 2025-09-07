import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseModel } from '../baseEntity';
import { Catalog } from '../catalog/catalogEntity';
import { PricingRule } from '../pricing/pricingRuleEntity';

@Entity('catalog_item_pricing')
export class CatalogItemPricing extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Catalog, (catalog) => catalog.catalogItemPricing)
  catalogItem: Catalog;

  @ManyToOne(() => PricingRule, (rule) => rule.catalogItemPricing)
  pricingRule: PricingRule;
}
