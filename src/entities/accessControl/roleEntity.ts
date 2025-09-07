import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { AccessScope } from '../../constants/accessControl/roleScope';
import { NamespaceGenerator } from '../../utils/crypto';
import { BaseModel } from '../baseEntity';
import { KycRequirement } from '../kycProfile/kycRequirementEntity';
import { Permission } from './permissionsEntity';

/**
 * RoleEntity represents user roles in the system (e.g., Admin, User).
 */
@Entity('roles')
@Index(['id', 'name'], { unique: true })
export class Role extends BaseModel {
  @IsNotEmpty({ message: 'Role ID cannot be empty' })
  @IsString({ message: 'Role ID must be a string' })
  @PrimaryColumn({ unique: true })
  id!: string;

  @Column({ unique: true })
  @IsNotEmpty({ message: 'Name cannot be empty' })
  @IsString({ message: 'Name must be a string' })
  @MaxLength(50, { message: 'Name cannot exceed 50 characters' })
  name!: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(255, { message: 'Description cannot exceed 255 characters' })
  description?: string;

  @Column({
    type: 'enum',
    enum: AccessScope,
    default: AccessScope.GLOBAL,
  })
  @IsEnum(AccessScope, {
    message: 'Scope must be either global, organization, or application',
  })
  scope!: AccessScope;

  @Column({ default: true })
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive!: boolean;

  @Column({ nullable: true })
  @IsOptional()
  @IsString({ message: 'createdBy must be a string' })
  createdBy?: string;

  @ManyToMany(() => Permission, (permission) => permission.roles, {
    cascade: true,
  })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: {
      name: 'permissionId',
      referencedColumnName: 'id',
    },
  })
  permissions!: Permission[];

  @OneToMany(() => KycRequirement, (KycRequirement) => KycRequirement.role)
  KycRequirements: KycRequirement[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = NamespaceGenerator.generateNamespace(this.name);
    }
  }
}
