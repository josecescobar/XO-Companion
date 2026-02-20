import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InspectionResult } from '@prisma/client';

export class ReviewInspectionDto {
  @IsEnum(InspectionResult)
  result: InspectionResult;

  @IsOptional()
  @IsString()
  notes?: string;
}
