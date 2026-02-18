import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsObject,
} from 'class-validator';
import { ReviewAction } from '@prisma/client';

export class SubmitReviewDto {
  @IsUUID()
  entityId: string;

  @IsString()
  entityType: string;

  @IsOptional()
  @IsString()
  fieldName?: string;

  @IsEnum(ReviewAction)
  action: ReviewAction;

  @IsOptional()
  @IsString()
  reasonCode?: string;

  @IsOptional()
  @IsObject()
  newValue?: Record<string, any>;

  @IsOptional()
  @IsString()
  comment?: string;
}
