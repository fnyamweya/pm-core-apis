import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  BeforeInsert,
  Column,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NamespaceGenerator } from '../../utils/crypto';
import { BaseModel } from '../baseEntity';
import { Role } from './roleEntity';

/**
 * PermissionEntity represents individual permissions (e.g., create, delete, update).
 */
@Entity('permissions')
export class Permission extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  @IsNotEmpty({ message: 'Code cannot be empty' })
  @IsString({ message: 'Code must be a string' })
  @MaxLength(50, { message: 'Code cannot exceed 50 characters' })
  code?: string;

  /**
   * The unique name of the permission.
   * @example 'view_dashboard'
   */
  @Column({ unique: true })
  @IsNotEmpty({ message: 'Permission name cannot be empty' })
  @IsString({ message: 'Permission name must be a string' })
  @MaxLength(50, { message: 'Permission name cannot exceed 50 characters' })
  name!: string;

  /**
   * An optional description of the permission.
   * @example 'Permission to view the dashboard'
   */
  @Column({ nullable: true })
  @IsOptional()
  @IsString({ message: 'Permission description must be a string' })
  @MaxLength(255, {
    message: 'Permission description cannot exceed 255 characters',
  })
  description?: string;

  /**
   * An optional category for the permission.
   * @example 'dashboard'
   */
  @Column({ nullable: true })
  @IsOptional()
  @IsString({ message: 'Permission category must be a string' })
  @MaxLength(50, { message: 'Permission category cannot exceed 50 characters' })
  category?: string;

  /**
   * The user who created the permission.
   */
  @Column({ nullable: true })
  @IsOptional()
  @IsString({ message: 'createdBy must be a string' })
  createdBy?: string;

  /**
   * The user who last updated the permission.
   */
  @Column({ nullable: true })
  @IsOptional()
  @IsString({ message: 'updatedBy must be a string' })
  updatedBy?: string;

  /**
   * A boolean flag indicating whether the permission is active.
   */
  @Column({ default: true })
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive!: boolean;

  /**
   * The roles associated with the permission.
   */
  @ManyToMany(() => Role, (role) => role.permissions)
  roles!: Role[];

  @BeforeInsert()
  generateCode(): void {
    if (!this.code) {
      this.code = NamespaceGenerator.generateNamespace(this.name);
    }
  }
}
