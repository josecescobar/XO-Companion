import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  // ─── Project Dashboard ───

  @Get('projects/:projectId/dashboard')
  async getProjectDashboard(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.analyticsService.getProjectDashboard(projectId, user.organizationId);
  }

  // ─── Organization Overview ───

  @Get('overview')
  async getOrganizationOverview(
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.analyticsService.getOrganizationOverview(user.organizationId);
  }

  // ─── Trigger Analysis ───

  @Post('projects/:projectId/analyze')
  async runAnalysis(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.analyticsService.runRiskAnalysis(projectId, user.organizationId);
  }

  // ─── Alerts ───

  @Get('alerts')
  async listAlerts(
    @Query('projectId') projectId?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('alertType') alertType?: string,
    @CurrentUser() user?: { id: string; organizationId: string },
  ) {
    return this.analyticsService.findAlerts(user!.organizationId, {
      projectId,
      severity,
      status,
      alertType,
    });
  }

  @Get('alerts/:id')
  async getAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.analyticsService.findAlert(id, user.organizationId);
  }

  @Patch('alerts/:id/acknowledge')
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER, Role.SUPERINTENDENT)
  async acknowledgeAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.analyticsService.acknowledgeAlert(id, user.organizationId, user.id);
  }

  @Patch('alerts/:id/resolve')
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER, Role.SUPERINTENDENT)
  async resolveAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.analyticsService.resolveAlert(id, user.organizationId);
  }

  @Patch('alerts/:id/dismiss')
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER, Role.SUPERINTENDENT)
  async dismissAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.analyticsService.dismissAlert(id, user.organizationId);
  }

  // ─── Detail Endpoints ───

  @Get('projects/:projectId/delays')
  async getDelayAnalysis(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.analyticsService.getDelayAnalysis(projectId, user.organizationId);
  }

  @Get('projects/:projectId/safety')
  async getSafetyMetrics(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.analyticsService.getSafetyMetrics(projectId, user.organizationId);
  }

  @Get('projects/:projectId/workforce')
  async getWorkforceTrends(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.analyticsService.getWorkforceTrends(projectId, user.organizationId);
  }
}
