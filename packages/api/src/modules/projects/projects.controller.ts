import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER)
  create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.projectsService.create(dto, user.organizationId, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.projectsService.findAll(user.id, user.organizationId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.projectsService.findOne(id, user.id, user.organizationId);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.projectsService.update(id, dto, orgId);
  }

  @Post(':id/members')
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER)
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.projectsService.addMember(id, dto, orgId);
  }

  @Delete(':id/members/:userId')
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER)
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.projectsService.removeMember(id, userId, orgId);
  }

  @Get(':id/members')
  getMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.projectsService.getMembers(id, orgId);
  }
}
