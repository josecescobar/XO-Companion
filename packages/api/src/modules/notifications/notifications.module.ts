import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsProcessor } from './notifications.processor';
import { ComplianceAlertCron } from './compliance-alert.cron';

@Global()
@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({ name: 'push-notifications' }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsProcessor, ComplianceAlertCron],
  exports: [NotificationsService],
})
export class NotificationsModule {}
