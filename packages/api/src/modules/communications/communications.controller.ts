import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CommunicationsService } from './communications.service';
import { CreateCommunicationDto } from './dto/create-communication.dto';
import { UpdateCommunicationDto } from './dto/update-communication.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Communications')
@ApiBearerAuth()
@Controller('projects/:projectId/communications')
export class CommunicationsController {
  constructor(private communicationsService: CommunicationsService) {}

  @Post()
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateCommunicationDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.communicationsService.create(
      user.id,
      user.organizationId,
      projectId,
      dto,
    );
  }

  @Get()
  list(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('urgency') urgency?: string,
  ) {
    return this.communicationsService.list(projectId, { type, status, urgency });
  }

  @Get('summary')
  getSummary(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.communicationsService.getSummary(projectId);
  }

  @Get(':id')
  getById(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.communicationsService.getById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommunicationDto,
  ) {
    return this.communicationsService.update(id, dto);
  }

  @Post(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.communicationsService.approve(id, user.id);
  }

  @Post(':id/send')
  markSent(@Param('id', ParseUUIDPipe) id: string) {
    return this.communicationsService.markSent(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.communicationsService.cancel(id);
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.communicationsService.delete(id);
  }

  @Post(':id/redraft')
  redraft(@Param('id', ParseUUIDPipe) id: string) {
    return this.communicationsService.redraft(id);
  }
}
