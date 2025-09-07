import { IsBoolean, IsInt, IsString, MaxLength, Min } from 'class-validator';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Catalog } from '../catalog/catalogEntity';
import { CatalogItemPricing } from '../catalog/catalogItemPricingEntity';
import { ProductSpecification } from './productSpecificationEntity';
import { ProductVariant } from './productVariantEntity';

@Entity('products')
export class Product extends Catalog {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * A unique SKU (Stock Keeping Unit) code for the product.
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  @IsString({ message: 'SKU must be a string.' })
  @MaxLength(50, { message: 'SKU cannot exceed 50 characters.' })
  sku: string;

  /**
   * Quantity in stock for the product.
   */
  @Column({ type: 'int', default: 0 })
  @IsInt({ message: 'Stock quantity must be an integer.' })
  @Min(0, { message: 'Stock quantity cannot be negative.' })
  stockQuantity: number;

  /**
   * Indicates whether the product is active and available for ordering.
   */
  @Column({ type: 'boolean', default: true })
  @IsBoolean({ message: 'isActive must be a boolean value.' })
  isActive: boolean;

  /**
   * Specifications related to the product, such as dimensions, weight, color, material, etc.
   */
  @OneToMany(() => ProductSpecification, (spec) => spec.product, {
    cascade: true,
  })
  specifications: ProductSpecification[];

  /**
   * Variants of the product, each with unique SKU and potentially different pricing.
   */
  @OneToMany(() => ProductVariant, (variant) => variant.product, {
    cascade: true,
  })
  variants: ProductVariant[];

  /**
   * Custom pricing details for the product, based on the pricing implementation.
   */
  @OneToMany(() => CatalogItemPricing, (pricing) => pricing.catalogItem, {
    cascade: true,
  })
  pricing: CatalogItemPricing[];
}
