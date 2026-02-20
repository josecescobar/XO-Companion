import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { CommunicationUrgency } from '@prisma/client';

export class UpdateCommunicationDto {
  @IsOptional()
  @IsString()
  recipient?: string;

  @IsOptional()
  @IsEmail()
  recipientEmail?: string;

  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  editedBody?: string;

  @IsOptional()
  @IsEnum(CommunicationUrgency)
  urgency?: CommunicationUrgency;
}
