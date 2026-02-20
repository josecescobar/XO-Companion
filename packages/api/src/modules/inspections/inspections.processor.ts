import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { VisionComparisonService } from './services/vision-comparison.service';
import { MemoryService } from '../memory/memory.service';
import { MediaService } from '../media/media.service';

@Processor('inspection-processing')
export class InspectionsProcessor extends WorkerHost {
  private readonly logger = new Logger(InspectionsProcessor.name);

  constructor(
    private prisma: PrismaService,
    private visionService: VisionComparisonService,
    private memoryService: MemoryService,
    private mediaService: MediaService,
  ) {
    super();
  }

  async process(job: Job<{ inspectionId: string; projectId: string }>) {
    const { inspectionId, projectId } = job.data;

    await this.prisma.inspection.update({
      where: { id: inspectionId },
      data: { status: 'PROCESSING' },
    });

    try {
      const inspection = await this.prisma.inspection.findUniqueOrThrow({
        where: { id: inspectionId },
        include: {
          media: true,
          document: true,
          project: { select: { name: true } },
        },
      });

      // 1. Get the photo file path
      const photoPath = this.mediaService.getFilePath(inspection.media);

      // 2. Retrieve document context if a reference document was selected
      let documentContext = '';
      if (inspection.documentId) {
        const chunks = await this.prisma.$queryRaw<Array<{ content: string }>>`
          SELECT content FROM document_chunks
          WHERE source_type = 'DOCUMENT'::"ChunkSourceType"
            AND source_id = ${inspection.documentId}::uuid
          ORDER BY chunk_index ASC
          LIMIT 20
        `;
        documentContext = chunks.map((c) => c.content).join('\n\n');
      }

      // 3. RAG search for additional context using the inspection title + description
      let ragContext = '';
      try {
        const searchQuery = `${inspection.title} ${inspection.description || ''}`.trim();
        const ragResults = await this.memoryService.search(projectId, searchQuery, { limit: 5 });
        ragContext = ragResults.map((r) => `[${r.sourceType} | ${r.sourceDate}]\n${r.content}`).join('\n\n');
      } catch {
        this.logger.warn('RAG search failed, proceeding without additional context');
      }

      // 4. Run vision comparison
      const { result, tokensUsed } = await this.visionService.analyzePhoto({
        photoPath,
        photoMimeType: inspection.media.mimeType,
        inspectionType: inspection.inspectionType,
        title: inspection.title,
        description: inspection.description || undefined,
        documentContext: documentContext || undefined,
        ragContext: ragContext || undefined,
        projectName: inspection.project.name,
      });

      // 5. Store results
      await this.prisma.inspection.update({
        where: { id: inspectionId },
        data: {
          status: result.overallAssessment,
          aiAnalysis: result.summary,
          aiFindings: result as any,
          aiOverallScore: result.overallScore,
          aiProcessedAt: new Date(),
          tokensUsed,
          ragContextUsed: {
            documentChunks: documentContext ? documentContext.substring(0, 500) : null,
            ragResultCount: ragContext ? ragContext.split('\n\n').length : 0,
          },
        },
      });

      this.logger.log(`Inspection ${inspectionId} processed: ${result.overallAssessment} (${result.overallScore}/100)`);
    } catch (err: any) {
      this.logger.error(`Inspection ${inspectionId} failed: ${err.message}`);
      await this.prisma.inspection.update({
        where: { id: inspectionId },
        data: {
          status: 'INCONCLUSIVE',
          processingError: err.message,
        },
      });
      throw err;
    }
  }
}
