import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SyncOperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export class SyncOperationDto {
  @IsEnum(SyncOperationType)
  type: SyncOperationType;

  @IsString()
  table: string;

  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsUUID()
  clientId: string;

  @IsISO8601()
  timestamp: string;
}

export class SyncQueueDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncOperationDto)
  operations: SyncOperationDto[];
}
