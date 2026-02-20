import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { InspectionType } from '@prisma/client';

export class CreateInspectionDto {
  @IsUUID()
  mediaId: string;

  @IsOptional()
  @IsUUID()
  documentId?: string;

  @IsOptional()
  @IsUUID()
  dailyLogId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(InspectionType)
  inspectionType: InspectionType;
}
