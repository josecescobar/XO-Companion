import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient, ReviewAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ComplianceService } from '../compliance/compliance.service';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { BatchApproveDto } from './dto/batch-approve.dto';

// ---------------------------------------------------------------------------
// Entity type dispatch – replaces the untyped ENTITY_TABLE_MAP + `as any`
// ---------------------------------------------------------------------------

const ENTITY_TYPES = [
  'weather', 'workforce', 'equipment', 'workCompleted',
  'material', 'safety', 'delay',
] as const;

type EntityType = (typeof ENTITY_TYPES)[number];

function isEntityType(value: string): value is EntityType {
  return (ENTITY_TYPES as readonly string[]).includes(value);
}

/** Common fields shared by all reviewable entry models. */
interface EntryRecord {
  id: string;
  dailyLogId: string;
  aiConfidence: number | null;
  aiConfidenceReason: string | null;
  reviewStatus: string | null;
  aiGenerated: boolean | null;
  [key: string]: unknown;
}

/** Minimal delegate interface for entry model operations used by ReviewService. */
interface EntryDelegate {
  findUnique(args: { where: { id: string } }): PromiseLike<EntryRecord | null>;
  findMany(args: Record<string, unknown>): PromiseLike<EntryRecord[]>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): PromiseLike<EntryRecord>;
}

/** Subset of PrismaClient that exposes entry model delegates. */
type EntryClient = Pick<
  PrismaClient,
  'weatherEntry' | 'workforceEntry' | 'equipmentEntry' |
  'workCompletedEntry' | 'materialEntry' | 'safetyEntry' | 'delayEntry'
>;

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);
  private readonly confidenceThreshold: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private complianceService: ComplianceService,
  ) {
    this.confidenceThreshold =
      parseFloat(this.configService.get<string>('AI_CONFIDENCE_THRESHOLD') || '0.85');
  }

  /**
   * Returns a typed delegate for the given entity type.
   *
   * Each Prisma delegate satisfies EntryDelegate at runtime; the
   * `as unknown as EntryDelegate` bridges Prisma's complex generics
   * to a simple interface that provides type safety at every call site.
   */
  private getDelegate(entityType: EntityType, client: EntryClient = this.prisma): EntryDelegate {
    switch (entityType) {
      case 'weather':       return client.weatherEntry as unknown as EntryDelegate;
      case 'workforce':     return client.workforceEntry as unknown as EntryDelegate;
      case 'equipment':     return client.equipmentEntry as unknown as EntryDelegate;
      case 'workCompleted': return client.workCompletedEntry as unknown as EntryDelegate;
      case 'material':      return client.materialEntry as unknown as EntryDelegate;
      case 'safety':        return client.safetyEntry as unknown as EntryDelegate;
      case 'delay':         return client.delayEntry as unknown as EntryDelegate;
    }
  }

  /**
   * Get all AI-generated entries pending review for a daily log
   */
  async getPending(dailyLogId: string, projectId: string) {
    const log = await this.prisma.dailyLog.findFirst({
      where: { id: dailyLogId, projectId },
    });
    if (!log) throw new NotFoundException('Daily log not found');

    const pending: Array<{
      entityType: string;
      entityId: string;
      data: EntryRecord;
      aiConfidence: number | null;
      aiConfidenceReason: string | null;
      reviewStatus: string | null;
    }> = [];

    // Check singletons (weather, safety)
    const weather = await this.prisma.weatherEntry.findUnique({
      where: { dailyLogId },
    });
    if (weather?.reviewStatus === 'PENDING_REVIEW') {
      pending.push({
        entityType: 'weather',
        entityId: weather.id,
        data: weather as EntryRecord,
        aiConfidence: weather.aiConfidence,
        aiConfidenceReason: weather.aiConfidenceReason,
        reviewStatus: weather.reviewStatus,
      });
    }

    const safety = await this.prisma.safetyEntry.findUnique({
      where: { dailyLogId },
    });
    if (safety?.reviewStatus === 'PENDING_REVIEW') {
      pending.push({
        entityType: 'safety',
        entityId: safety.id,
        data: safety as EntryRecord,
        aiConfidence: safety.aiConfidence,
        aiConfidenceReason: safety.aiConfidenceReason,
        reviewStatus: safety.reviewStatus,
      });
    }

    // Check array types
    const arrayTypes: EntityType[] = ['workforce', 'equipment', 'workCompleted', 'material', 'delay'];
    for (const entityType of arrayTypes) {
      const delegate = this.getDelegate(entityType);
      const entries = await delegate.findMany({
        where: { dailyLogId, reviewStatus: 'PENDING_REVIEW' },
      });
      for (const entry of entries) {
        pending.push({
          entityType,
          entityId: entry.id,
          data: entry,
          aiConfidence: entry.aiConfidence,
          aiConfidenceReason: entry.aiConfidenceReason,
          reviewStatus: entry.reviewStatus,
        });
      }
    }

    // Sort by confidence ascending (lowest confidence first)
    pending.sort((a, b) => (a.aiConfidence ?? 0) - (b.aiConfidence ?? 0));

    return {
      dailyLogId,
      confidenceThreshold: this.confidenceThreshold,
      totalPending: pending.length,
      entries: pending,
    };
  }

  /**
   * Submit a review for a specific AI-generated entry
   */
  async submitReview(
    dailyLogId: string,
    projectId: string,
    reviewerId: string,
    dto: SubmitReviewDto,
  ) {
    const log = await this.prisma.dailyLog.findFirst({
      where: { id: dailyLogId, projectId },
    });
    if (!log) throw new NotFoundException('Daily log not found');

    if (!isEntityType(dto.entityType)) {
      throw new BadRequestException(`Invalid entity type: ${dto.entityType}`);
    }

    const delegate = this.getDelegate(dto.entityType);
    const entity = await delegate.findUnique({ where: { id: dto.entityId } });
    if (!entity) {
      throw new NotFoundException(`${dto.entityType} entry not found`);
    }

    if (entity.dailyLogId !== dailyLogId) {
      throw new BadRequestException('Entry does not belong to this daily log');
    }

    let previousValue: Record<string, unknown> | null = null;
    let newValue: Record<string, unknown> | null = null;

    switch (dto.action) {
      case ReviewAction.APPROVED:
        await delegate.update({
          where: { id: dto.entityId },
          data: { aiConfidence: 1.0, reviewStatus: 'APPROVED' },
        });
        previousValue = { aiConfidence: entity.aiConfidence, reviewStatus: entity.reviewStatus };
        newValue = { aiConfidence: 1.0, reviewStatus: 'APPROVED' };
        if (dto.entityType === 'safety') {
          void this.complianceService.handleSafetyEntryApproved(dto.entityId);
        }
        break;

      case ReviewAction.REJECTED:
        // Soft-reject: update status instead of deleting
        previousValue = { ...entity };
        newValue = { reviewStatus: 'REJECTED' };
        await delegate.update({
          where: { id: dto.entityId },
          data: { reviewStatus: 'REJECTED' },
        });
        break;

      case ReviewAction.MODIFIED:
        if (!dto.newValue || Object.keys(dto.newValue).length === 0) {
          throw new BadRequestException('newValue is required for MODIFIED action');
        }
        previousValue = {};
        for (const key of Object.keys(dto.newValue)) {
          previousValue[key] = entity[key];
        }
        previousValue.reviewStatus = entity.reviewStatus;
        newValue = { ...dto.newValue, reviewStatus: 'APPROVED' };

        await delegate.update({
          where: { id: dto.entityId },
          data: { ...dto.newValue, aiConfidence: 1.0, reviewStatus: 'APPROVED' },
        });
        if (dto.entityType === 'safety') {
          void this.complianceService.handleSafetyEntryApproved(dto.entityId);
        }
        break;
    }

    const reviewEntry = await this.prisma.reviewEntry.create({
      data: {
        dailyLogId,
        reviewerId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        fieldName: dto.fieldName,
        action: dto.action,
        reasonCode: dto.reasonCode,
        previousValue: previousValue as unknown as Prisma.InputJsonValue,
        newValue: newValue as unknown as Prisma.InputJsonValue,
        comment: dto.comment,
      },
      include: {
        reviewer: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    this.logger.log(
      `Review ${dto.action} by ${reviewerId} on ${dto.entityType}:${dto.entityId}`,
    );

    return reviewEntry;
  }

  /**
   * Batch approve entries by explicit IDs and/or confidence threshold
   */
  async batchApprove(
    dailyLogId: string,
    projectId: string,
    reviewerId: string,
    dto: BatchApproveDto,
  ) {
    const log = await this.prisma.dailyLog.findFirst({
      where: { id: dailyLogId, projectId },
    });
    if (!log) throw new NotFoundException('Daily log not found');

    // Collect all entries to approve
    let entriesToApprove: Array<{ entityType: string; entityId: string }> = [];

    if (dto.entryIds?.length) {
      entriesToApprove.push(...dto.entryIds);
    }

    // If threshold set, find all PENDING_REVIEW entries above threshold
    if (dto.approveAllAboveConfidence !== undefined) {
      const threshold = dto.approveAllAboveConfidence;
      for (const entityType of ENTITY_TYPES) {
        const delegate = this.getDelegate(entityType);
        const entries = await delegate.findMany({
          where: {
            dailyLogId,
            reviewStatus: 'PENDING_REVIEW',
            aiConfidence: { gte: threshold },
          },
          select: { id: true },
        });
        for (const entry of entries) {
          if (!entriesToApprove.some(e => e.entityType === entityType && e.entityId === entry.id)) {
            entriesToApprove.push({ entityType, entityId: entry.id });
          }
        }
      }
    }

    if (entriesToApprove.length === 0) {
      return { approved: 0, reviewEntries: [] };
    }

    const reviewEntries = await this.prisma.$transaction(async (tx) => {
      const results: Record<string, unknown>[] = [];

      for (const { entityType, entityId } of entriesToApprove) {
        if (!isEntityType(entityType)) continue;

        const delegate = this.getDelegate(entityType, tx as EntryClient);
        const entity = await delegate.findUnique({ where: { id: entityId } });
        if (!entity || entity.dailyLogId !== dailyLogId) continue;

        await delegate.update({
          where: { id: entityId },
          data: { aiConfidence: 1.0, reviewStatus: 'APPROVED' },
        });

        const reviewEntry = await tx.reviewEntry.create({
          data: {
            dailyLogId,
            reviewerId,
            entityType,
            entityId,
            action: 'APPROVED',
            previousValue: { aiConfidence: entity.aiConfidence, reviewStatus: entity.reviewStatus },
            newValue: { aiConfidence: 1.0, reviewStatus: 'APPROVED' },
            comment: dto.approveAllAboveConfidence !== undefined
              ? `Batch approved (threshold: ${dto.approveAllAboveConfidence})`
              : 'Batch approved',
          },
        });
        results.push(reviewEntry);
      }

      return results;
    });

    this.logger.log(
      `Batch approved ${reviewEntries.length} entries by ${reviewerId} on log ${dailyLogId}`,
    );

    // Fire compliance hooks for any approved safety entries
    for (const { entityType, entityId } of entriesToApprove) {
      if (entityType === 'safety') {
        void this.complianceService.handleSafetyEntryApproved(entityId);
      }
    }

    return {
      approved: reviewEntries.length,
      reviewEntries,
    };
  }

  /**
   * Get all review entries for a daily log (audit trail)
   */
  async findAll(dailyLogId: string, projectId: string) {
    const log = await this.prisma.dailyLog.findFirst({
      where: { id: dailyLogId, projectId },
    });
    if (!log) throw new NotFoundException('Daily log not found');

    return this.prisma.reviewEntry.findMany({
      where: { dailyLogId },
      include: {
        reviewer: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get review stats with confidence tier breakdown
   */
  async getStats(projectId: string, dailyLogId?: string) {
    let logIds: string[];

    if (dailyLogId) {
      const log = await this.prisma.dailyLog.findFirst({
        where: { id: dailyLogId, projectId },
      });
      if (!log) throw new NotFoundException('Daily log not found');
      logIds = [dailyLogId];
    } else {
      const logs = await this.prisma.dailyLog.findMany({
        where: { projectId },
        select: { id: true },
      });
      logIds = logs.map((l) => l.id);
    }

    if (logIds.length === 0) {
      return {
        projectId,
        dailyLogId: dailyLogId || null,
        totalReviews: 0,
        approved: 0,
        rejected: 0,
        modified: 0,
        approvalRate: 0,
        byEntityType: {},
        confidenceTiers: { green: 0, yellow: 0, red: 0 },
        avgConfidence: 0,
        readyForBatchApprove: 0,
        pendingReviewCount: 0,
      };
    }

    // Review action stats
    const reviews = await this.prisma.reviewEntry.findMany({
      where: { dailyLogId: { in: logIds } },
      select: { action: true, entityType: true },
    });

    const total = reviews.length;
    const approved = reviews.filter((r) => r.action === ReviewAction.APPROVED).length;
    const rejected = reviews.filter((r) => r.action === ReviewAction.REJECTED).length;
    const modified = reviews.filter((r) => r.action === ReviewAction.MODIFIED).length;

    const byEntityType: Record<
      string,
      { total: number; approved: number; rejected: number; modified: number; approvalRate: number }
    > = {};

    for (const review of reviews) {
      if (!byEntityType[review.entityType]) {
        byEntityType[review.entityType] = {
          total: 0, approved: 0, rejected: 0, modified: 0, approvalRate: 0,
        };
      }
      byEntityType[review.entityType].total++;
      if (review.action === ReviewAction.APPROVED) byEntityType[review.entityType].approved++;
      if (review.action === ReviewAction.REJECTED) byEntityType[review.entityType].rejected++;
      if (review.action === ReviewAction.MODIFIED) byEntityType[review.entityType].modified++;
    }

    for (const type of Object.keys(byEntityType)) {
      const t = byEntityType[type];
      t.approvalRate = t.total > 0 ? Math.round((t.approved / t.total) * 100) : 0;
    }

    // Confidence tier breakdown from AI entries
    const allConfidences: number[] = [];
    let pendingReviewCount = 0;
    let readyForBatchApprove = 0;

    for (const entityType of ENTITY_TYPES) {
      const delegate = this.getDelegate(entityType);
      const entries = await delegate.findMany({
        where: { dailyLogId: { in: logIds }, aiGenerated: true },
        select: { aiConfidence: true, reviewStatus: true },
      });
      for (const entry of entries) {
        if (entry.aiConfidence !== null) {
          allConfidences.push(entry.aiConfidence);
        }
        if (entry.reviewStatus === 'PENDING_REVIEW') {
          pendingReviewCount++;
          if ((entry.aiConfidence ?? 0) >= this.confidenceThreshold) {
            readyForBatchApprove++;
          }
        }
      }
    }

    const greenCount = allConfidences.filter(c => c > 0.85).length;
    const yellowCount = allConfidences.filter(c => c >= 0.60 && c <= 0.85).length;
    const redCount = allConfidences.filter(c => c < 0.60).length;
    const avgConfidence = allConfidences.length > 0
      ? Math.round((allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length) * 100) / 100
      : 0;

    return {
      projectId,
      dailyLogId: dailyLogId || null,
      totalReviews: total,
      approved,
      rejected,
      modified,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      byEntityType,
      confidenceTiers: {
        green: greenCount,
        yellow: yellowCount,
        red: redCount,
      },
      avgConfidence,
      readyForBatchApprove,
      pendingReviewCount,
    };
  }
}
