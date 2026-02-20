import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Job } from 'bullmq';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import type { PushNotificationPayload } from './notifications.service';

interface PushJob {
  tokens: string[];
  payload: PushNotificationPayload;
}

@Processor('push-notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  constructor(
    private httpService: HttpService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<PushJob>) {
    const { tokens, payload } = job.data;

    const messages = tokens.map((token) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      sound: payload.sound ?? 'default',
      badge: payload.badge,
      categoryId: payload.categoryId,
    }));

    const chunks = this.chunkArray(messages, 100);

    for (const chunk of chunks) {
      try {
        const response = await firstValueFrom(
          this.httpService.post(this.EXPO_PUSH_URL, chunk, {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          }),
        );

        const tickets = response.data?.data || [];
        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          if (ticket.status === 'error') {
            if (ticket.details?.error === 'DeviceNotRegistered') {
              const badToken = chunk[i].to;
              this.logger.warn(`Deactivating unregistered token: ${badToken.substring(0, 20)}...`);
              await this.prisma.deviceToken.updateMany({
                where: { token: badToken },
                data: { isActive: false },
              });
            }
          }
        }

        this.logger.log(`Sent ${chunk.length} push notifications`);
      } catch (err: any) {
        this.logger.error(`Push notification send failed: ${err.message}`);
        throw err;
      }
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
