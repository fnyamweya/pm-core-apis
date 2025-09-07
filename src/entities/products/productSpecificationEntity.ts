import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseModel } from '../baseEntity';
import { Product } from './productEntity';

@Entity('product_specifications')
export class ProductSpecification extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @IsString({ message: 'Specification name must be a string.' })
  @MaxLength(100, {
    message: 'Specification name cannot exceed 100 characters.',
  })
  name: string;

  @Column({ type: 'text' })
  @IsNotEmpty({ message: 'Specification value cannot be empty.' })
  @IsString({ message: 'Specification value must be a string.' })
  value: string;

  /**
   * Reference to the product this specification belongs to.
   */
  @ManyToOne(() => Product, (product) => product.specifications, {
    onDelete: 'CASCADE',
  })
  product: Product;
}
