import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class SearchMemoryDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsString()
  sourceType?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}
