import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ComplianceService } from './compliance.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { CreateTrainingDto } from './dto/create-training.dto';
import { UpdateTrainingDto } from './dto/update-training.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Compliance')
@ApiBearerAuth()
@Controller('compliance')
export class ComplianceController {
  constructor(private complianceService: ComplianceService) {}

  // ─── OSHA Incidents ──────────────────────────────────────────────

  @Post('incidents')
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER, Role.SAFETY_OFFICER)
  createIncident(
    @Body() dto: CreateIncidentDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.complianceService.createIncident(user.organizationId, dto);
  }

  @Get('incidents')
  findAllIncidents(
    @Query('projectId') projectId?: string,
    @Query('isRecordable', new DefaultValuePipe(undefined))
    isRecordable?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @CurrentUser() user?: { id: string; organizationId: string },
  ) {
    return this.complianceService.findAllIncidents(user!.organizationId, {
      projectId,
      isRecordable:
        isRecordable === 'true'
          ? true
          : isRecordable === 'false'
            ? false
            : undefined,
      dateFrom,
      dateTo,
    });
  }

  @Get('incidents/:id')
  findOneIncident(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.complianceService.findOneIncident(id, user.organizationId);
  }

  @Patch('incidents/:id')
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER, Role.SAFETY_OFFICER)
  updateIncident(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.complianceService.updateIncident(
      id,
      user.organizationId,
      dto,
    );
  }

  // ─── OSHA Forms ──────────────────────────────────────────────────

  @Get('osha/form-300')
  getForm300(
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe)
    year: number,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.complianceService.generateForm300(user.organizationId, year);
  }

  @Get('osha/form-300a')
  getForm300A(
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe)
    year: number,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.complianceService.generateForm300A(user.organizationId, year);
  }

  @Get('osha/form-301/:incidentId')
  getForm301(
    @Param('incidentId', ParseUUIDPipe) incidentId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.complianceService.generateForm301(
      incidentId,
      user.organizationId,
    );
  }

  // ─── Compliance Documents ────────────────────────────────────────

  @Post('documents')
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER, Role.SAFETY_OFFICER)
  createDocument(
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.complianceService.createDocument(user.organizationId, dto);
  }

  @Get('documents')
  findAllDocuments(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @CurrentUser() user?: { id: string; organizationId: string },
  ) {
    return this.complianceService.findAllDocuments(user!.organizationId, {
      type,
      status,
    });
  }

  @Get('documents/:id')
  findOneDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.complianceService.findOneDocument(id, user.organizationId);
  }

  @Patch('documents/:id')
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER, Role.SAFETY_OFFICER)
  updateDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.complianceService.updateDocument(
      id,
      user.organizationId,
      dto,
    );
  }

  @Delete('documents/:id')
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER, Role.SAFETY_OFFICER)
  deleteDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.complianceService.deleteDocument(id, user.organizationId);
  }

  // ─── Dashboard & Alerts ──────────────────────────────────────────

  @Get('dashboard')
  getDashboard(
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.complianceService.getDashboard(user.organizationId);
  }

  @Get('alerts')
  getAlerts(
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.complianceService.getAlerts(user.organizationId);
  }

  // ─── Training Records ───────────────────────────────────────────

  @Post('training')
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER, Role.SAFETY_OFFICER)
  createTraining(
    @Body() dto: CreateTrainingDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.complianceService.createTraining(user.organizationId, dto);
  }

  @Get('training')
  findAllTraining(
    @Query('employeeName') employeeName?: string,
    @Query('trainingType') trainingType?: string,
    @CurrentUser() user?: { id: string; organizationId: string },
  ) {
    return this.complianceService.findAllTraining(user!.organizationId, {
      employeeName,
      trainingType,
    });
  }

  @Get('training/expiring')
  getExpiringTraining(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.complianceService.getExpiringTraining(
      user.organizationId,
      days,
    );
  }

  @Get('training/:id')
  findOneTraining(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.complianceService.findOneTraining(id, user.organizationId);
  }

  @Patch('training/:id')
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER, Role.SAFETY_OFFICER)
  updateTraining(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrainingDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    return this.complianceService.updateTraining(
      id,
      user.organizationId,
      dto,
    );
  }
}
