import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InspectionResult, InspectionType } from '@prisma/client';
import { InspectionsService } from './inspections.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { ReviewInspectionDto } from './dto/review-inspection.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProjectsService } from '../projects/projects.service';

@ApiTags('Inspections')
@ApiBearerAuth()
@Controller('projects/:projectId/inspections')
export class InspectionsController {
  constructor(
    private inspectionsService: InspectionsService,
    private projectsService: ProjectsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new inspection' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateInspectionDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.inspectionsService.create(user.id, user.organizationId, projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List inspections for a project' })
  async list(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('inspectionType') inspectionType?: InspectionType,
    @Query('status') status?: InspectionResult,
    @Query('dailyLogId') dailyLogId?: string,
    @CurrentUser() user?: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user!.id, user!.organizationId);
    return this.inspectionsService.list(projectId, { inspectionType, status, dailyLogId });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get inspection summary counts' })
  async summary(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user?: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user!.id, user!.organizationId);
    return this.inspectionsService.getSummary(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inspection detail' })
  async getOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user!.id, user!.organizationId);
    return this.inspectionsService.getById(id);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Human review of an inspection' })
  async review(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewInspectionDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.inspectionsService.review(id, user.id, dto.result, dto.notes);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an inspection' })
  async delete(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user!.id, user!.organizationId);
    await this.inspectionsService.delete(id);
  }
}
