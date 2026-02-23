import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CommunicationType, CommunicationUrgency } from '@prisma/client';
import { EmailService } from './email.service';

@Injectable()
export class CommunicationsService {
  private readonly logger = new Logger(CommunicationsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    @InjectQueue('communication-drafting') private draftingQueue: Queue,
  ) {}

  async create(
    userId: string,
    organizationId: string,
    projectId: string,
    data: {
      type: CommunicationType;
      recipient: string;
      recipientEmail?: string;
      recipientPhone?: string;
      subject: string;
      urgency?: CommunicationUrgency;
      context?: string;
      dailyLogId?: string;
    },
  ) {
    const record = await this.prisma.communication.create({
      data: {
        organizationId,
        projectId,
        dailyLogId: data.dailyLogId || null,
        type: data.type,
        urgency: data.urgency || 'NORMAL',
        recipient: data.recipient,
        recipientEmail: data.recipientEmail || null,
        recipientPhone: data.recipientPhone || null,
        subject: data.subject,
        context: data.context || null,
        status: 'DRAFTING',
        aiGenerated: true,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.draftingQueue.add('draft', {
      communicationId: record.id,
      projectId,
    });

    return record;
  }

  async createFromExtraction(
    userId: string,
    organizationId: string,
    projectId: string,
    extracted: Array<{
      type: string;
      recipient: string;
      subject: string;
      urgency: string;
      context: string;
      confidence: number;
    }>,
    voiceNoteId?: string,
    dailyLogId?: string,
  ) {
    const records = [];
    for (const comm of extracted) {
      const record = await this.prisma.communication.create({
        data: {
          organizationId,
          projectId,
          dailyLogId: dailyLogId || null,
          voiceNoteId: voiceNoteId || null,
          type: comm.type as CommunicationType,
          urgency: (comm.urgency as CommunicationUrgency) || 'NORMAL',
          recipient: comm.recipient,
          subject: comm.subject,
          context: comm.context,
          status: 'DRAFTING',
          aiGenerated: true,
          aiConfidence: comm.confidence,
          createdById: userId,
        },
      });

      await this.draftingQueue.add('draft', {
        communicationId: record.id,
        projectId,
      });

      records.push(record);
    }
    return records;
  }

  async list(
    projectId: string,
    filters?: { type?: string; status?: string; urgency?: string },
  ) {
    const where: any = { projectId };
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.urgency) where.urgency = filters.urgency;

    return this.prisma.communication.findMany({
      where,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string) {
    const record = await this.prisma.communication.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!record) throw new NotFoundException('Communication not found');
    return record;
  }

  async update(id: string, data: {
    recipient?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    subject?: string;
    editedBody?: string;
    urgency?: CommunicationUrgency;
  }) {
    return this.prisma.communication.update({
      where: { id },
      data,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async approve(id: string, approvedById: string) {
    const comm = await this.prisma.communication.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date(),
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Automatically send email-type communications after approval
    if (comm.type === 'EMAIL' && comm.recipientEmail) {
      try {
        const messageId = await this.emailService.sendEmail({
          to: comm.recipientEmail,
          subject: comm.subject,
          body: comm.editedBody || comm.body || '',
          replyTo: comm.createdBy.email || undefined,
        });

        return this.prisma.communication.update({
          where: { id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            externalMessageId: messageId,
          },
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true } },
            approvedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        });
      } catch (err) {
        this.logger.error(`Failed to send email for communication ${id}: ${err instanceof Error ? err.message : err}`);
        return this.prisma.communication.update({
          where: { id },
          data: {
            status: 'SEND_FAILED',
            processingError: err instanceof Error ? err.message : 'Unknown send error',
          },
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true } },
            approvedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        });
      }
    }

    return comm;
  }

  async markSent(id: string, externalMessageId?: string) {
    return this.prisma.communication.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        externalMessageId: externalMessageId || null,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async cancel(id: string) {
    return this.prisma.communication.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async delete(id: string) {
    await this.prisma.communication.delete({ where: { id } });
  }

  async redraft(id: string) {
    const comm = await this.prisma.communication.update({
      where: { id },
      data: {
        status: 'DRAFTING',
        body: null,
        editedBody: null,
        processingError: null,
        aiDraftedAt: null,
        tokensUsed: null,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.draftingQueue.add('draft', {
      communicationId: id,
      projectId: comm.projectId,
    });

    return comm;
  }

  async getSummary(projectId: string) {
    const [drafting, draft, approved, sent, total] = await Promise.all([
      this.prisma.communication.count({ where: { projectId, status: 'DRAFTING' } }),
      this.prisma.communication.count({ where: { projectId, status: 'DRAFT' } }),
      this.prisma.communication.count({ where: { projectId, status: 'APPROVED' } }),
      this.prisma.communication.count({ where: { projectId, status: 'SENT' } }),
      this.prisma.communication.count({ where: { projectId } }),
    ]);
    return { drafting, draft, approved, sent, total };
  }
}
