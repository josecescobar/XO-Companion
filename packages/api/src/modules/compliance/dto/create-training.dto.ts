import {
  IsString,
  IsOptional,
  IsDateString,
  IsUUID,
} from 'class-validator';

export class CreateTrainingDto {
  @IsString()
  employeeName: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsString()
  trainingType: string;

  @IsString()
  topic: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  completedDate: string;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @IsOptional()
  @IsString()
  trainer?: string;

  @IsOptional()
  @IsString()
  certificationId?: string;

  @IsOptional()
  @IsUUID()
  dailyLogId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
