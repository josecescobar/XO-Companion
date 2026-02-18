import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { DailyLogStatus, Role } from '@prisma/client';
import { DailyLogsService } from './daily-logs.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateDailyLogDto } from './dto/create-daily-log.dto';
import { UpdateDailyLogDto } from './dto/update-daily-log.dto';
import { UpsertWeatherDto } from './dto/weather.dto';
import { CreateWorkforceDto, UpdateWorkforceDto } from './dto/workforce.dto';
import { CreateEquipmentDto, UpdateEquipmentDto } from './dto/equipment.dto';
import { CreateWorkCompletedDto, UpdateWorkCompletedDto } from './dto/work-completed.dto';
import { CreateMaterialDto, UpdateMaterialDto } from './dto/material.dto';
import { UpsertSafetyDto } from './dto/safety.dto';
import { CreateDelayDto, UpdateDelayDto } from './dto/delay.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Daily Logs')
@ApiBearerAuth()
@Controller('projects/:projectId/daily-logs')
export class DailyLogsController {
  constructor(
    private dailyLogsService: DailyLogsService,
    private projectsService: ProjectsService,
  ) {}

  // ─── Core CRUD ───

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER, Role.SUPERINTENDENT, Role.FOREMAN)
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateDailyLogDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.create(projectId, user.id, dto);
  }

  @Get()
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('status') status: DailyLogStatus | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.findAll(projectId, { status, from, to });
  }

  @Get(':id')
  async findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.findOne(id, projectId);
  }

  @Patch(':id')
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDailyLogDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.update(id, projectId, dto);
  }

  @Delete(':id')
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.remove(id, projectId);
  }

  // ─── Status Transitions ───

  @Post(':id/submit')
  async submitForReview(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.submitForReview(id, projectId);
  }

  @Post(':id/approve')
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER, Role.SUPERINTENDENT, Role.OWNER_REP)
  async approve(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.approve(id, projectId);
  }

  @Post(':id/amend')
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER, Role.SUPERINTENDENT)
  async amend(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.amend(id, projectId);
  }

  // ─── Signature ───

  @Post(':id/sign')
  async sign(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('signatureData') signatureData: string,
    @CurrentUser() user: { id: string; role: Role; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.addSignature(id, projectId, user.id, user.role, signatureData);
  }

  // ─── Weather (upsert) ───

  @Put(':id/weather')
  async upsertWeather(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertWeatherDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.upsertWeather(id, projectId, dto);
  }

  // ─── Safety (upsert) ───

  @Put(':id/safety')
  async upsertSafety(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertSafetyDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.upsertSafety(id, projectId, dto);
  }

  // ─── Workforce ───

  @Post(':id/workforce')
  async addWorkforce(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateWorkforceDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.addWorkforce(id, projectId, dto);
  }

  @Patch(':id/workforce/:entryId')
  async updateWorkforce(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateWorkforceDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.updateWorkforce(id, projectId, entryId, dto);
  }

  @Delete(':id/workforce/:entryId')
  async removeWorkforce(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.removeWorkforce(id, projectId, entryId);
  }

  // ─── Equipment ───

  @Post(':id/equipment')
  async addEquipment(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEquipmentDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.addEquipment(id, projectId, dto);
  }

  @Patch(':id/equipment/:entryId')
  async updateEquipment(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateEquipmentDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.updateEquipment(id, projectId, entryId, dto);
  }

  @Delete(':id/equipment/:entryId')
  async removeEquipment(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.removeEquipment(id, projectId, entryId);
  }

  // ─── Work Completed ───

  @Post(':id/work-completed')
  async addWorkCompleted(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateWorkCompletedDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.addWorkCompleted(id, projectId, dto);
  }

  @Patch(':id/work-completed/:entryId')
  async updateWorkCompleted(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateWorkCompletedDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.updateWorkCompleted(id, projectId, entryId, dto);
  }

  @Delete(':id/work-completed/:entryId')
  async removeWorkCompleted(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.removeWorkCompleted(id, projectId, entryId);
  }

  // ─── Materials ───

  @Post(':id/materials')
  async addMaterial(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMaterialDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.addMaterial(id, projectId, dto);
  }

  @Patch(':id/materials/:entryId')
  async updateMaterial(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateMaterialDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.updateMaterial(id, projectId, entryId, dto);
  }

  @Delete(':id/materials/:entryId')
  async removeMaterial(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.removeMaterial(id, projectId, entryId);
  }

  // ─── Delays ───

  @Post(':id/delays')
  async addDelay(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDelayDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.addDelay(id, projectId, dto);
  }

  @Patch(':id/delays/:entryId')
  async updateDelay(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateDelayDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.updateDelay(id, projectId, entryId, dto);
  }

  @Delete(':id/delays/:entryId')
  async removeDelay(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.dailyLogsService.removeDelay(id, projectId, entryId);
  }
}
