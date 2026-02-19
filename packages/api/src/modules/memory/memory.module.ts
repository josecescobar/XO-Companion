import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MemoryController } from './memory.controller';
import { MemoryService } from './memory.service';
import { MemoryProcessor } from './memory.processor';
import { EmbeddingsService } from './services/embeddings.service';
import { ChunkingService } from './services/chunking.service';
import { SummaryService } from './services/summary.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'memory-ingestion',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: { age: 86400 },
        removeOnFail: { age: 604800 },
      },
    }),
    ProjectsModule,
  ],
  controllers: [MemoryController],
  providers: [
    MemoryService,
    MemoryProcessor,
    EmbeddingsService,
    ChunkingService,
    SummaryService,
  ],
  exports: [MemoryService],
})
export class MemoryModule {}
