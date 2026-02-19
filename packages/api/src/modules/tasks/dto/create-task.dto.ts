import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { TaskPriority, TaskCategory } from '@prisma/client';

export class CreateTaskDto {
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  assignee?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  aiConfidence?: number;

  @IsOptional()
  @IsString()
  dailyLogId?: string;

  @IsOptional()
  @IsString()
  voiceNoteId?: string;
}
