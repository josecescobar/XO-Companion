import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class ComplianceAlertCron {
  private readonly logger = new Logger(ComplianceAlertCron.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkExpiringDocuments() {
    this.logger.log('Running daily compliance expiration check...');

    const now = new Date();
    const in30Days = new Date(now);
    in30Days.setDate(in30Days.getDate() + 30);

    // Find documents expiring within 30 days
    const expiringDocs = await this.prisma.complianceDocument.findMany({
      where: {
        expirationDate: {
          gte: now,
          lte: in30Days,
        },
        status: { not: 'EXPIRED' },
      },
      include: {
        organization: { select: { id: true } },
      },
    });

    // Also find already expired but not yet flagged
    const expiredDocs = await this.prisma.complianceDocument.findMany({
      where: {
        expirationDate: { lt: now },
        status: { not: 'EXPIRED' },
      },
      include: {
        organization: { select: { id: true } },
      },
    });

    // Group by organization
    const orgDocs = new Map<string, { expired: typeof expiredDocs; expiring: typeof expiringDocs }>();

    for (const doc of expiredDocs) {
      const orgId = doc.organizationId;
      if (!orgDocs.has(orgId)) orgDocs.set(orgId, { expired: [], expiring: [] });
      orgDocs.get(orgId)!.expired.push(doc);
    }

    for (const doc of expiringDocs) {
      const orgId = doc.organizationId;
      if (!orgDocs.has(orgId)) orgDocs.set(orgId, { expired: [], expiring: [] });

      const daysUntil = Math.ceil((new Date(doc.expirationDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if ([30, 14, 7, 3, 1].includes(daysUntil)) {
        orgDocs.get(orgId)!.expiring.push(doc);
      }
    }

    // Send notifications per organization
    for (const [orgId, docs] of orgDocs) {
      if (docs.expired.length > 0) {
        await this.notificationsService.sendToOrgRoles(orgId, ['SUPER_ADMIN', 'PROJECT_MANAGER', 'SAFETY_OFFICER'], {
          title: '🔴 Expired Documents',
          body: `${docs.expired.length} document(s) have expired: ${docs.expired.map((d) => d.name).join(', ')}`,
          data: { screen: 'compliance' },
        });
      }

      if (docs.expiring.length > 0) {
        for (const doc of docs.expiring) {
          const daysUntil = Math.ceil((new Date(doc.expirationDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          await this.notificationsService.sendToOrgRoles(orgId, ['SUPER_ADMIN', 'PROJECT_MANAGER', 'SAFETY_OFFICER'], {
            title: `⚠️ ${doc.name} Expires in ${daysUntil} Day${daysUntil === 1 ? '' : 's'}`,
            body: `Your ${doc.documentType.replace(/_/g, ' ').toLowerCase()} expires on ${new Date(doc.expirationDate!).toLocaleDateString()}. Renew now to avoid compliance issues.`,
            data: { screen: 'compliance' },
          });
        }
      }
    }

    this.logger.log(`Compliance check complete: ${expiredDocs.length} expired, ${expiringDocs.length} expiring`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkOverdueTasks() {
    this.logger.log('Running daily overdue task check...');

    const now = new Date();

    const overdueTasks = await this.prisma.task.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { lt: now },
      },
      include: {
        project: { select: { name: true } },
      },
    });

    // Group by createdById
    const userTasks = new Map<string, typeof overdueTasks>();
    for (const task of overdueTasks) {
      const userId = task.createdById;
      if (!userTasks.has(userId)) userTasks.set(userId, []);
      userTasks.get(userId)!.push(task);
    }

    for (const [userId, tasks] of userTasks) {
      await this.notificationsService.sendToUser(userId, {
        title: `⏰ ${tasks.length} Overdue Task${tasks.length === 1 ? '' : 's'}`,
        body: tasks.length === 1
          ? `"${tasks[0].description}" on ${tasks[0].project.name}`
          : `${tasks.map((t) => t.description).slice(0, 2).join(', ')}${tasks.length > 2 ? ` and ${tasks.length - 2} more` : ''}`,
        data: {
          screen: 'tasks',
          projectId: tasks[0].projectId,
        },
      });
    }

    this.logger.log(`Task overdue check: ${overdueTasks.length} overdue tasks, ${userTasks.size} users notified`);
  }
}
