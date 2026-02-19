import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DailyLogsController } from './daily-logs.controller';
import { DailyLogsService } from './daily-logs.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    ProjectsModule,
    BullModule.registerQueue({ name: 'risk-analysis' }),
  ],
  controllers: [DailyLogsController],
  providers: [DailyLogsService],
  exports: [DailyLogsService],
})
export class DailyLogsModule {}
