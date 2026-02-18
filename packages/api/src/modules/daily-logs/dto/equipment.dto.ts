import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { EquipmentCondition } from '@prisma/client';

export class CreateEquipmentDto {
  @IsString()
  equipmentType: string;

  @IsOptional()
  @IsString()
  equipmentId?: string;

  @IsNumber()
  @Min(0)
  operatingHours: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  idleHours?: number;

  @IsEnum(EquipmentCondition)
  condition: EquipmentCondition;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;

  @IsOptional()
  @IsNumber()
  aiConfidence?: number;
}

export class UpdateEquipmentDto {
  @IsOptional()
  @IsString()
  equipmentType?: string;

  @IsOptional()
  @IsString()
  equipmentId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  operatingHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  idleHours?: number;

  @IsOptional()
  @IsEnum(EquipmentCondition)
  condition?: EquipmentCondition;

  @IsOptional()
  @IsString()
  notes?: string;
}
