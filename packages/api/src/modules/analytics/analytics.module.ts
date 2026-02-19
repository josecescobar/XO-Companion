import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { RiskEngineService } from './risk-engine.service';
import { AnalyticsProcessor } from './analytics.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'risk-analysis',
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 86400 },
        removeOnFail: { age: 604800 },
      },
    }),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, RiskEngineService, AnalyticsProcessor],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
