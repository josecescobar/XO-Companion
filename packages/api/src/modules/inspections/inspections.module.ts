import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InspectionsController } from './inspections.controller';
import { InspectionsService } from './inspections.service';
import { InspectionsProcessor } from './inspections.processor';
import { VisionComparisonService } from './services/vision-comparison.service';
import { ProjectsModule } from '../projects/projects.module';
import { MemoryModule } from '../memory/memory.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'inspection-processing',
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: { age: 86400 },
        removeOnFail: { age: 604800 },
      },
    }),
    ProjectsModule,
    MemoryModule,
    MediaModule,
  ],
  controllers: [InspectionsController],
  providers: [InspectionsService, InspectionsProcessor, VisionComparisonService],
  exports: [InspectionsService],
})
export class InspectionsModule {}
