import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MaterialCondition } from '@prisma/client';

export class CreateMaterialDto {
  @IsString()
  material: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  unit: string;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsString()
  ticketNumber?: string;

  @IsOptional()
  @IsEnum(MaterialCondition)
  condition?: MaterialCondition;

  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;

  @IsOptional()
  @IsNumber()
  aiConfidence?: number;
}

export class UpdateMaterialDto {
  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsString()
  ticketNumber?: string;

  @IsOptional()
  @IsEnum(MaterialCondition)
  condition?: MaterialCondition;
}
