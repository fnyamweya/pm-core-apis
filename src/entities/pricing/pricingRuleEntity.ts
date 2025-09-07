import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseModel } from '../baseEntity';
import { Catalog } from '../catalog/catalogEntity';
import { CatalogItemPricing } from '../catalog/catalogItemPricingEntity';
import { PricingAction } from './pricingActionEntity';
import { PricingCondition } from './pricingConditionEntity';

@Entity('pricing_rules')
export class PricingRule extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * Conditions for this pricing rule (e.g., day of the week, location).
   */
  @OneToMany(() => PricingCondition, (condition) => condition.pricingRule, {
    cascade: true,
  })
  conditions: PricingCondition[];

  /**
   * Actions to apply when conditions are met (e.g., discounts, surcharges).
   */
  @OneToMany(() => PricingAction, (action) => action.pricingRule, {
    cascade: true,
  })
  actions: PricingAction[];

  @Column({ default: 0 })
  priority: number;

  @Column({ default: true })
  stackable: boolean;

  @Column({ type: 'timestamp', nullable: true })
  validFrom?: Date;

  @Column({ type: 'timestamp', nullable: true })
  validTo?: Date;

  /**
   * Catalog items (products or services) that this rule applies to.
   */
  @ManyToMany(() => Catalog)
  @JoinTable({
    name: 'catalog_pricing_rules',
    joinColumn: { name: 'pricing_rule_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'catalog_id', referencedColumnName: 'id' },
  })
  catalogItems: Catalog[];

  /**
   * Define the one-to-many relationship with CatalogItemPricing
   */
  @OneToMany(
    () => CatalogItemPricing,
    (catalogItemPricing) => catalogItemPricing.pricingRule
  )
  catalogItemPricing: CatalogItemPricing[];
}
