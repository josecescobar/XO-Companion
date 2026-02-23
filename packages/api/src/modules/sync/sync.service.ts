import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SyncOperationDto, SyncOperationType } from './dto/sync-queue.dto';

const ALLOWED_TABLES: Record<string, string> = {
  daily_logs: 'dailyLog',
  workforce_entries: 'workforceEntry',
  equipment_entries: 'equipmentEntry',
  work_completed_entries: 'workCompletedEntry',
  material_entries: 'materialEntry',
  safety_entries: 'safetyEntry',
  delay_entries: 'delayEntry',
  weather_entries: 'weatherEntry',
  voice_notes: 'voiceNote',
};

interface SyncRecord {
  id: string;
  updatedAt?: Date | null;
  [key: string]: unknown;
}

interface SyncDelegate {
  create(args: { data: Record<string, unknown> }): PromiseLike<SyncRecord>;
  findUnique(args: { where: { id: string } }): PromiseLike<SyncRecord | null>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): PromiseLike<SyncRecord>;
  delete(args: { where: { id: string } }): PromiseLike<unknown>;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private prisma: PrismaService) {}

  private getDelegate(prismaModel: string): SyncDelegate {
    switch (prismaModel) {
      case 'dailyLog': return this.prisma.dailyLog as unknown as SyncDelegate;
      case 'workforceEntry': return this.prisma.workforceEntry as unknown as SyncDelegate;
      case 'equipmentEntry': return this.prisma.equipmentEntry as unknown as SyncDelegate;
      case 'workCompletedEntry': return this.prisma.workCompletedEntry as unknown as SyncDelegate;
      case 'materialEntry': return this.prisma.materialEntry as unknown as SyncDelegate;
      case 'safetyEntry': return this.prisma.safetyEntry as unknown as SyncDelegate;
      case 'delayEntry': return this.prisma.delayEntry as unknown as SyncDelegate;
      case 'weatherEntry': return this.prisma.weatherEntry as unknown as SyncDelegate;
      case 'voiceNote': return this.prisma.voiceNote as unknown as SyncDelegate;
      default: throw new BadRequestException(`Model "${prismaModel}" is not syncable`);
    }
  }

  async processQueue(
    operations: SyncOperationDto[],
    userId: string,
    organizationId: string,
  ) {
    const results: Array<{
      clientId: string;
      status: 'created' | 'updated' | 'deleted' | 'conflict' | 'error';
      id?: string;
      error?: string;
    }> = [];

    for (const op of operations) {
      try {
        const result = await this.processOperation(op, userId, organizationId);
        results.push(result);
      } catch (error) {
        results.push({
          clientId: op.clientId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { processed: results.length, results };
  }

  private async processOperation(
    op: SyncOperationDto,
    userId: string,
    organizationId: string,
  ): Promise<{
    clientId: string;
    status: 'created' | 'updated' | 'deleted' | 'conflict';
    id?: string;
  }> {
    const prismaModel = ALLOWED_TABLES[op.table];
    if (!prismaModel) {
      throw new BadRequestException(`Table "${op.table}" is not syncable`);
    }

    const delegate = this.getDelegate(prismaModel);

    switch (op.type) {
      case SyncOperationType.CREATE:
        return this.handleCreate(delegate, op, userId, organizationId);
      case SyncOperationType.UPDATE:
        return this.handleUpdate(delegate, op, userId, organizationId);
      case SyncOperationType.DELETE:
        return this.handleDelete(delegate, op);
      default:
        throw new BadRequestException(`Unknown operation type: ${op.type}`);
    }
  }

  private async handleCreate(
    delegate: SyncDelegate,
    op: SyncOperationDto,
    userId: string,
    organizationId: string,
  ) {
    const data: Record<string, unknown> = { ...op.data };

    // Add user context for daily_logs
    if (op.table === 'daily_logs') {
      data.createdById = userId;
      if (data.logDate) data.logDate = new Date(data.logDate as string);
      // Auto-increment report number
      if (data.projectId) {
        const count = await this.prisma.dailyLog.count({
          where: { projectId: data.projectId as string },
        });
        data.reportNumber = count + 1;
      }
    }

    // Add userId for voice_notes
    if (op.table === 'voice_notes') {
      data.userId = userId;
    }

    const record = await delegate.create({ data });

    return {
      clientId: op.clientId,
      status: 'created' as const,
      id: record.id,
    };
  }

  private async handleUpdate(
    delegate: SyncDelegate,
    op: SyncOperationDto,
    userId: string,
    organizationId: string,
  ) {
    if (!op.id) {
      throw new BadRequestException('UPDATE operation requires an id');
    }

    const existing = await delegate.findUnique({ where: { id: op.id } });
    if (!existing) {
      throw new BadRequestException(`Record ${op.id} not found in ${op.table}`);
    }

    // Last-write-wins conflict resolution
    const opTimestamp = new Date(op.timestamp);
    const existingUpdated = existing.updatedAt ? new Date(existing.updatedAt) : new Date(0);

    if (opTimestamp <= existingUpdated) {
      // Conflict: server version is newer — log it
      await this.logConflict(op, existing, organizationId);
      return {
        clientId: op.clientId,
        status: 'conflict' as const,
        id: op.id,
      };
    }

    // Client version is newer — apply it
    const data: Record<string, unknown> = { ...op.data };
    if (op.table === 'daily_logs' && data.logDate) {
      data.logDate = new Date(data.logDate as string);
    }

    await delegate.update({ where: { id: op.id }, data });

    return {
      clientId: op.clientId,
      status: 'updated' as const,
      id: op.id,
    };
  }

  private async handleDelete(delegate: SyncDelegate, op: SyncOperationDto) {
    if (!op.id) {
      throw new BadRequestException('DELETE operation requires an id');
    }

    await delegate.delete({ where: { id: op.id } });

    return {
      clientId: op.clientId,
      status: 'deleted' as const,
      id: op.id,
    };
  }

  private async logConflict(
    op: SyncOperationDto,
    existing: SyncRecord,
    organizationId: string,
  ) {
    await this.prisma.syncConflictLog.create({
      data: {
        organizationId,
        table: op.table,
        recordId: op.id!,
        clientData: (op.data ?? {}) as unknown as Prisma.InputJsonValue,
        serverData: existing as unknown as Prisma.InputJsonValue,
        clientTimestamp: new Date(op.timestamp),
        serverTimestamp: existing.updatedAt ?? new Date(),
        resolution: 'SERVER_WINS',
      },
    });

    this.logger.warn(
      `Sync conflict on ${op.table}/${op.id}: server version kept (server=${existing.updatedAt}, client=${op.timestamp})`,
    );
  }

  async getStatus(organizationId: string) {
    const conflictCount = await this.prisma.syncConflictLog.count({
      where: { organizationId },
    });

    const lastConflict = await this.prisma.syncConflictLog.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const pendingUploads = await this.prisma.voiceNote.count({
      where: {
        syncStatus: 'PENDING_UPLOAD',
        dailyLog: {
          project: { organizationId },
        },
      },
    });

    return {
      conflictCount,
      lastConflictAt: lastConflict?.createdAt || null,
      pendingUploads,
      lastSyncCheck: new Date().toISOString(),
    };
  }

  async getPendingUploads(organizationId: string) {
    return this.prisma.voiceNote.findMany({
      where: {
        syncStatus: 'PENDING_UPLOAD',
        dailyLog: {
          project: { organizationId },
        },
      },
      select: {
        id: true,
        dailyLogId: true,
        userId: true,
        mimeType: true,
        durationSeconds: true,
        syncStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async uploadQueued(
    userId: string,
    organizationId: string,
    dto: {
      dailyLogId: string;
      clientId: string;
      recordedAt: string;
      mimeType?: string;
      durationSeconds?: number;
    },
  ) {
    // Verify the daily log belongs to the user's org
    const dailyLog = await this.prisma.dailyLog.findFirst({
      where: {
        id: dto.dailyLogId,
        project: { organizationId },
      },
    });

    if (!dailyLog) {
      throw new BadRequestException('Daily log not found or not in your organization');
    }

    const voiceNote = await this.prisma.voiceNote.create({
      data: {
        dailyLogId: dto.dailyLogId,
        userId,
        audioUrl: '', // placeholder until file is uploaded
        mimeType: dto.mimeType || 'audio/webm',
        durationSeconds: dto.durationSeconds,
        status: 'UPLOADING',
        syncStatus: 'PENDING_UPLOAD',
      },
    });

    return voiceNote;
  }
}
