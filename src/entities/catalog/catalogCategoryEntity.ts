import { IsEnum, IsString, MaxLength } from 'class-validator';
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { CategoryType } from '../../constants/catalog';
import { BaseModel } from '../baseEntity';
import { Catalog } from '../catalog/catalogEntity';

@Entity('catalog_categories')
export class CatalogCategory extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * The name of the category.
   */
  @Column({ unique: true })
  @IsString({ message: 'Category name must be a string.' })
  @MaxLength(50, { message: 'Category name cannot exceed 50 characters.' })
  name: string;

  /**
   * Type of the category, indicating where it belongs (e.g., service, product, any).
   */
  @Column({ type: 'enum', enum: CategoryType })
  @IsEnum(CategoryType, {
    message: 'Category type must be one of: service, product, or any.',
  })
  type: CategoryType;

  /**
   * Catalog items associated with this category (can be products or services).
   */
  @ManyToMany(() => Catalog, (catalog) => catalog.categories)
  catalogs: Catalog[];
}
