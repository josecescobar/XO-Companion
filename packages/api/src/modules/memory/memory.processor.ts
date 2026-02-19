import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MemoryService } from './memory.service';

export interface MemoryIngestionJobData {
  type: 'daily-log' | 'voice-transcript';
  sourceId: string;
  projectId: string;
}

@Processor('memory-ingestion')
export class MemoryProcessor extends WorkerHost {
  private readonly logger = new Logger(MemoryProcessor.name);

  constructor(private memoryService: MemoryService) {
    super();
  }

  async process(job: Job<MemoryIngestionJobData>) {
    const { type, sourceId, projectId } = job.data;
    this.logger.log(`Processing memory ingestion: ${type} ${sourceId}`);

    try {
      let result;
      if (type === 'daily-log') {
        result = await this.memoryService.ingestDailyLog(sourceId, projectId);
      } else if (type === 'voice-transcript') {
        result = await this.memoryService.ingestVoiceTranscript(
          sourceId,
          projectId,
        );
      } else {
        throw new Error(`Unknown ingestion type: ${type}`);
      }

      this.logger.log(
        `Memory ingestion complete for ${type} ${sourceId}: ${result.chunksCreated} chunks, embedded: ${result.embedded}`,
      );
      return result;
    } catch (error: any) {
      this.logger.error(
        `Memory ingestion failed for ${type} ${sourceId}: ${error.message}`,
      );
      throw error;
    }
  }
}
