import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TaskStatus, TaskPriority, TaskCategory } from '@prisma/client';
import { TasksService } from './tasks.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('projects/:projectId/tasks')
export class TasksController {
  constructor(
    private tasksService: TasksService,
    private projectsService: ProjectsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List tasks for a project' })
  async list(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: TaskPriority,
    @Query('assignee') assignee?: string,
    @Query('category') category?: TaskCategory,
    @CurrentUser() user?: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user!.id, user!.organizationId);
    return this.tasksService.list(projectId, { status, priority, assignee, category });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get task summary counts for a project' })
  async summary(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user?: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user!.id, user!.organizationId);
    return this.tasksService.summary(projectId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user?: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user!.id, user!.organizationId);
    return this.tasksService.create(projectId, user!.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user?: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user!.id, user!.organizationId);
    return this.tasksService.update(projectId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  async delete(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user!.id, user!.organizationId);
    return this.tasksService.delete(projectId, id);
  }
}
