import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseModel } from '../baseEntity';
import { PricingRule } from './pricingRuleEntity';

@Entity('pricing_actions')
export class PricingAction extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PricingRule, (pricingRule) => pricingRule.actions, {
    onDelete: 'CASCADE',
  })
  pricingRule: PricingRule;

  @Column()
  type: string; // e.g., "discount", "surcharge"

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column()
  unit: string; // "percentage" or "fixed"
}
