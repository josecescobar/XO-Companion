import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpsertSafetyDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  toolboxTalks?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inspections?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  incidents?: string[];

  @IsOptional()
  @IsBoolean()
  oshaRecordable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  nearMisses?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  firstAidCases?: number;

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
