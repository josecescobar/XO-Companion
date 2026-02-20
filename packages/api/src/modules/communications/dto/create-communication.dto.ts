import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUUID, IsEmail } from 'class-validator';
import { CommunicationType, CommunicationUrgency } from '@prisma/client';

export class CreateCommunicationDto {
  @IsEnum(CommunicationType)
  type: CommunicationType;

  @IsString()
  @IsNotEmpty()
  recipient: string;

  @IsOptional()
  @IsEmail()
  recipientEmail?: string;

  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsOptional()
  @IsEnum(CommunicationUrgency)
  urgency?: CommunicationUrgency;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsUUID()
  dailyLogId?: string;
}
