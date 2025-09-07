import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import {
  MimeType,
  StorageProvider,
} from '../../constants/storage/storageTypes';
import { BaseModel } from '../baseEntity';

@Entity('files')
export class File extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  @IsNotEmpty({ message: 'Original name cannot be empty' })
  @IsString({ message: 'Original name must be a string' })
  originalName!: string;

  @Column({ type: 'varchar', length: 100 })
  @IsNotEmpty({ message: 'Category cannot be empty' })
  @IsString({ message: 'Category must be a string' })
  @MaxLength(100, { message: 'Category cannot exceed 100 characters' })
  category!: string;

  @Column({ type: 'varchar', length: 255 })
  @IsNotEmpty({ message: 'MIME type cannot be empty' })
  @IsEnum(MimeType, { message: 'MIME type must be a valid value' })
  mimeType!: MimeType;

  @Column({ type: 'int' })
  @IsNotEmpty({ message: 'Size cannot be empty' })
  @IsInt({ message: 'Size must be an integer' })
  size!: number;

  @Column({ type: 'varchar', length: 512, nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'URL must be a valid URL' })
  @MaxLength(512, { message: 'URL cannot exceed 512 characters' })
  url?: string;

  @Column({ type: 'varchar', length: 255 })
  @IsNotEmpty({ message: 'Storage provider cannot be empty' })
  @IsEnum(StorageProvider, {
    message: 'Storage provider must be a valid value',
  })
  storageProvider!: StorageProvider;

  @Column({ type: 'varchar', length: 255 })
  @IsNotEmpty({ message: 'Storage key cannot be empty' })
  @IsString({ message: 'Storage key must be a string' })
  storageKey!: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  @IsOptional()
  @IsString({ message: 'File path must be a string' })
  @MaxLength(512, { message: 'File path cannot exceed 512 characters' })
  filePath?: string;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsString({ message: 'ExpiresAt must be a valid timestamp' })
  expiresAt?: Date;
}

export default File;
