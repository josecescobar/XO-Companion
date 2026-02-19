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

export class CreateIncidentDto {
  @IsUUID()
  projectId: string;

  @IsString()
  employeeName: string;

  @IsOptional()
  @IsString()
  employeeJobTitle?: string;

  @IsOptional()
  @IsDateString()
  employeeDateOfBirth?: string;

  @IsOptional()
  @IsDateString()
  employeeHireDate?: string;

  @IsDateString()
  incidentDate: string;

  @IsOptional()
  @IsString()
  incidentTime?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsString()
  description: string;

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
  @IsUUID()
  dailyLogId?: string;

  @IsOptional()
  @IsUUID()
  safetyEntryId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
