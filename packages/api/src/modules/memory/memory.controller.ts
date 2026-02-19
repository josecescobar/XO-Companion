import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MemoryService } from './memory.service';
import { ProjectsService } from '../projects/projects.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SearchMemoryDto } from './dto/search-memory.dto';
import { MemoryIngestionJobData } from './memory.processor';

@ApiTags('Project Memory')
@ApiBearerAuth()
@Controller('projects/:projectId/memory')
export class MemoryController {
  constructor(
    private memoryService: MemoryService,
    private projectsService: ProjectsService,
    @InjectQueue('memory-ingestion')
    private ingestionQueue: Queue<MemoryIngestionJobData>,
  ) {}

  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: SearchMemoryDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(
      projectId,
      user.id,
      user.organizationId,
    );
    return this.memoryService.search(projectId, dto.query, {
      limit: dto.limit,
      sourceType: dto.sourceType,
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
    });
  }

  @Get('stats')
  async getStats(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(
      projectId,
      user.id,
      user.organizationId,
    );
    return this.memoryService.getStats(projectId);
  }

  @Post('ingest')
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER, Role.SUPERINTENDENT)
  async ingest(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body('dailyLogId', ParseUUIDPipe) dailyLogId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(
      projectId,
      user.id,
      user.organizationId,
    );
    // Ingest synchronously for immediate feedback
    const result = await this.memoryService.ingestDailyLog(
      dailyLogId,
      projectId,
    );
    return { message: 'Ingestion complete', dailyLogId, ...result };
  }

  @Post('ingest-all')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER)
  async ingestAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(
      projectId,
      user.id,
      user.organizationId,
    );

    const logs = await this.memoryService['prisma'].dailyLog.findMany({
      where: { projectId },
      select: { id: true },
      orderBy: { logDate: 'asc' },
    });

    for (const log of logs) {
      await this.ingestionQueue.add('ingest', {
        type: 'daily-log',
        sourceId: log.id,
        projectId,
      });
    }

    return {
      message: `Queued ${logs.length} daily logs for ingestion`,
      count: logs.length,
    };
  }

  @Post('re-embed')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER)
  async reEmbed(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(
      projectId,
      user.id,
      user.organizationId,
    );
    return this.memoryService.reEmbed(projectId);
  }
}
