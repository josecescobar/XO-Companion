import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { InspectionResult, InspectionType } from '@prisma/client';

@Injectable()
export class InspectionsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('inspection-processing') private inspectionQueue: Queue,
  ) {}

  async create(
    userId: string,
    orgId: string,
    projectId: string,
    dto: CreateInspectionDto,
  ) {
    const inspection = await this.prisma.inspection.create({
      data: {
        organizationId: orgId,
        projectId,
        mediaId: dto.mediaId,
        documentId: dto.documentId || null,
        dailyLogId: dto.dailyLogId || null,
        title: dto.title,
        description: dto.description || null,
        inspectionType: dto.inspectionType,
        status: 'PENDING',
        createdById: userId,
      },
      include: {
        media: { select: { id: true, fileName: true, mimeType: true } },
        document: { select: { id: true, title: true, category: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Queue async processing
    await this.inspectionQueue.add('process-inspection', {
      inspectionId: inspection.id,
      projectId,
    });

    return inspection;
  }

  async list(
    projectId: string,
    filters?: { inspectionType?: InspectionType; status?: InspectionResult; dailyLogId?: string },
  ) {
    const where: any = { projectId };
    if (filters?.inspectionType) where.inspectionType = filters.inspectionType;
    if (filters?.status) where.status = filters.status;
    if (filters?.dailyLogId) where.dailyLogId = filters.dailyLogId;

    return this.prisma.inspection.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        media: { select: { id: true, fileName: true, mimeType: true } },
        document: { select: { id: true, title: true, category: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getById(id: string) {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id },
      include: {
        media: { select: { id: true, fileName: true, mimeType: true } },
        document: { select: { id: true, title: true, category: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!inspection) throw new NotFoundException('Inspection not found');
    return inspection;
  }

  async review(
    inspectionId: string,
    reviewerId: string,
    result: InspectionResult,
    notes?: string,
  ) {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id: inspectionId },
    });
    if (!inspection) throw new NotFoundException('Inspection not found');

    return this.prisma.inspection.update({
      where: { id: inspectionId },
      data: {
        status: result,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: notes || null,
      },
      include: {
        media: { select: { id: true, fileName: true, mimeType: true } },
        document: { select: { id: true, title: true, category: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async delete(id: string) {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id },
    });
    if (!inspection) throw new NotFoundException('Inspection not found');
    await this.prisma.inspection.delete({ where: { id } });
  }

  async getSummary(projectId: string) {
    const counts = await this.prisma.inspection.groupBy({
      by: ['status'],
      where: { projectId },
      _count: true,
    });

    const statusMap: Record<string, number> = {};
    for (const c of counts) {
      statusMap[c.status] = c._count;
    }

    return {
      total: Object.values(statusMap).reduce((a, b) => a + b, 0),
      pass: statusMap['PASS'] || 0,
      fail: statusMap['FAIL'] || 0,
      needsAttention: statusMap['NEEDS_ATTENTION'] || 0,
      pending: (statusMap['PENDING'] || 0) + (statusMap['PROCESSING'] || 0),
      inconclusive: statusMap['INCONCLUSIVE'] || 0,
    };
  }
}
