import {
  IsArray,
  IsOptional,
  IsNumber,
  IsString,
  IsUUID,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class EntryReference {
  @IsString()
  entityType: string;

  @IsUUID()
  entityId: string;
}

export class BatchApproveDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntryReference)
  entryIds?: EntryReference[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  approveAllAboveConfidence?: number;
}
