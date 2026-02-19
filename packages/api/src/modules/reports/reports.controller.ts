import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ProjectsService } from '../projects/projects.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('projects/:projectId/reports')
export class ReportsController {
  constructor(
    private reportsService: ReportsService,
    private projectsService: ProjectsService,
  ) {}

  @Get('weekly')
  @ApiOperation({ summary: 'Generate weekly progress report' })
  async getWeeklyReport(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('weekOf') weekOf: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    const weekOfDate = weekOf || new Date().toISOString().split('T')[0];
    return this.reportsService.generateWeeklyReport(projectId, weekOfDate);
  }
}
