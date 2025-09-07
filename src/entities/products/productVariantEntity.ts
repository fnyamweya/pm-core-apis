import { IsDecimal, IsInt, IsString, MaxLength } from 'class-validator';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseModel } from '../baseEntity';
import { Product } from './productEntity';

@Entity('product_variants')
export class ProductVariant extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Unique SKU for this specific variant.
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  @IsString({ message: 'SKU must be a string.' })
  @MaxLength(50, { message: 'SKU cannot exceed 50 characters.' })
  sku: string;

  /**
   * Additional price for this variant if different from the base price.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  @IsDecimal({}, { message: 'Variant price must be a decimal value.' })
  variantPrice?: number;

  /**
   * Quantity in stock for this variant.
   */
  @Column({ type: 'int', default: 0 })
  @IsInt({ message: 'Stock quantity must be an integer.' })
  stockQuantity: number;

  /**
   * Attributes that make this variant unique (e.g., size, color).
   */
  @Column({ type: 'jsonb', nullable: true })
  attributes?: Record<string, any>;

  /**
   * Reference to the main product.
   */
  @ManyToOne(() => Product, (product) => product.variants, {
    onDelete: 'CASCADE',
  })
  product: Product;
}
