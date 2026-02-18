import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReviewAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitReviewDto } from './dto/submit-review.dto';

// Map entity types to Prisma delegate names
const ENTITY_TABLE_MAP: Record<string, string> = {
  weather: 'weatherEntry',
  workforce: 'workforceEntry',
  equipment: 'equipmentEntry',
  workCompleted: 'workCompletedEntry',
  material: 'materialEntry',
  safety: 'safetyEntry',
  delay: 'delayEntry',
};

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);
  private readonly confidenceThreshold: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.confidenceThreshold =
      parseFloat(this.configService.get<string>('AI_CONFIDENCE_THRESHOLD') || '0.85');
  }

  /**
   * Get all AI-generated entries below the confidence threshold for a daily log
   */
  async getPending(dailyLogId: string, projectId: string) {
    // Verify log exists
    const log = await this.prisma.dailyLog.findFirst({
      where: { id: dailyLogId, projectId },
    });
    if (!log) throw new NotFoundException('Daily log not found');

    const threshold = this.confidenceThreshold;
    const pending: Array<{
      entityType: string;
      entityId: string;
      data: any;
      aiConfidence: number | null;
    }> = [];

    // Check weather
    const weather = await this.prisma.weatherEntry.findUnique({
      where: { dailyLogId },
    });
    if (weather?.aiGenerated && (weather.aiConfidence ?? 0) < threshold) {
      pending.push({
        entityType: 'weather',
        entityId: weather.id,
        data: weather,
        aiConfidence: weather.aiConfidence,
      });
    }

    // Check safety
    const safety = await this.prisma.safetyEntry.findUnique({
      where: { dailyLogId },
    });
    if (safety?.aiGenerated && (safety.aiConfidence ?? 0) < threshold) {
      pending.push({
        entityType: 'safety',
        entityId: safety.id,
        data: safety,
        aiConfidence: safety.aiConfidence,
      });
    }

    // Check workforce entries
    const workforce = await this.prisma.workforceEntry.findMany({
      where: { dailyLogId, aiGenerated: true, aiConfidence: { lt: threshold } },
    });
    for (const wf of workforce) {
      pending.push({
        entityType: 'workforce',
        entityId: wf.id,
        data: wf,
        aiConfidence: wf.aiConfidence,
      });
    }

    // Check equipment entries
    const equipment = await this.prisma.equipmentEntry.findMany({
      where: { dailyLogId, aiGenerated: true, aiConfidence: { lt: threshold } },
    });
    for (const eq of equipment) {
      pending.push({
        entityType: 'equipment',
        entityId: eq.id,
        data: eq,
        aiConfidence: eq.aiConfidence,
      });
    }

    // Check work completed entries
    const workCompleted = await this.prisma.workCompletedEntry.findMany({
      where: { dailyLogId, aiGenerated: true, aiConfidence: { lt: threshold } },
    });
    for (const wc of workCompleted) {
      pending.push({
        entityType: 'workCompleted',
        entityId: wc.id,
        data: wc,
        aiConfidence: wc.aiConfidence,
      });
    }

    // Check material entries
    const materials = await this.prisma.materialEntry.findMany({
      where: { dailyLogId, aiGenerated: true, aiConfidence: { lt: threshold } },
    });
    for (const mat of materials) {
      pending.push({
        entityType: 'material',
        entityId: mat.id,
        data: mat,
        aiConfidence: mat.aiConfidence,
      });
    }

    // Check delay entries
    const delays = await this.prisma.delayEntry.findMany({
      where: { dailyLogId, aiGenerated: true, aiConfidence: { lt: threshold } },
    });
    for (const d of delays) {
      pending.push({
        entityType: 'delay',
        entityId: d.id,
        data: d,
        aiConfidence: d.aiConfidence,
      });
    }

    // Sort by confidence ascending (lowest confidence first)
    pending.sort((a, b) => (a.aiConfidence ?? 0) - (b.aiConfidence ?? 0));

    return {
      dailyLogId,
      confidenceThreshold: threshold,
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
    // Verify log exists
    const log = await this.prisma.dailyLog.findFirst({
      where: { id: dailyLogId, projectId },
    });
    if (!log) throw new NotFoundException('Daily log not found');

    const tableName = ENTITY_TABLE_MAP[dto.entityType];
    if (!tableName) {
      throw new BadRequestException(`Invalid entity type: ${dto.entityType}`);
    }

    // Fetch the current entity to store previousValue
    const delegate = (this.prisma as any)[tableName];
    const entity = await delegate.findUnique({ where: { id: dto.entityId } });
    if (!entity) {
      throw new NotFoundException(`${dto.entityType} entry not found`);
    }

    // Verify the entry belongs to this daily log
    if (entity.dailyLogId !== dailyLogId) {
      throw new BadRequestException('Entry does not belong to this daily log');
    }

    let previousValue: any = null;
    let newValue: any = null;

    switch (dto.action) {
      case ReviewAction.APPROVED:
        // Confirm the AI entry — set confidence to 1.0
        await delegate.update({
          where: { id: dto.entityId },
          data: { aiConfidence: 1.0 },
        });
        previousValue = { aiConfidence: entity.aiConfidence };
        newValue = { aiConfidence: 1.0 };
        break;

      case ReviewAction.REJECTED:
        // Delete the AI-generated entry entirely
        await delegate.delete({ where: { id: dto.entityId } });
        previousValue = entity;
        newValue = null;
        break;

      case ReviewAction.MODIFIED:
        if (!dto.newValue || Object.keys(dto.newValue).length === 0) {
          throw new BadRequestException('newValue is required for MODIFIED action');
        }
        // Store previous state for the modified fields
        previousValue = {};
        for (const key of Object.keys(dto.newValue)) {
          previousValue[key] = entity[key];
        }
        newValue = dto.newValue;

        // Apply modifications and set confidence to 1.0 (human-verified)
        await delegate.update({
          where: { id: dto.entityId },
          data: { ...dto.newValue, aiConfidence: 1.0 },
        });
        break;
    }

    // Create the audit trail entry
    const reviewEntry = await this.prisma.reviewEntry.create({
      data: {
        dailyLogId,
        reviewerId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        fieldName: dto.fieldName,
        action: dto.action,
        reasonCode: dto.reasonCode,
        previousValue,
        newValue,
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
   * Get accuracy stats: how often AI entries are approved vs modified vs rejected
   */
  async getStats(projectId: string) {
    // Get all daily log IDs for this project
    const logs = await this.prisma.dailyLog.findMany({
      where: { projectId },
      select: { id: true },
    });
    const logIds = logs.map((l) => l.id);

    if (logIds.length === 0) {
      return {
        projectId,
        totalReviews: 0,
        approved: 0,
        rejected: 0,
        modified: 0,
        approvalRate: 0,
        byEntityType: {},
      };
    }

    const reviews = await this.prisma.reviewEntry.findMany({
      where: { dailyLogId: { in: logIds } },
      select: { action: true, entityType: true },
    });

    const total = reviews.length;
    const approved = reviews.filter((r) => r.action === ReviewAction.APPROVED).length;
    const rejected = reviews.filter((r) => r.action === ReviewAction.REJECTED).length;
    const modified = reviews.filter((r) => r.action === ReviewAction.MODIFIED).length;

    // Breakdown by entity type
    const byEntityType: Record<
      string,
      { total: number; approved: number; rejected: number; modified: number; approvalRate: number }
    > = {};

    for (const review of reviews) {
      if (!byEntityType[review.entityType]) {
        byEntityType[review.entityType] = {
          total: 0,
          approved: 0,
          rejected: 0,
          modified: 0,
          approvalRate: 0,
        };
      }
      byEntityType[review.entityType].total++;
      if (review.action === ReviewAction.APPROVED) byEntityType[review.entityType].approved++;
      if (review.action === ReviewAction.REJECTED) byEntityType[review.entityType].rejected++;
      if (review.action === ReviewAction.MODIFIED) byEntityType[review.entityType].modified++;
    }

    // Calculate approval rates
    for (const type of Object.keys(byEntityType)) {
      const t = byEntityType[type];
      t.approvalRate = t.total > 0 ? Math.round((t.approved / t.total) * 100) : 0;
    }

    return {
      projectId,
      totalReviews: total,
      approved,
      rejected,
      modified,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      byEntityType,
    };
  }
}
