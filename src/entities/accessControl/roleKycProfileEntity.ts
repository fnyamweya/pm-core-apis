// RoleKycProfile entity
import { Exclude } from 'class-transformer';
import { IsJSON, IsOptional } from 'class-validator';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from '../accessControl/roleEntity';
import { BaseModel } from '../baseEntity';

@Entity('role_kyc_profiles')
export class RoleKycProfile extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Reference to the role this KYC profile is for.
   * `cascade` removed to avoid circular cascade on deletion.
   */
  @OneToOne(() => Role)
  @JoinColumn()
  @Exclude()
  role!: Role;

  /**
   * Additional metadata or information specific to this role-based profile.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'Metadata must be a valid JSON object.' })
  metadata?: Record<string, any>;
}
