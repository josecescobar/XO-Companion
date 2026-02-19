import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentCategory, DocumentStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async upload(
    userId: string,
    orgId: string,
    projectId: string,
    file: Express.Multer.File,
    metadata: { title: string; category: DocumentCategory; description?: string },
  ) {
    const ext = path.extname(file.originalname);
    const destDir = path.join('uploads', 'documents', projectId);
    fs.mkdirSync(destDir, { recursive: true });

    const destName = `${randomUUID()}${ext}`;
    const destPath = path.join(destDir, destName);
    fs.renameSync(file.path, destPath);

    return this.prisma.projectDocument.create({
      data: {
        organizationId: orgId,
        projectId,
        uploadedById: userId,
        title: metadata.title,
        category: metadata.category,
        description: metadata.description,
        fileName: file.originalname,
        filePath: destPath,
        mimeType: file.mimetype,
        fileSize: file.size,
        status: 'PENDING',
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async list(
    projectId: string,
    filters?: { category?: string; status?: string },
  ) {
    const where: any = { projectId };
    if (filters?.category) where.category = filters.category as DocumentCategory;
    if (filters?.status) where.status = filters.status as DocumentStatus;

    return this.prisma.projectDocument.findMany({
      where,
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(documentId: string) {
    const doc = await this.prisma.projectDocument.findUnique({
      where: { id: documentId },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async delete(documentId: string) {
    const doc = await this.prisma.projectDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    // Delete file
    if (fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }

    // Delete chunks
    await this.prisma.$executeRaw`
      DELETE FROM document_chunks
      WHERE source_type = 'DOCUMENT'::"ChunkSourceType" AND source_id = ${documentId}::uuid
    `;

    await this.prisma.projectDocument.delete({ where: { id: documentId } });
  }

  async getDocumentFile(documentId: string): Promise<{ filePath: string; mimeType: string; fileName: string }> {
    const doc = await this.prisma.projectDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    return {
      filePath: path.resolve(doc.filePath),
      mimeType: doc.mimeType,
      fileName: doc.fileName,
    };
  }
}
