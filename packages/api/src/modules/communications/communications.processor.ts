import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { DraftingService } from './services/drafting.service';
import { NotificationsService } from '../notifications/notifications.service';

@Processor('communication-drafting')
export class CommunicationsProcessor extends WorkerHost {
  private readonly logger = new Logger(CommunicationsProcessor.name);

  constructor(
    private prisma: PrismaService,
    private draftingService: DraftingService,
    private notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<{ communicationId: string; projectId: string }>) {
    const { communicationId, projectId } = job.data;

    try {
      const comm = await this.prisma.communication.findUniqueOrThrow({
        where: { id: communicationId },
        include: {
          project: { select: { name: true } },
          createdBy: { select: { firstName: true, lastName: true } },
          organization: { select: { name: true } },
          dailyLog: {
            select: {
              logDate: true,
              weather: true,
              workforce: { take: 5 },
              workCompleted: { take: 5 },
              delays: { take: 3 },
            },
          },
        },
      });

      // Build a brief log summary for context
      let recentLogSummary = '';
      if (comm.dailyLog) {
        const log = comm.dailyLog;
        const parts: string[] = [];
        if (log.weather) {
          const weather = log.weather as Record<string, unknown>;
          parts.push(`Weather: ${weather.conditions}`);
        }
        if (log.workforce.length > 0) parts.push(`Trades on site: ${log.workforce.map((w) => w.trade).join(', ')}`);
        if (log.workCompleted.length > 0) parts.push(`Work completed: ${log.workCompleted.map((w) => w.description).join('; ')}`);
        if (log.delays.length > 0) parts.push(`Delays: ${log.delays.map((d) => `${d.description} (${d.durationMinutes}min)`).join('; ')}`);
        recentLogSummary = parts.join('\n');
      }

      const draft = await this.draftingService.draftMessage({
        type: comm.type,
        recipient: comm.recipient,
        subject: comm.subject,
        urgency: comm.urgency,
        context: comm.context || comm.subject,
        projectName: comm.project.name,
        senderName: `${comm.createdBy.firstName} ${comm.createdBy.lastName}`,
        senderCompany: comm.organization.name,
        recentLogSummary: recentLogSummary || undefined,
      });

      await this.prisma.communication.update({
        where: { id: communicationId },
        data: {
          subject: draft.subject,
          body: draft.body,
          status: 'DRAFT',
          aiDraftedAt: new Date(),
          tokensUsed: draft.tokensUsed,
        },
      });

      // Notify the user their draft is ready
      try {
        const typeLabel: Record<string, string> = {
          EMAIL: '📧 Email',
          TEXT: '💬 Text',
          CALL: '📞 Call',
          RFI: '❓ RFI',
          CHANGE_ORDER: '🔄 Change Order',
        };

        await this.notificationsService.sendToUser(comm.createdById, {
          title: `${typeLabel[comm.type] || '✉️'} Draft Ready`,
          body: `"${comm.subject}" to ${comm.recipient}. Tap to review and approve.`,
          data: {
            screen: 'communication-draft',
            projectId,
            commId: communicationId,
          },
        });
      } catch (err: unknown) {
        this.logger.warn(`Failed to send communication notification: ${err instanceof Error ? err.message : String(err)}`);
      }

      this.logger.log(`Drafted communication ${communicationId}: ${comm.type} to ${comm.recipient}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Communication draft failed ${communicationId}: ${message}`);
      await this.prisma.communication.update({
        where: { id: communicationId },
        data: {
          status: 'DRAFT',
          processingError: message,
          body: `[AI drafting failed — please write manually]\n\nContext: ${(await this.prisma.communication.findUnique({ where: { id: communicationId } }))?.context || 'N/A'}`,
        },
      });
    }
  }
}
