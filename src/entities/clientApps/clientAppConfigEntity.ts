import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseModel } from '../baseEntity';
import { ClientApp } from './clientAppEntity';

@Entity({ name: 'client_app_configs' })
export class ClientAppConfig extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', array: true, nullable: true, default: [] })
  @IsOptional()
  @IsArray({ message: 'Redirect URIs must be an array of strings.' })
  @IsString({ each: true, message: 'Each redirect URI must be a string.' })
  redirectUris?: string[];

  @Column({
    type: 'text',
    array: true,
    default: ['authorization_code', 'refresh_token'],
  })
  @IsArray({ message: 'Grant Types must be an array of strings.' })
  @IsString({ each: true, message: 'Each grant type must be a string.' })
  @IsNotEmpty({ each: true, message: 'Grant Types cannot be empty.' })
  grantTypes: string[];

  @Column({ type: 'text', array: true, default: ['read', 'write'] })
  @IsArray({ message: 'Scopes must be an array of strings.' })
  @IsString({ each: true, message: 'Each scope must be a string.' })
  scopes: string[];

  @Column({ type: 'int', default: 3600 })
  @IsInt({ message: 'Access Token Expiry must be an integer.' })
  @Min(0, { message: 'Access Token Expiry must be a positive integer.' })
  accessTokenExpiry: number;

  @Column({ type: 'int', default: 86400 })
  @IsInt({ message: 'Refresh Token Expiry must be an integer.' })
  @Min(0, { message: 'Refresh Token Expiry must be a positive integer.' })
  refreshTokenExpiry: number;

  @Column({ type: 'boolean', default: false })
  @IsOptional()
  pkceRequired: boolean;

  @Column({ type: 'varchar', default: 'HS256' })
  @IsOptional()
  @IsString({ message: 'Token Algorithm must be a string.' })
  tokenAlgorithm: string;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString({ message: 'Token Issuer must be a string.' })
  tokenIssuer?: string;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString({ message: 'Token Audience must be a string.' })
  tokenAudience?: string;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  metadata?: Record<string, any>;

  @OneToOne(() => ClientApp, { onDelete: 'CASCADE' })
  @JoinColumn()
  application: ClientApp;

  validateConfig() {
    if (this.pkceRequired && !this.redirectUris?.length) {
      throw new Error('PKCE requires at least one redirect URI');
    }
    if (this.tokenAlgorithm !== 'HS256' && !this.tokenIssuer) {
      throw new Error('Custom algorithms require a token issuer');
    }
  }
}
