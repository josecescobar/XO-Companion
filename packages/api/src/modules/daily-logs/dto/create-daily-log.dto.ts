import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateDailyLogDto {
  @IsDateString()
  logDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
