import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { SyncQueueDto } from './dto/sync-queue.dto';
import { UploadQueuedDto } from './dto/upload-queued.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Sync')
@ApiBearerAuth()
@Controller('sync')
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post('queue')
  @HttpCode(HttpStatus.OK)
  async processQueue(
    @Body() dto: SyncQueueDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.syncService.processQueue(
      dto.operations,
      user.id,
      user.organizationId,
    );
  }

  @Get('status')
  async getStatus(
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.syncService.getStatus(user.organizationId);
  }

  @Get('pending-uploads')
  async getPendingUploads(
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.syncService.getPendingUploads(user.organizationId);
  }

  @Post('voice/upload-queued')
  @HttpCode(HttpStatus.CREATED)
  async uploadQueued(
    @Body() dto: UploadQueuedDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.syncService.uploadQueued(user.id, user.organizationId, dto);
  }
}
