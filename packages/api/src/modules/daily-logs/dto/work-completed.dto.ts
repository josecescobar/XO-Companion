import { IsBoolean, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateWorkCompletedDto {
  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  csiCode?: string;

  @IsOptional()
  @IsString()
  csiDescription?: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentComplete?: number;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;

  @IsOptional()
  @IsNumber()
  aiConfidence?: number;
}

export class UpdateWorkCompletedDto {
  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  csiCode?: string;

  @IsOptional()
  @IsString()
  csiDescription?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentComplete?: number;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;
}
