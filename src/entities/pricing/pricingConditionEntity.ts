import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseModel } from '../baseEntity';
import { PricingRule } from './pricingRuleEntity';

@Entity('pricing_conditions')
export class PricingCondition extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PricingRule, (pricingRule) => pricingRule.conditions, {
    onDelete: 'CASCADE',
  })
  pricingRule: PricingRule;

  @Column()
  type: string; // e.g., "dayOfWeek", "location", "userType", "quantity"

  @Column()
  operator: string; // e.g., "in", "equals", "greaterThan"

  @Column({ type: 'jsonb' })
  value: any; // e.g., ["Saturday", "Sunday"] for "dayOfWeek" type
}
