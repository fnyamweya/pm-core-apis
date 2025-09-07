import { Expose, Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseModel } from '../baseEntity';
import { Organization } from '../organizations/organizationEntity';
import { File } from '../storage/fileEntity';
import { UserEntity } from '../users/userEntity';
import { KycRequirement } from './kycRequirementEntity';

export enum KycProfileType {
  USER = 'USER',
  ORGANIZATION = 'ORGANIZATION',
}

export enum KycProfileStatus {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  REQUIRES_REVIEW = 'REQUIRES_REVIEW',
}

@Entity('kyc_profiles')
@Index(['type', 'requirement', 'user', 'organization'], { unique: true })
export class KycProfile extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: KycProfileType,
  })
  @IsEnum(KycProfileType, {
    message: 'Profile type must be either USER or ORGANIZATION.',
  })
  type!: KycProfileType;

  @ManyToOne(() => KycRequirement, {
    eager: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @Expose()
  @Transform(({ value }) => value.name, { toPlainOnly: true })
  requirement!: KycRequirement;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @Expose()
  value?: string | number | boolean | Record<string, any>;

  @OneToMany(() => File, (file) => file.id, {
    eager: true,
    onDelete: 'CASCADE',
  })
  files?: File[];

  @Column({
    type: 'enum',
    enum: KycProfileStatus,
    default: KycProfileStatus.PENDING,
  })
  @IsEnum(KycProfileStatus, {
    message:
      'Status must be one of: PENDING, VERIFIED, REJECTED, REQUIRES_REVIEW.',
  })
  status!: KycProfileStatus;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user?: UserEntity;

  @ManyToOne(() => Organization, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  organization?: Organization;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Notes must be a string.' })
  notes?: string;
}
