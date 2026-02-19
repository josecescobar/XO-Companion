import {
  IsString,
  IsOptional,
  IsDateString,
  IsUUID,
} from 'class-validator';

export class UpdateTrainingDto {
  @IsOptional()
  @IsString()
  employeeName?: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsString()
  trainingType?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  completedDate?: string;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @IsOptional()
  @IsString()
  trainer?: string;

  @IsOptional()
  @IsString()
  certificationId?: string;
}
