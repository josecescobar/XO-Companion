import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateWorkforceDto {
  @IsString()
  trade: string;

  @IsString()
  company: string;

  @IsInt()
  @Min(1)
  workerCount: number;

  @IsNumber()
  @Min(0)
  hoursWorked: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  overtimeHours?: number;

  @IsOptional()
  @IsString()
  foreman?: string;

  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;

  @IsOptional()
  @IsNumber()
  aiConfidence?: number;
}

export class UpdateWorkforceDto {
  @IsOptional()
  @IsString()
  trade?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  workerCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hoursWorked?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  overtimeHours?: number;

  @IsOptional()
  @IsString()
  foreman?: string;
}
