import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { VoiceProcessor } from './voice.processor';
import { AssemblyAiService } from './services/assemblyai.service';
import { LlmExtractionService } from './services/llm-extraction.service';
import { ProjectsModule } from '../projects/projects.module';
import { DailyLogsModule } from '../daily-logs/daily-logs.module';

@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: 'voice-processing',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: { age: 86400 },
          removeOnFail: { age: 604800 },
        },
      },
      {
        name: 'memory-ingestion',
      },
      {
        name: 'communication-drafting',
      },
    ),
    ProjectsModule,
    DailyLogsModule,
  ],
  controllers: [VoiceController],
  providers: [
    VoiceService,
    VoiceProcessor,
    AssemblyAiService,
    LlmExtractionService,
  ],
  exports: [VoiceService],
})
export class VoiceModule {}
