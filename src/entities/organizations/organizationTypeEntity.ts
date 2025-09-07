import { IsOptional, IsString, MaxLength } from 'class-validator';
import {
  BeforeInsert,
  Column,
  Entity,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { NamespaceGenerator } from '../../utils/crypto';
import { BaseModel } from '../baseEntity';
import { KycRequirement } from '../kycProfile/kycRequirementEntity';
import { Organization } from './organizationEntity';

@Entity('organization_types')
export class OrganizationType extends BaseModel {
  /**
   * Unique identifier for each organization type.
   */
  @PrimaryColumn({ unique: true })
  id!: string;

  /**
   * Name of the organization type (e.g., "Family", "Business", "Custom").
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  @IsString()
  @MaxLength(50, {
    message: 'Organization type name cannot exceed 50 characters',
  })
  name: string;

  /**
   * Description of the organization type.
   */
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Flag to indicate if the organization type is active or deprecated.
   */
  @Column({ type: 'boolean', default: true })
  @IsOptional()
  isActive?: boolean;

  /**
   * List of organizations associated with this organization type.
   */
  @OneToMany(() => Organization, (organization) => organization.type)
  organizations: Organization[];

  /**
   * List of KYC attribute templates associated with this organization type.
   */
  @OneToMany(
    () => KycRequirement,
    (KycRequirement) => KycRequirement.organizationType
  )
  KycRequirements: KycRequirement[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = NamespaceGenerator.generateNamespace(this.name);
    }
  }
}
