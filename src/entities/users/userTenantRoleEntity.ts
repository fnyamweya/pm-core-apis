import {
  IsJSON,
  IsOptional,
} from 'class-validator'
import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
  import { BaseModel } from '../baseEntity'
import { UserTenantMembership } from './userTenantMembershipEntity'
import { TenantRole } from '../tenants/tenantRoleEntity'

/** Assignment of a role to a user within a specific tenant. */
@Entity('user_tenant_roles')
@Unique('UQ_membership_role', ['membership', 'role'])
@Index('IDX_user_tenant_roles_membership', ['membership'])
export class UserTenantRole extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne(() => UserTenantMembership, (m) => m.roles, { onDelete: 'CASCADE' })
  membership!: UserTenantMembership

  @ManyToOne(() => TenantRole, (r) => r.assignments, { onDelete: 'RESTRICT' })
  role!: TenantRole

  @ManyToOne(() => UserTenantMembership, (m) => m.tenant, { onDelete: 'CASCADE' })
  tenant!: UserTenantMembership

  /** Audit who assigned this role */
  @Column({ type: 'varchar', length: 50, nullable: true })
  @IsOptional()
  assignedByUserId?: string | null

  @Column({ type: 'timestamptz', default: () => 'now()' })
  assignedAt!: Date
}
