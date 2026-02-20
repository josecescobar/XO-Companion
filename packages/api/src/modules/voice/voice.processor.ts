import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AssemblyAiService } from './services/assemblyai.service';
import { LlmExtractionService } from './services/llm-extraction.service';
import { NotificationsService } from '../notifications/notifications.service';
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
    private notificationsService: NotificationsService,
    @InjectQueue('memory-ingestion') private memoryQueue: Queue,
    @InjectQueue('communication-drafting') private communicationQueue: Queue,
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

      // Create tasks from extracted next actions
      try {
        if (extractedData.nextActions && extractedData.nextActions.length > 0) {
          const voiceNote = await this.prisma.voiceNote.findUnique({
            where: { id: voiceNoteId },
            select: {
              userId: true,
              dailyLog: { select: { projectId: true, id: true } },
            },
          });

          if (voiceNote?.dailyLog) {
            for (const action of extractedData.nextActions) {
              await this.prisma.task.create({
                data: {
                  projectId: voiceNote.dailyLog.projectId,
                  dailyLogId: voiceNote.dailyLog.id,
                  voiceNoteId,
                  description: action.description,
                  assignee: action.assignee || null,
                  dueDate: action.dueDate ? this.parseRelativeDate(action.dueDate) : null,
                  priority: action.priority as any,
                  category: action.category as any,
                  status: 'PENDING',
                  aiGenerated: true,
                  aiConfidence: action.confidence,
                  createdById: voiceNote.userId,
                },
              });
            }
            this.logger.log(`Created ${extractedData.nextActions.length} tasks from voice note`);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed to create tasks from voice note: ${err.message}`);
      }

      // Create communication drafts from extracted communications
      try {
        if (extractedData.communications && extractedData.communications.length > 0) {
          const voiceNote = await this.prisma.voiceNote.findUnique({
            where: { id: voiceNoteId },
            select: {
              userId: true,
              dailyLog: { select: { projectId: true, id: true } },
            },
          });

          if (voiceNote?.dailyLog) {
            for (const comm of extractedData.communications) {
              const record = await this.prisma.communication.create({
                data: {
                  organizationId,
                  projectId: voiceNote.dailyLog.projectId,
                  dailyLogId: voiceNote.dailyLog.id,
                  voiceNoteId,
                  type: comm.type as any,
                  urgency: comm.urgency as any,
                  recipient: comm.recipient,
                  subject: comm.subject,
                  context: comm.context,
                  status: 'DRAFTING',
                  aiGenerated: true,
                  aiConfidence: comm.confidence,
                  createdById: voiceNote.userId,
                },
              });

              await this.communicationQueue.add('draft', {
                communicationId: record.id,
                projectId: voiceNote.dailyLog.projectId,
              });
            }
            this.logger.log(`Created ${extractedData.communications.length} communication drafts from voice note`);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed to create communications from voice note: ${err.message}`);
      }

      // Enqueue memory ingestion for the voice transcript (non-blocking)
      try {
        const vn = await this.prisma.voiceNote.findUnique({
          where: { id: voiceNoteId },
          select: { dailyLog: { select: { projectId: true } } },
        });
        if (vn) {
          await this.memoryQueue.add('ingest', {
            type: 'voice-transcript',
            sourceId: voiceNoteId,
            projectId: vn.dailyLog.projectId,
          });
          this.logger.log(`Queued memory ingestion for voice note ${voiceNoteId}`);
        }
      } catch (err: any) {
        this.logger.warn(`Failed to queue memory ingestion: ${err.message}`);
      }

      // Notify the user their voice note is processed
      try {
        const voiceNote = await this.prisma.voiceNote.findUnique({
          where: { id: voiceNoteId },
          select: {
            userId: true,
            dailyLog: { select: { projectId: true, id: true } },
          },
        });

        if (voiceNote) {
          const extractionSummary: string[] = [];
          if (extractedData.workforce?.length) extractionSummary.push(`${extractedData.workforce.length} workforce`);
          if (extractedData.workCompleted?.length) extractionSummary.push(`${extractedData.workCompleted.length} work items`);
          if (extractedData.nextActions?.length) extractionSummary.push(`${extractedData.nextActions.length} tasks`);
          if (extractedData.communications?.length) extractionSummary.push(`${extractedData.communications.length} comms`);

          await this.notificationsService.sendToUser(voiceNote.userId, {
            title: '🎙️ Voice Note Processed',
            body: extractionSummary.length > 0
              ? `Extracted: ${extractionSummary.join(', ')}. Tap to review.`
              : 'Your voice note has been transcribed. Tap to review.',
            data: {
              screen: 'voice-review',
              projectId: voiceNote.dailyLog?.projectId ?? '',
              logId: voiceNote.dailyLog?.id ?? '',
            },
          });
        }
      } catch (err: any) {
        this.logger.warn(`Failed to send voice notification: ${err.message}`);
      }

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

  private parseRelativeDate(dateStr: string): Date {
    const lower = dateStr.toLowerCase().trim();
    const now = new Date();

    if (lower === 'today') return now;

    if (lower === 'tomorrow') {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      return d;
    }

    if (lower === 'end of week' || lower === 'end of the week') {
      const d = new Date(now);
      const dayOfWeek = d.getDay();
      d.setDate(d.getDate() + (5 - dayOfWeek + 7) % 7 || 7);
      return d;
    }

    if (lower === 'next week') {
      const d = new Date(now);
      const dayOfWeek = d.getDay();
      d.setDate(d.getDate() + (8 - dayOfWeek));
      return d;
    }

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = dayNames.findIndex((d) => lower.includes(d));
    if (dayIndex >= 0) {
      const d = new Date(now);
      const currentDay = d.getDay();
      let daysUntil = dayIndex - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      d.setDate(d.getDate() + daysUntil);
      return d;
    }

    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? now : parsed;
  }

  private async updateStatus(voiceNoteId: string, status: VoiceNoteStatus) {
    await this.prisma.voiceNote.update({
      where: { id: voiceNoteId },
      data: { status },
    });
  }
}
