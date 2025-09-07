import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsIP,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseModel } from '../baseEntity';
import { UserEntity } from './userEntity';

/**
 * Enum representing the algorithm used for credential hashing.
 */
export enum CredentialAlgorithm {
  BCRYPT = 'BCRYPT',
  ARGON2 = 'ARGON2',
  PLAIN = 'PLAIN',
}

/**
 * Enum representing the type of credential (e.g., Password or PIN).
 */
export enum CredentialType {
  PASSWORD = 'PASSWORD',
  PIN = 'PIN',
}

/**
 * Class representing a failed authentication attempt.
 */
export class FailedAttempt {
  @IsDate({ message: 'Timestamp must be a valid date' })
  timestamp!: Date;

  @IsIP('4', { message: 'IP Address must be a valid IPv4 address' })
  ipAddress!: string;

  @IsString({ message: 'User agent must be a string' })
  @MaxLength(255, { message: 'User agent cannot exceed 255 characters' })
  userAgent!: string;

  @IsOptional()
  @IsString({ message: 'Location must be a string' })
  @MaxLength(255, { message: 'Location cannot exceed 255 characters' })
  location?: string;
}

/**
 * UserCredentialsEntity represents the credentials associated with a user.
 */
@Entity('user_credentials')
export class UserCredentialsEntity extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @IsNotEmpty({ message: 'Hashed credential cannot be empty' })
  @IsString({ message: 'Hashed credential must be a string' })
  hashedCredential!: string;

  @Column({
    type: 'enum',
    enum: CredentialType,
    default: CredentialType.PASSWORD,
  })
  @IsEnum(CredentialType, {
    message: 'Credential type must be a valid enum value',
  })
  credentialType!: CredentialType;

  @Column({
    type: 'enum',
    enum: CredentialAlgorithm,
    default: CredentialAlgorithm.ARGON2,
  })
  @IsEnum(CredentialAlgorithm, {
    message: 'Algorithm version must be a valid enum value',
  })
  algorithmVersion!: CredentialAlgorithm;

  @Column('jsonb', { default: [] })
  @ValidateNested({ each: true })
  @Type(() => FailedAttempt)
  failedAttempts!: FailedAttempt[];

  @Column({ type: 'timestamp' })
  @IsDate({ message: 'Credential expiry must be a valid date' })
  credentialExpiry!: Date;

  @Column({ unique: true })
  @IsNotEmpty({ message: 'User ID cannot be empty' })
  @IsString({ message: 'User ID must be a string' })
  userId!: string;

  @OneToOne(() => UserEntity, (user) => user.credentials)
  @JoinColumn({ name: 'userId' })
  @IsOptional()
  user!: UserEntity;
}

export default UserCredentialsEntity;