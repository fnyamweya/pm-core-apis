import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  Column,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClientAppStatus } from '../../constants/clientApps/clientAppConstants';
import { BaseModel } from '../baseEntity';
import { ClientAppConfig } from './clientAppConfigEntity';

/**
 * @class Applications
 * @description Represents an application registered by one or more users.
 */
@Entity({ name: 'client_applications' })
export class ClientApp extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * @description Name of the application.
   * @validation Must be a non-empty string with a maximum length of 100 characters.
   */
  @Column({ type: 'varchar', length: 100 })
  @IsString({ message: 'Name must be a string.' })
  @IsNotEmpty({ message: 'Name is required.' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters.' })
  name: string;

  /**
   * @description Public identifier for the application (client ID).
   * @validation Must be a unique string with a maximum length of 50 characters.
   */
  @Index()
  @Column({ type: 'varchar', length: 10, unique: true })
  @IsString({ message: 'App ID must be a string.' })
  @IsNotEmpty({ message: 'App ID is required.' })
  @MaxLength(50, { message: 'App ID cannot exceed 50 characters.' })
  appId: string;

  /**
   * @description Secret key for the application (client secret). Only stored in hashed format.
   * @validation Must be a string or null if not provided, with a maximum length of 255 characters.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString({ message: 'App Secret must be a string.' })
  @MaxLength(255, { message: 'App Secret cannot exceed 255 characters.' })
  appSecret: string;

  @Column({
    type: 'enum',
    enum: ClientAppStatus,
    default: ClientAppStatus.PENDING,
  })
  @IsEnum(ClientAppStatus, { message: 'Invalid status.' })
  status: ClientAppStatus;

  @OneToOne(() => ClientAppConfig, (config) => config.application, {
    cascade: true,
    eager: true,
  })
  config: ClientAppConfig;
}
