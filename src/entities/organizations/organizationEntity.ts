import { IsJSON, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  BeforeInsert,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseModel } from '../baseEntity';
import { OrganizationUser } from '../organizations/organizationUserEntity';
import { UserAddress } from '../users/userAddressEntity';
import { OrganizationType } from './organizationTypeEntity';

@Entity('organizations')
export class Organization extends BaseModel {
  /**
   * Unique id for each record.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Name of the organization or group (e.g., "Smith Family", "TechCorp").
   */
  @Column({ type: 'varchar', length: 100 })
  @IsString()
  @MaxLength(100, { message: 'Organization name cannot exceed 100 characters' })
  name: string;

  /**
   * Type of organization, e.g., family, business, custom.
   */
  @ManyToOne(
    () => OrganizationType,
    (organizationType) => organizationType.organizations,
    { nullable: true }
  )
  @IsOptional()
  type?: OrganizationType | null;

  /**
   * JSON field for organization-specific configuration, such as domain or settings.
   * Example:
   * {
   *   "domain": "example.com",
   *   "contactEmail": "info@example.com",
   *   "preferences": {
   *     "receiveNotifications": true
   *   }
   * }
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'Config must be a valid JSON object' })
  config?: {
    domain?: string;
    contactEmail?: string;
    preferences?: {
      receiveNotifications?: boolean;
      preferredContactMethod?: string;
    };
    [key: string]: any;
  };

  /**
   * JSON field for storing arbitrary metadata.
   * This can be used for storing additional non-critical information.
   * Example:
   * {
   *   "createdBy": "admin",
   *   "notes": "Organization created as part of customer onboarding"
   * }
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'Metadata must be a valid JSON object' })
  metadata?: Record<string, any>;

  /**
   * List of users   associated with this organization.
   */
  @OneToMany(() => OrganizationUser, (user) => user.organization, {
    cascade: true,
  })
  users: OrganizationUser[];

  /**
   * Addresses associated with the organization, accessible by all users.
   */
  @OneToMany(() => UserAddress, (address) => address.organization, {
    cascade: true,
  })
  addresses: UserAddress[];
}
