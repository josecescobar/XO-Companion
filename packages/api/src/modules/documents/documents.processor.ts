import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MemoryService } from '../memory/memory.service';
import { PrismaService } from '../prisma/prisma.service';

@Processor('document-ingestion')
export class DocumentsProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentsProcessor.name);

  constructor(
    private memoryService: MemoryService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async process(
    job: Job<{ documentId: string; projectId: string }>,
  ): Promise<void> {
    const { documentId, projectId } = job.data;
    this.logger.log(`Processing document ${documentId}`);

    await this.prisma.projectDocument.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' },
    });

    try {
      const result = await this.memoryService.ingestDocument(
        documentId,
        projectId,
      );
      this.logger.log(
        `Document ${documentId} processed: ${result.chunksCreated} chunks`,
      );
    } catch (err: any) {
      this.logger.error(
        `Document ${documentId} processing failed: ${err.message}`,
      );
      await this.prisma.projectDocument.update({
        where: { id: documentId },
        data: { status: 'FAILED', processingError: err.message },
      });
      throw err;
    }
  }
}
