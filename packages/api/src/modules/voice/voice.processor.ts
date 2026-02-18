import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AssemblyAiService } from './services/assemblyai.service';
import { LlmExtractionService } from './services/llm-extraction.service';
import { VoiceNoteStatus } from '@prisma/client';

export interface VoiceProcessingJobData {
  voiceNoteId: string;
  audioUrl: string;
}

@Processor('voice-processing')
export class VoiceProcessor extends WorkerHost {
  private readonly logger = new Logger(VoiceProcessor.name);

  constructor(
    private prisma: PrismaService,
    private assemblyAiService: AssemblyAiService,
    private llmExtractionService: LlmExtractionService,
  ) {
    super();
  }

  async process(job: Job<VoiceProcessingJobData>) {
    const { voiceNoteId, audioUrl } = job.data;
    this.logger.log(`Processing voice note: ${voiceNoteId}`);

    try {
      // Stage 1: Transcription
      await this.updateStatus(voiceNoteId, VoiceNoteStatus.TRANSCRIBING);

      const { transcript, id: assemblyaiId } = await this.assemblyAiService.transcribe(audioUrl);

      await this.prisma.voiceNote.update({
        where: { id: voiceNoteId },
        data: { transcript, assemblyaiId },
      });

      if (!transcript || transcript.trim().length === 0) {
        throw new Error('Empty transcript received');
      }

      // Stage 2: LLM Extraction
      await this.updateStatus(voiceNoteId, VoiceNoteStatus.EXTRACTING);

      const extractedData = await this.llmExtractionService.extract(transcript);

      // Stage 3: Store results
      await this.prisma.voiceNote.update({
        where: { id: voiceNoteId },
        data: {
          extractedData: extractedData as any,
          aiProcessed: true,
          status: VoiceNoteStatus.REVIEW_READY,
        },
      });

      this.logger.log(`Voice note ${voiceNoteId} processed successfully`);
      return { success: true, voiceNoteId };
    } catch (error: any) {
      this.logger.error(`Failed to process voice note ${voiceNoteId}: ${error.message}`);
      await this.prisma.voiceNote.update({
        where: { id: voiceNoteId },
        data: {
          status: VoiceNoteStatus.FAILED,
          processingError: error.message,
        },
      });
      throw error;
    }
  }

  private async updateStatus(voiceNoteId: string, status: VoiceNoteStatus) {
    await this.prisma.voiceNote.update({
      where: { id: voiceNoteId },
      data: { status },
    });
  }
}
