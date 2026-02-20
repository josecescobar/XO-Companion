import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: 'default' | null;
  badge?: number;
  categoryId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('push-notifications') private pushQueue: Queue,
  ) {}

  // ─── Device Token Management ───

  async registerToken(userId: string, token: string, platform: string): Promise<void> {
    await this.prisma.deviceToken.upsert({
      where: { token },
      update: { userId, platform, isActive: true },
      create: { userId, token, platform, isActive: true },
    });
    this.logger.log(`Registered push token for user ${userId} (${platform})`);
  }

  async unregisterToken(token: string): Promise<void> {
    await this.prisma.deviceToken.updateMany({
      where: { token },
      data: { isActive: false },
    });
  }

  async unregisterAllForUser(userId: string): Promise<void> {
    await this.prisma.deviceToken.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  }

  // ─── Send Notifications ───

  async sendToUser(userId: string, payload: PushNotificationPayload): Promise<void> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId, isActive: true },
      select: { token: true },
    });

    if (tokens.length === 0) {
      this.logger.debug(`No active push tokens for user ${userId}, skipping notification`);
      return;
    }

    await this.pushQueue.add('send-push', {
      tokens: tokens.map((t) => t.token),
      payload,
    });
  }

  async sendToUsers(userIds: string[], payload: PushNotificationPayload): Promise<void> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId: { in: userIds }, isActive: true },
      select: { token: true },
    });

    if (tokens.length === 0) return;

    await this.pushQueue.add('send-push', {
      tokens: tokens.map((t) => t.token),
      payload,
    });
  }

  async sendToProject(projectId: string, payload: PushNotificationPayload, excludeUserId?: string): Promise<void> {
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true },
    });

    const userIds = members
      .map((m) => m.userId)
      .filter((id) => id !== excludeUserId);

    if (userIds.length === 0) return;

    await this.sendToUsers(userIds, payload);
  }

  async sendToOrgRoles(
    organizationId: string,
    roles: string[],
    payload: PushNotificationPayload,
  ): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: { in: roles as any[] },
      },
      select: { id: true },
    });

    if (users.length === 0) return;

    await this.sendToUsers(users.map((u) => u.id), payload);
  }
}
