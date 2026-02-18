import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { WeatherCondition } from '@prisma/client';

export class UpsertWeatherDto {
  @IsArray()
  @IsEnum(WeatherCondition, { each: true })
  conditions: WeatherCondition[];

  @IsOptional()
  @IsNumber()
  tempHigh?: number;

  @IsOptional()
  @IsNumber()
  tempLow?: number;

  @IsOptional()
  @IsString()
  precipitation?: string;

  @IsOptional()
  @IsNumber()
  windSpeed?: number;

  @IsOptional()
  @IsString()
  windDirection?: string;

  @IsOptional()
  @IsNumber()
  humidity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  delayMinutes?: number;

  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;

  @IsOptional()
  @IsNumber()
  aiConfidence?: number;
}
