import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  IsDateString,
  IsEnum,
  Min,
} from 'class-validator';
import { OshaCaseType } from '@prisma/client';

export class UpdateIncidentDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsString()
  employeeName?: string;

  @IsOptional()
  @IsString()
  employeeJobTitle?: string;

  @IsOptional()
  @IsDateString()
  employeeDateOfBirth?: string;

  @IsOptional()
  @IsDateString()
  employeeHireDate?: string;

  @IsOptional()
  @IsDateString()
  incidentDate?: string;

  @IsOptional()
  @IsString()
  incidentTime?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  injuryType?: string;

  @IsOptional()
  @IsString()
  bodyPart?: string;

  @IsOptional()
  @IsString()
  objectOrSubstance?: string;

  @IsOptional()
  @IsDateString()
  deathDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  daysAwayFromWork?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  daysRestricted?: number;

  @IsOptional()
  @IsBoolean()
  isRecordable?: boolean;

  @IsOptional()
  @IsEnum(OshaCaseType)
  caseType?: OshaCaseType;

  @IsOptional()
  @IsString()
  status?: string;
}
