import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseModel } from '../baseEntity';
import { Catalog } from './catalogEntity';

@Entity('catalog_addons')
export class CatalogAddon extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Indicates whether the addon is active and available for selection.
   */
  @Column({ type: 'boolean', default: true })
  @IsBoolean({ message: 'isActive must be a boolean value.' })
  isActive: boolean;

  /**
   * Optional notes or usage guidelines for this addon, such as limitations or requirements.
   */
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Notes must be a string.' })
  @MaxLength(255, { message: 'Notes cannot exceed 255 characters.' })
  notes?: string;

  /**
   * The primary catalog item (service or product) to which this addon is attached.
   */
  @ManyToOne(() => Catalog, { nullable: false })
  catalog: Catalog;

  /**
   * The catalog items (services or products) that can serve as add-ons.
   */
  @ManyToMany(() => Catalog, { cascade: true })
  @JoinTable({
    name: 'catalog_addon_assignments',
    joinColumn: { name: 'addon_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'catalog_id', referencedColumnName: 'id' },
  })
  addons: Catalog[];
}
