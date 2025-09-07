import {
  IsBoolean,
  IsEnum,
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
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
import { BaseModel } from '../baseEntity'
import { Tenant } from '../tenants/tenantEntity'
import UserEntity from '../users/userEntity'
import { UserTenantRole } from './userTenantRoleEntity'

export enum MembershipStatus {
  INVITED = 'invited',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  LEFT = 'left',
}

@Entity('user_tenant_memberships')
@Unique('UQ_membership_user_tenant', ['user', 'tenant'])
@Index('IDX_membership_status', ['status'])
export class UserTenantMembership extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne(() => UserEntity, (u) => u.tenantMemberships, { onDelete: 'CASCADE' })
  user!: UserEntity

  @ManyToOne(() => Tenant, (t) => t.memberships, { onDelete: 'CASCADE' })
  tenant!: Tenant

  @Column({ type: 'enum', enum: MembershipStatus, default: MembershipStatus.INVITED })
  status!: MembershipStatus

  /** Optional HR-ish attributes */
  @Column({ type: 'varchar', length: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string | null

  @Column({ type: 'varchar', length: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string | null

  /** Tenant this user primarily logs into? */
  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean

  /** Invitation / lifecycle stamps */
  @Column({ type: 'timestamptz', nullable: true })
  @IsOptional()
  invitedAt?: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  @IsOptional()
  joinedAt?: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  @IsOptional()
  leftAt?: Date | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  @IsOptional()
  invitedByUserId?: string | null

  @OneToMany(() => UserTenantRole, (utr) => utr.membership, { cascade: true })
  roles!: UserTenantRole[]
}
