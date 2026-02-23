import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CommunicationsService } from './communications.service';
import { CommunicationsController } from './communications.controller';
import { CommunicationsProcessor } from './communications.processor';
import { DraftingService } from './services/drafting.service';
import { EmailService } from './email.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'communication-drafting' }),
  ],
  controllers: [CommunicationsController],
  providers: [CommunicationsService, CommunicationsProcessor, DraftingService, EmailService],
  exports: [CommunicationsService],
})
export class CommunicationsModule {}
