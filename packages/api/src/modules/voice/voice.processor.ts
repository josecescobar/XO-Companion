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
  organizationId: string;
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
    const { voiceNoteId, audioUrl, organizationId } = job.data;
    this.logger.log(`Processing voice note: ${voiceNoteId}`);

    try {
      // Load custom vocabulary from glossary
      const customVocabulary = await this.loadGlossaryVocabulary(organizationId);

      // Stage 1: Transcription
      await this.updateStatus(voiceNoteId, VoiceNoteStatus.TRANSCRIBING);

      const { transcript, id: assemblyaiId, durationMs } =
        await this.assemblyAiService.transcribe(audioUrl, customVocabulary);

      await this.prisma.voiceNote.update({
        where: { id: voiceNoteId },
        data: {
          transcript,
          assemblyaiId,
          durationSeconds: Math.round(durationMs / 1000),
        },
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

  private async loadGlossaryVocabulary(organizationId: string): Promise<string[]> {
    try {
      const terms = await this.prisma.glossaryTerm.findMany({
        where: { organizationId, active: true },
        select: { term: true, aliases: true },
      });
      return terms.flatMap((t) => [t.term, ...t.aliases]);
    } catch (error) {
      this.logger.warn(`Could not load glossary terms: ${error}`);
      return [];
    }
  }

  private async updateStatus(voiceNoteId: string, status: VoiceNoteStatus) {
    await this.prisma.voiceNote.update({
      where: { id: voiceNoteId },
      data: { status },
    });
  }
}
