import {
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class UploadQueuedDto {
  @IsUUID()
  dailyLogId: string;

  @IsUUID()
  clientId: string;

  @IsISO8601()
  recordedAt: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;
}
