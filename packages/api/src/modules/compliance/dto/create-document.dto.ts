import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
  IsInt,
  IsUUID,
} from 'class-validator';
import { ComplianceDocType } from '@prisma/client';

export class CreateDocumentDto {
  @IsEnum(ComplianceDocType)
  documentType: ComplianceDocType;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  alertDays?: number[];

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  issuingAuthority?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
