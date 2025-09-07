import { IsNotEmpty } from 'class-validator';
import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../accessControl/roleEntity';
import { BaseModel } from '../baseEntity';
import { OrganizationUser } from './organizationUserEntity';

/**
 * OrganizationUserRole represents a specific role assigned to a user within an organization.
 */
@Entity('organization_user_roles')
export class OrganizationUserRole extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Reference to the organization user relationship.
   */
  @ManyToOne(
    () => OrganizationUser,
    (organizationUser) => organizationUser.roles,
    {
      onDelete: 'CASCADE',
    }
  )
  @JoinColumn({ name: 'organization_user_id' })
  @IsNotEmpty({ message: 'Organization user reference cannot be empty.' })
  organizationUser: OrganizationUser;

  /**
   * Reference to the role assigned to the user within the organization.
   */
  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId', referencedColumnName: 'id' })
  @IsNotEmpty({ message: 'Role reference cannot be empty.' })
  role: Role;
}
