import {
  IsBoolean,
  IsJSON,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'
import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  Unique,
} from 'typeorm'
import { BaseModel } from '../baseEntity'
import { Tenant } from '../tenants/tenantEntity'
import { UserTenantRole } from '../users/userTenantRoleEntity'

/**
 * Role definition (can be global when tenant is null).
 * Examples: owner, admin, manager, member, billing, viewer, support.
 */
@Entity('tenant_roles')
@Unique('UQ_tenant_role_code', ['tenant', 'code'])
@Index('IDX_tenantrole_tenant', ['tenant'])
export class TenantRole extends BaseModel {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string

  /** Null => global role available to all tenants as a template */
  @ManyToOne(() => Tenant, (t) => t.roles, { nullable: true, onDelete: 'CASCADE' })
  @IsOptional()
  tenant?: Tenant | null

  /** Short stable identifier, e.g. "owner", "admin" */
  @Column({ type: 'varchar', length: 60 })
  @MaxLength(60)
  code!: string

  @Column({ type: 'varchar', length: 120 })
  @MaxLength(120)
  name!: string

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null

  /** Lock / system roles to prevent edits */
  @Column({ type: 'boolean', default: false })
  isSystem!: boolean

  /** Permissions bag (use with your policy engine) */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'permissions must be a valid JSON object' })
  permissions?: Record<string, any>

  @OneToMany(() => UserTenantRole, (utr) => utr.role)
  assignments!: UserTenantRole[]
}
