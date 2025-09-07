import { Exclude } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserStatus } from '../../constants/users';
import { BaseModel } from '../baseEntity';
import { OrganizationUser } from '../organizations/organizationUserEntity';
import { UserAddress } from './userAddressEntity';
import { UserRole } from './userRoleEntity';
import { UserCredentialsEntity } from './userCredentialsEntity';
import { Tenant } from '../tenants/tenantEntity';
import { Subscription } from '../subscriptions/subscriptionEntity';
import { UserTenantMembership } from './userTenantMembershipEntity';

/**
 * UserEntity represents a user within the system.
 */
@Entity('users')
@Unique('UQ_users_tenant_email', ['tenant', 'email'])
@Unique('UQ_users_tenant_phone', ['tenant', 'phone'])
export class UserEntity extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  @IsNotEmpty({ message: 'First name cannot be empty' })
  @IsString({ message: 'First name must be a string' })
  @MaxLength(128, { message: 'First name cannot exceed 128 characters' })
  firstName!: string;

  @Column({ type: 'varchar', length: 128 })
  @IsNotEmpty({ message: 'Last name cannot be empty' })
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(128, { message: 'Last name cannot exceed 128 characters' })
  lastName!: string;

  @Column({ type: 'varchar', length: 128 })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(128, { message: 'Email cannot exceed 128 characters' })
  email?: string;

  @Column({ type: 'varchar', length: 16 })
  @IsNotEmpty({ message: 'Phone number cannot be empty' })
  @MaxLength(16, { message: 'Phone number cannot exceed 16 characters' })
  phone?: string;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString({ message: 'Avatar must be a string' })
  @MaxLength(256, { message: 'Avatar URL cannot exceed 256 characters' })
  avatar?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Bio must be a string' })
  @MaxLength(512, { message: 'Bio cannot exceed 512 characters' })
  bio?: string;

  @Column({
    type: 'varchar',
    default: UserStatus.PENDING_VERIFICATION,
  })
  @IsEnum(UserStatus, { message: 'Status must be a valid UserStatus value' })
  status!: UserStatus;

  @OneToOne(() => UserCredentialsEntity, (credentials) => credentials.user, {
    cascade: true,
  })
  @IsOptional()
  credentials!: UserCredentialsEntity;

  @OneToMany(() => OrganizationUser, (user) => user.user, { cascade: true, onDelete: 'SET NULL' })
  organizations!: OrganizationUser[];

  @OneToMany(() => UserRole, (userRole) => userRole.user, { cascade: true })
  roles!: UserRole[];

  /**
   * Owning tenant for multi-tenancy.
   */
  @ManyToOne(() => Tenant, (tenant) => tenant.users, { nullable: true, onDelete: 'SET NULL' })
  @IsOptional()
  @JoinColumn({ name: 'tenantId' })
  tenant?: Tenant | null;

  /**
   * Reverse relation for tenant memberships.
   */
  @OneToMany(() => UserTenantMembership, (membership) => membership.user, {
    cascade: true,
  })
  @Exclude()
  tenantMemberships!: UserTenantMembership[];

  /**
   * List of subscriptions associated with the user.
   */
  @OneToMany(() => Subscription, (subscription) => subscription.user, {
    cascade: true,
  })
  subscriptions!: Subscription[];

  /**
   * List of addresses associated with the user.
   */
  @OneToMany(() => UserAddress, (userAddress) => userAddress.user, {
    cascade: true,
  })
  addresses!: UserAddress[];
}

export default UserEntity;
