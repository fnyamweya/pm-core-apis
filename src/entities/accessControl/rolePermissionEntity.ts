import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AccessScope } from '../../constants/accessControl/roleScope';
import { BaseModel } from '../baseEntity';
import { Permission } from './permissionsEntity';
import { Role } from './roleEntity';

/**
 * Constants to define maximum lengths for validation
 */
const MAX_IDENTIFIER_LENGTH = 50;

/**
 * RolePermission represents the association between roles and permissions.
 */
@Entity('role_permissions')
export class RolePermission extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @PrimaryColumn()
  @IsNotEmpty({ message: 'Role ID is required.' })
  @IsString({ message: 'Role ID must be a string.' })
  @MaxLength(MAX_IDENTIFIER_LENGTH, {
    message: `Role ID must be less than ${MAX_IDENTIFIER_LENGTH} characters.`,
  })
  roleId!: string;

  @PrimaryColumn()
  @IsNotEmpty({ message: 'Permission ID is required.' })
  @IsString({ message: 'Permission ID must be a string.' })
  @MaxLength(MAX_IDENTIFIER_LENGTH, {
    message: `Permission ID must be less than ${MAX_IDENTIFIER_LENGTH} characters.`,
  })
  permissionId!: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId', referencedColumnName: 'id' })
  role!: Role;

  @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'permissionId',
    referencedColumnName: 'id',
  })
  permission!: Permission;

  @Column({
    type: 'enum',
    enum: AccessScope,
    default: AccessScope.GLOBAL,
  })
  @IsEnum(AccessScope, {
    message: 'Scope must be either global or organization',
  })
  scope!: AccessScope;
}
