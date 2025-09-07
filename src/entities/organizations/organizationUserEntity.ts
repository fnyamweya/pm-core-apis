import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseModel } from '../baseEntity';
import { UserEntity } from '../users/userEntity';
import { Organization } from './organizationEntity';

export enum OrganizationUserRole {
  OWNER = 'owner',
  CARETAKER = 'caretaker',
  GENERAL_STAFF = 'general_staff',
  TENANT = 'tenant',
  SERVICE_PROVIDER = 'service_provider'
}

/**
 * OrganizationUser represents the many-to-many relationship between organizations and users.
 */
@Entity('organization_users')
export class OrganizationUser extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Reference to the organization in the association.
   */
  @ManyToOne(() => Organization, (organization) => organization.users, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  @IsNotEmpty({ message: 'Organization reference cannot be empty.' })
  organization!: Organization;

  /**
   * Reference to the user in the association.
   */
  @ManyToOne(() => UserEntity, (user) => user.organizations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  @IsNotEmpty({ message: 'User reference cannot be empty.' })
  user!: UserEntity;

  @Column({ type: 'enum', enum: OrganizationUserRole, array: true })
  @IsOptional()
  roles?: OrganizationUserRole[];

  /**
   * Optional status of the user within the organization.
   */
  @Column({ nullable: true })
  @IsOptional()
  @IsString({ message: 'Status must be a string.' })
  status?: string;
}
