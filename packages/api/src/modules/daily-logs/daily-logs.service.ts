import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DailyLogStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDailyLogDto } from './dto/create-daily-log.dto';
import { UpdateDailyLogDto } from './dto/update-daily-log.dto';
import { UpsertWeatherDto } from './dto/weather.dto';
import { CreateWorkforceDto, UpdateWorkforceDto } from './dto/workforce.dto';
import { CreateEquipmentDto, UpdateEquipmentDto } from './dto/equipment.dto';
import { CreateWorkCompletedDto, UpdateWorkCompletedDto } from './dto/work-completed.dto';
import { CreateMaterialDto, UpdateMaterialDto } from './dto/material.dto';
import { UpsertSafetyDto } from './dto/safety.dto';
import { CreateDelayDto, UpdateDelayDto } from './dto/delay.dto';

const FULL_INCLUDE = {
  weather: true,
  workforce: true,
  equipment: true,
  workCompleted: true,
  materials: true,
  safety: true,
  delays: true,
  voiceNotes: { select: { id: true, status: true, durationSeconds: true, createdAt: true } },
  signatures: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  },
  createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
} as const;

@Injectable()
export class DailyLogsService {
  private readonly logger = new Logger(DailyLogsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('risk-analysis') private riskAnalysisQueue: Queue,
  ) {}

  // ─── Core CRUD ───

  async create(projectId: string, userId: string, dto: CreateDailyLogDto) {
    // Auto-increment report number per project
    const count = await this.prisma.dailyLog.count({ where: { projectId } });

    try {
      return await this.prisma.dailyLog.create({
        data: {
          projectId,
          createdById: userId,
          logDate: new Date(dto.logDate),
          notes: dto.notes,
          reportNumber: count + 1,
        },
        include: FULL_INCLUDE,
      });
    } catch {
      throw new ConflictException('A daily log already exists for this date');
    }
  }

  async findAll(projectId: string, query?: { status?: DailyLogStatus; from?: string; to?: string }) {
    const where: any = { projectId };
    if (query?.status) where.status = query.status;
    if (query?.from || query?.to) {
      where.logDate = {};
      if (query.from) where.logDate.gte = new Date(query.from);
      if (query.to) where.logDate.lte = new Date(query.to);
    }

    return this.prisma.dailyLog.findMany({
      where,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: {
          select: {
            workforce: true,
            equipment: true,
            workCompleted: true,
            materials: true,
            delays: true,
            voiceNotes: true,
            signatures: true,
          },
        },
      },
      orderBy: { logDate: 'desc' },
    });
  }

  async findOne(id: string, projectId: string) {
    const log = await this.prisma.dailyLog.findFirst({
      where: { id, projectId },
      include: FULL_INCLUDE,
    });
    if (!log) throw new NotFoundException('Daily log not found');
    return log;
  }

  async update(id: string, projectId: string, dto: UpdateDailyLogDto) {
    const log = await this.findOne(id, projectId);
    this.assertEditable(log.status);

    return this.prisma.dailyLog.update({
      where: { id },
      data: dto,
      include: FULL_INCLUDE,
    });
  }

  async remove(id: string, projectId: string) {
    const log = await this.findOne(id, projectId);
    if (log.status !== DailyLogStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT logs can be deleted');
    }
    await this.prisma.dailyLog.delete({ where: { id } });
    return { message: 'Daily log deleted' };
  }

  // ─── Status Transitions ───

  async submitForReview(id: string, projectId: string) {
    const log = await this.findOne(id, projectId);
    if (log.status !== DailyLogStatus.DRAFT && log.status !== DailyLogStatus.AMENDED) {
      throw new BadRequestException(`Cannot submit from ${log.status} status`);
    }
    return this.prisma.dailyLog.update({
      where: { id },
      data: { status: DailyLogStatus.PENDING_REVIEW },
      include: FULL_INCLUDE,
    });
  }

  async approve(id: string, projectId: string) {
    const log = await this.findOne(id, projectId);
    if (log.status !== DailyLogStatus.PENDING_REVIEW) {
      throw new BadRequestException(`Cannot approve from ${log.status} status`);
    }
    const approved = await this.prisma.dailyLog.update({
      where: { id },
      data: { status: DailyLogStatus.APPROVED },
      include: FULL_INCLUDE,
    });

    // Queue risk analysis after approval (non-blocking)
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });
    if (project) {
      await this.riskAnalysisQueue.add('analyze', {
        projectId,
        organizationId: project.organizationId,
      }).catch((err) => this.logger.warn(`Failed to queue risk analysis: ${err.message}`));
    }

    return approved;
  }

  async amend(id: string, projectId: string) {
    const log = await this.findOne(id, projectId);
    if (log.status !== DailyLogStatus.APPROVED) {
      throw new BadRequestException(`Cannot amend from ${log.status} status`);
    }
    return this.prisma.dailyLog.update({
      where: { id },
      data: { status: DailyLogStatus.AMENDED },
      include: FULL_INCLUDE,
    });
  }

  // ─── Signature ───

  async addSignature(id: string, projectId: string, userId: string, role: Role, signatureData: string) {
    await this.findOne(id, projectId);
    try {
      return await this.prisma.signature.create({
        data: { dailyLogId: id, userId, role, signatureData },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      });
    } catch {
      throw new ConflictException('User has already signed this log');
    }
  }

  // ─── Weather (singleton upsert) ───

  async upsertWeather(logId: string, projectId: string, dto: UpsertWeatherDto) {
    const log = await this.findOne(logId, projectId);
    this.assertEditable(log.status);

    return this.prisma.weatherEntry.upsert({
      where: { dailyLogId: logId },
      create: { dailyLogId: logId, ...dto, delayMinutes: dto.delayMinutes ?? 0 },
      update: dto,
    });
  }

  // ─── Safety (singleton upsert) ───

  async upsertSafety(logId: string, projectId: string, dto: UpsertSafetyDto) {
    const log = await this.findOne(logId, projectId);
    this.assertEditable(log.status);

    return this.prisma.safetyEntry.upsert({
      where: { dailyLogId: logId },
      create: {
        dailyLogId: logId,
        toolboxTalks: dto.toolboxTalks ?? [],
        inspections: dto.inspections ?? [],
        incidents: dto.incidents ?? [],
        oshaRecordable: dto.oshaRecordable ?? false,
        nearMisses: dto.nearMisses ?? 0,
        firstAidCases: dto.firstAidCases ?? 0,
        notes: dto.notes,
        aiGenerated: dto.aiGenerated ?? false,
        aiConfidence: dto.aiConfidence,
      },
      update: dto,
    });
  }

  // ─── Workforce (array CRUD) ───

  async addWorkforce(logId: string, projectId: string, dto: CreateWorkforceDto) {
    const log = await this.findOne(logId, projectId);
    this.assertEditable(log.status);
    return this.prisma.workforceEntry.create({
      data: { dailyLogId: logId, ...dto, overtimeHours: dto.overtimeHours ?? 0 },
    });
  }

  async updateWorkforce(logId: string, projectId: string, entryId: string, dto: UpdateWorkforceDto) {
    await this.findOne(logId, projectId);
    return this.prisma.workforceEntry.update({ where: { id: entryId }, data: dto });
  }

  async removeWorkforce(logId: string, projectId: string, entryId: string) {
    await this.findOne(logId, projectId);
    await this.prisma.workforceEntry.delete({ where: { id: entryId } });
    return { message: 'Entry deleted' };
  }

  // ─── Equipment (array CRUD) ───

  async addEquipment(logId: string, projectId: string, dto: CreateEquipmentDto) {
    const log = await this.findOne(logId, projectId);
    this.assertEditable(log.status);
    return this.prisma.equipmentEntry.create({
      data: { dailyLogId: logId, ...dto, idleHours: dto.idleHours ?? 0 },
    });
  }

  async updateEquipment(logId: string, projectId: string, entryId: string, dto: UpdateEquipmentDto) {
    await this.findOne(logId, projectId);
    return this.prisma.equipmentEntry.update({ where: { id: entryId }, data: dto });
  }

  async removeEquipment(logId: string, projectId: string, entryId: string) {
    await this.findOne(logId, projectId);
    await this.prisma.equipmentEntry.delete({ where: { id: entryId } });
    return { message: 'Entry deleted' };
  }

  // ─── Work Completed (array CRUD) ───

  async addWorkCompleted(logId: string, projectId: string, dto: CreateWorkCompletedDto) {
    const log = await this.findOne(logId, projectId);
    this.assertEditable(log.status);
    return this.prisma.workCompletedEntry.create({
      data: { dailyLogId: logId, ...dto },
    });
  }

  async updateWorkCompleted(logId: string, projectId: string, entryId: string, dto: UpdateWorkCompletedDto) {
    await this.findOne(logId, projectId);
    return this.prisma.workCompletedEntry.update({ where: { id: entryId }, data: dto });
  }

  async removeWorkCompleted(logId: string, projectId: string, entryId: string) {
    await this.findOne(logId, projectId);
    await this.prisma.workCompletedEntry.delete({ where: { id: entryId } });
    return { message: 'Entry deleted' };
  }

  // ─── Materials (array CRUD) ───

  async addMaterial(logId: string, projectId: string, dto: CreateMaterialDto) {
    const log = await this.findOne(logId, projectId);
    this.assertEditable(log.status);
    return this.prisma.materialEntry.create({
      data: { dailyLogId: logId, ...dto },
    });
  }

  async updateMaterial(logId: string, projectId: string, entryId: string, dto: UpdateMaterialDto) {
    await this.findOne(logId, projectId);
    return this.prisma.materialEntry.update({ where: { id: entryId }, data: dto });
  }

  async removeMaterial(logId: string, projectId: string, entryId: string) {
    await this.findOne(logId, projectId);
    await this.prisma.materialEntry.delete({ where: { id: entryId } });
    return { message: 'Entry deleted' };
  }

  // ─── Delays (array CRUD) ───

  async addDelay(logId: string, projectId: string, dto: CreateDelayDto) {
    const log = await this.findOne(logId, projectId);
    this.assertEditable(log.status);
    return this.prisma.delayEntry.create({
      data: { dailyLogId: logId, ...dto, impactedTrades: dto.impactedTrades ?? [] },
    });
  }

  async updateDelay(logId: string, projectId: string, entryId: string, dto: UpdateDelayDto) {
    await this.findOne(logId, projectId);
    return this.prisma.delayEntry.update({ where: { id: entryId }, data: dto });
  }

  async removeDelay(logId: string, projectId: string, entryId: string) {
    await this.findOne(logId, projectId);
    await this.prisma.delayEntry.delete({ where: { id: entryId } });
    return { message: 'Entry deleted' };
  }

  // ─── Helpers ───

  private assertEditable(status: DailyLogStatus) {
    if (status !== DailyLogStatus.DRAFT && status !== DailyLogStatus.AMENDED) {
      throw new BadRequestException(`Cannot edit a log with status ${status}`);
    }
  }
}
