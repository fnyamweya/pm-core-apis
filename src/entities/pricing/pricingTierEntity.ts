import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseModel } from '../baseEntity';
import { Catalog } from '../catalog/catalogEntity';

@Entity('pricing_tiers')
export class PricingTier extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Catalog, (catalog) => catalog.pricingTiers)
  catalogItem: Catalog;

  @Column()
  minQuantity: number;

  @Column()
  maxQuantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;
}
