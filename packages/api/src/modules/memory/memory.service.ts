import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingsService } from './services/embeddings.service';
import { ChunkingService } from './services/chunking.service';
import { SummaryService } from './services/summary.service';

export interface SearchResult {
  id: string;
  content: string;
  sourceType: string;
  sourceId: string;
  sourceDate: Date;
  similarity: number;
  timeWeightedScore: number;
  metadata: any;
}

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private embeddingsService: EmbeddingsService,
    private chunkingService: ChunkingService,
    private summaryService: SummaryService,
  ) {}

  // ─── Ingestion ───

  async ingestDailyLog(
    dailyLogId: string,
    projectId: string,
  ): Promise<{ chunksCreated: number; embedded: boolean }> {
    const log = await this.prisma.dailyLog.findFirst({
      where: { id: dailyLogId, projectId },
      include: {
        weather: true,
        workforce: true,
        equipment: true,
        workCompleted: true,
        materials: true,
        safety: true,
        delays: true,
        voiceNotes: {
          select: { id: true, status: true, durationSeconds: true, createdAt: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    if (!log) throw new NotFoundException('Daily log not found');

    await this.deleteChunksForSource('DAILY_LOG_SUMMARY', dailyLogId);

    const summaryText = this.summaryService.summarizeDailyLog(log);
    if (!summaryText || summaryText.trim().length === 0) {
      this.logger.warn(`Empty summary for daily log ${dailyLogId}, skipping`);
      return { chunksCreated: 0, embedded: false };
    }

    const chunks = this.chunkingService.chunk(summaryText);
    const embeddings = await this.embeddingsService.embedBatch(
      chunks.map((c) => c.content),
    );
    const allEmbedded = embeddings.every((e) => e !== null);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];
      const meta = JSON.stringify({
        reportNumber: log.reportNumber,
        status: log.status,
      });

      if (embedding) {
        const vecStr = `[${embedding.join(',')}]`;
        await this.prisma.$executeRaw`
          INSERT INTO document_chunks (id, project_id, source_type, source_id, chunk_index, content, token_count, embedding, embedded, source_date, metadata, created_at, updated_at)
          VALUES (gen_random_uuid(), ${projectId}::uuid, 'DAILY_LOG_SUMMARY'::"ChunkSourceType", ${dailyLogId}::uuid, ${chunk.index}, ${chunk.content}, ${chunk.tokenCount}, ${vecStr}::vector, true, ${log.logDate}::date, ${meta}::jsonb, NOW(), NOW())
        `;
      } else {
        await this.prisma.$executeRaw`
          INSERT INTO document_chunks (id, project_id, source_type, source_id, chunk_index, content, token_count, embedded, source_date, metadata, created_at, updated_at)
          VALUES (gen_random_uuid(), ${projectId}::uuid, 'DAILY_LOG_SUMMARY'::"ChunkSourceType", ${dailyLogId}::uuid, ${chunk.index}, ${chunk.content}, ${chunk.tokenCount}, false, ${log.logDate}::date, ${meta}::jsonb, NOW(), NOW())
        `;
      }
    }

    this.logger.log(
      `Ingested daily log ${dailyLogId}: ${chunks.length} chunks, embedded: ${allEmbedded}`,
    );
    return { chunksCreated: chunks.length, embedded: allEmbedded };
  }

  async ingestVoiceTranscript(
    voiceNoteId: string,
    projectId: string,
  ): Promise<{ chunksCreated: number; embedded: boolean }> {
    const voiceNote = await this.prisma.voiceNote.findUnique({
      where: { id: voiceNoteId },
      include: { dailyLog: { select: { logDate: true, projectId: true } } },
    });

    if (!voiceNote || !voiceNote.transcript) {
      this.logger.warn(
        `Voice note ${voiceNoteId} not found or has no transcript`,
      );
      return { chunksCreated: 0, embedded: false };
    }

    const effectiveProjectId = projectId || voiceNote.dailyLog.projectId;

    await this.deleteChunksForSource('VOICE_TRANSCRIPT', voiceNoteId);

    const text = this.summaryService.summarizeVoiceTranscript(
      voiceNote,
      voiceNote.dailyLog.logDate,
    );
    const chunks = this.chunkingService.chunk(text);
    const embeddings = await this.embeddingsService.embedBatch(
      chunks.map((c) => c.content),
    );
    const allEmbedded = embeddings.every((e) => e !== null);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];
      const sourceDate = voiceNote.dailyLog.logDate;
      const meta = JSON.stringify({
        dailyLogId: voiceNote.dailyLogId,
        durationSeconds: voiceNote.durationSeconds,
      });

      if (embedding) {
        const vecStr = `[${embedding.join(',')}]`;
        await this.prisma.$executeRaw`
          INSERT INTO document_chunks (id, project_id, source_type, source_id, chunk_index, content, token_count, embedding, embedded, source_date, metadata, created_at, updated_at)
          VALUES (gen_random_uuid(), ${effectiveProjectId}::uuid, 'VOICE_TRANSCRIPT'::"ChunkSourceType", ${voiceNoteId}::uuid, ${chunk.index}, ${chunk.content}, ${chunk.tokenCount}, ${vecStr}::vector, true, ${sourceDate}::date, ${meta}::jsonb, NOW(), NOW())
        `;
      } else {
        await this.prisma.$executeRaw`
          INSERT INTO document_chunks (id, project_id, source_type, source_id, chunk_index, content, token_count, embedded, source_date, metadata, created_at, updated_at)
          VALUES (gen_random_uuid(), ${effectiveProjectId}::uuid, 'VOICE_TRANSCRIPT'::"ChunkSourceType", ${voiceNoteId}::uuid, ${chunk.index}, ${chunk.content}, ${chunk.tokenCount}, false, ${sourceDate}::date, ${meta}::jsonb, NOW(), NOW())
        `;
      }
    }

    this.logger.log(
      `Ingested voice transcript ${voiceNoteId}: ${chunks.length} chunks, embedded: ${allEmbedded}`,
    );
    return { chunksCreated: chunks.length, embedded: allEmbedded };
  }

  // ─── Retrieval ───

  async search(
    projectId: string,
    query: string,
    options: {
      limit?: number;
      sourceType?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {},
  ): Promise<SearchResult[]> {
    const { limit = 10, sourceType, dateFrom, dateTo } = options;

    const queryEmbedding = await this.embeddingsService.embedOne(query);
    if (!queryEmbedding) {
      this.logger.warn('Cannot search: embeddings unavailable');
      return [];
    }

    const vecStr = `[${queryEmbedding.join(',')}]`;
    const decay = 0.01;

    // Build dynamic conditions
    let conditions = Prisma.sql`project_id = ${projectId}::uuid AND embedded = true`;
    if (sourceType) {
      conditions = Prisma.sql`${conditions} AND source_type = ${sourceType}::"ChunkSourceType"`;
    }
    if (dateFrom) {
      conditions = Prisma.sql`${conditions} AND source_date >= ${dateFrom}::date`;
    }
    if (dateTo) {
      conditions = Prisma.sql`${conditions} AND source_date <= ${dateTo}::date`;
    }

    const results = await this.prisma.$queryRaw<SearchResult[]>`
      SELECT
        id::text,
        content,
        source_type AS "sourceType",
        source_id::text AS "sourceId",
        source_date AS "sourceDate",
        (1 - (embedding <=> ${vecStr}::vector))::float AS similarity,
        ((1 - (embedding <=> ${vecStr}::vector)) * (1.0 / (1.0 + ${decay} * EXTRACT(DAY FROM NOW() - source_date::timestamp))))::float AS "timeWeightedScore",
        metadata
      FROM document_chunks
      WHERE ${conditions}
      ORDER BY "timeWeightedScore" DESC
      LIMIT ${limit}
    `;

    return results;
  }

  // ─── Stats ───

  async getStats(projectId: string) {
    const total = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM document_chunks WHERE project_id = ${projectId}::uuid
    `;
    const embedded = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM document_chunks WHERE project_id = ${projectId}::uuid AND embedded = true
    `;
    const unembedded = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM document_chunks WHERE project_id = ${projectId}::uuid AND embedded = false
    `;
    const bySourceType = await this.prisma.$queryRaw<
      Array<{ sourceType: string; count: bigint }>
    >`
      SELECT source_type AS "sourceType", COUNT(*) as count
      FROM document_chunks WHERE project_id = ${projectId}::uuid
      GROUP BY source_type
    `;
    const dateRange = await this.prisma.$queryRaw<
      [{ min: Date | null; max: Date | null }]
    >`
      SELECT MIN(source_date) as min, MAX(source_date) as max
      FROM document_chunks WHERE project_id = ${projectId}::uuid
    `;

    return {
      projectId,
      totalChunks: Number(total[0]?.count ?? 0),
      embeddedChunks: Number(embedded[0]?.count ?? 0),
      unembeddedChunks: Number(unembedded[0]?.count ?? 0),
      embeddingAvailable: this.embeddingsService.isAvailable(),
      bySourceType: bySourceType.map((r) => ({
        sourceType: r.sourceType,
        count: Number(r.count),
      })),
      dateRange: {
        earliest: dateRange[0]?.min ?? null,
        latest: dateRange[0]?.max ?? null,
      },
    };
  }

  // ─── Re-embed ───

  async reEmbed(
    projectId: string,
  ): Promise<{ processed: number; embedded: number; failed: number }> {
    if (!this.embeddingsService.isAvailable()) {
      return { processed: 0, embedded: 0, failed: 0 };
    }

    const chunks = await this.prisma.$queryRaw<
      Array<{ id: string; content: string }>
    >`
      SELECT id::text, content FROM document_chunks
      WHERE project_id = ${projectId}::uuid AND embedded = false
      ORDER BY created_at ASC LIMIT 100
    `;

    let embeddedCount = 0;
    let failed = 0;
    const batchSize = 20;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await this.embeddingsService.embedBatch(
        batch.map((c) => c.content),
      );

      for (let j = 0; j < batch.length; j++) {
        if (embeddings[j]) {
          const vecStr = `[${embeddings[j]!.join(',')}]`;
          await this.prisma.$executeRaw`
            UPDATE document_chunks
            SET embedding = ${vecStr}::vector, embedded = true, updated_at = NOW()
            WHERE id = ${batch[j].id}::uuid
          `;
          embeddedCount++;
        } else {
          failed++;
        }
      }

      if (!this.embeddingsService.isAvailable()) break;
    }

    return { processed: chunks.length, embedded: embeddedCount, failed };
  }

  // ─── Document Ingestion ───

  async ingestDocument(
    documentId: string,
    projectId: string,
  ): Promise<{ chunksCreated: number; embedded: boolean }> {
    const doc = await this.prisma.projectDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.projectId !== projectId)
      throw new NotFoundException('Document not found');

    await this.deleteChunksForSource('DOCUMENT', documentId);

    let text = '';
    const filePath = doc.filePath;

    if (doc.mimeType === 'application/pdf') {
      const pdfParse = require('pdf-parse');
      const fs = require('fs');
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text;
    } else if (doc.mimeType.startsWith('text/')) {
      const fs = require('fs');
      text = fs.readFileSync(filePath, 'utf-8');
    } else {
      text = `Document: ${doc.title}. Category: ${doc.category}. File: ${doc.fileName}.`;
      if (doc.description) text += ` Description: ${doc.description}`;
    }

    if (!text || text.trim().length === 0) {
      await this.prisma.projectDocument.update({
        where: { id: documentId },
        data: { status: 'FAILED', processingError: 'No text extracted' },
      });
      return { chunksCreated: 0, embedded: false };
    }

    const enrichedText = `[Document: ${doc.title} | Category: ${doc.category} | File: ${doc.fileName}]\n\n${text}`;
    const chunks = this.chunkingService.chunk(enrichedText);
    const embeddings = await this.embeddingsService.embedBatch(
      chunks.map((c) => c.content),
    );
    const allEmbedded = embeddings.every((e) => e !== null);

    const meta = JSON.stringify({
      documentId,
      title: doc.title,
      category: doc.category,
      fileName: doc.fileName,
    });

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];

      if (embedding) {
        const vecStr = `[${embedding.join(',')}]`;
        await this.prisma.$executeRaw`
          INSERT INTO document_chunks (id, project_id, source_type, source_id, chunk_index, content, token_count, embedding, embedded, source_date, metadata, created_at, updated_at)
          VALUES (gen_random_uuid(), ${projectId}::uuid, 'DOCUMENT'::"ChunkSourceType", ${documentId}::uuid, ${chunk.index}, ${chunk.content}, ${chunk.tokenCount}, ${vecStr}::vector, true, ${doc.createdAt}::date, ${meta}::jsonb, NOW(), NOW())
        `;
      } else {
        await this.prisma.$executeRaw`
          INSERT INTO document_chunks (id, project_id, source_type, source_id, chunk_index, content, token_count, embedded, source_date, metadata, created_at, updated_at)
          VALUES (gen_random_uuid(), ${projectId}::uuid, 'DOCUMENT'::"ChunkSourceType", ${documentId}::uuid, ${chunk.index}, ${chunk.content}, ${chunk.tokenCount}, false, ${doc.createdAt}::date, ${meta}::jsonb, NOW(), NOW())
        `;
      }
    }

    await this.prisma.projectDocument.update({
      where: { id: documentId },
      data: {
        status: 'COMPLETED',
        chunksCreated: chunks.length,
        embedded: allEmbedded,
        processedAt: new Date(),
      },
    });

    this.logger.log(
      `Ingested document ${documentId}: ${chunks.length} chunks, embedded: ${allEmbedded}`,
    );
    return { chunksCreated: chunks.length, embedded: allEmbedded };
  }

  // ─── Ask XO ───

  async ask(
    projectId: string,
    question: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<{ answer: string; sources: SearchResult[]; tokensUsed?: number }> {
    const sources = await this.search(projectId, question, { limit: 8 });

    const contextParts = sources.map((s, i) => {
      const date = s.sourceDate
        ? new Date(s.sourceDate).toLocaleDateString()
        : 'unknown date';
      return `[Source ${i + 1} | ${s.sourceType} | ${date} | Relevance: ${(s.timeWeightedScore * 100).toFixed(0)}%]\n${s.content}`;
    });
    const context = contextParts.join('\n\n---\n\n');

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (conversationHistory && conversationHistory.length > 0) {
      const recent = conversationHistory.slice(-10);
      messages.push(...recent);
    }
    messages.push({ role: 'user', content: question });

    const { createAnthropic } = require('@ai-sdk/anthropic');
    const { createOpenAI } = require('@ai-sdk/openai');
    const { generateText } = require('ai');

    let model: ReturnType<typeof createAnthropic> | ReturnType<typeof createOpenAI>;
    const anthropicKey = this.configService.get('ANTHROPIC_API_KEY');
    if (anthropicKey) {
      const anthropic = createAnthropic({ apiKey: anthropicKey });
      model = anthropic('claude-sonnet-4-20250514');
    } else {
      const openrouterKey = this.configService.get('OPENROUTER_API_KEY');
      if (!openrouterKey) throw new Error('No AI provider configured: set ANTHROPIC_API_KEY or OPENROUTER_API_KEY');
      const openrouter = createOpenAI({
        apiKey: openrouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
      model = openrouter('anthropic/claude-sonnet-4-20250514');
    }

    const result = await generateText({
      model,
      system: `You are XO, an AI assistant for a construction project. You answer questions using the project's documents, daily logs, voice transcripts, and other records.

RULES:
- Answer based ONLY on the provided context. If the context doesn't contain enough information to answer, say so clearly.
- Reference specific dates, document names, and source types when relevant.
- Use construction industry terminology naturally.
- Be concise but thorough. Field workers are busy — get to the point.
- If the question is about a decision or agreement, cite when it was recorded.
- If multiple sources give conflicting information, note the discrepancy and cite the most recent source.
- Format responses for mobile readability — short paragraphs, no dense walls of text.

PROJECT CONTEXT:
${context || 'No relevant documents found for this query.'}`,
      messages,
    });

    return {
      answer: result.text,
      sources: sources.map((s) => ({
        ...s,
        content:
          s.content.substring(0, 200) +
          (s.content.length > 200 ? '...' : ''),
      })),
      tokensUsed: result.usage?.totalTokens,
    };
  }

  // ─── Helpers ───

  private async deleteChunksForSource(sourceType: string, sourceId: string) {
    await this.prisma.$executeRaw`
      DELETE FROM document_chunks
      WHERE source_type = ${sourceType}::"ChunkSourceType" AND source_id = ${sourceId}::uuid
    `;
  }
}
