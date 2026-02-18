import { IsOptional, IsString } from 'class-validator';

export class UpdateDailyLogDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
