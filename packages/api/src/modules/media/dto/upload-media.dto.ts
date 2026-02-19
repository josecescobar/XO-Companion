import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { MediaType } from '@prisma/client';

export class UploadMediaDto {
  @IsEnum(MediaType)
  type: MediaType;

  @IsOptional()
  @IsUUID()
  dailyLogId?: string;

  @IsOptional()
  @IsUUID()
  incidentId?: string;

  @IsOptional()
  @IsUUID()
  voiceNoteId?: string;

  @IsOptional()
  @IsString()
  caption?: string;
}
