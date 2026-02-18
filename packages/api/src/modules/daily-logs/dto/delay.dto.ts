import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { DelayCause } from '@prisma/client';

export class CreateDelayDto {
  @IsEnum(DelayCause)
  cause: DelayCause;

  @IsString()
  description: string;

  @IsInt()
  @Min(1)
  durationMinutes: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  impactedTrades?: string[];

  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;

  @IsOptional()
  @IsNumber()
  aiConfidence?: number;
}

export class UpdateDelayDto {
  @IsOptional()
  @IsEnum(DelayCause)
  cause?: DelayCause;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  impactedTrades?: string[];
}
