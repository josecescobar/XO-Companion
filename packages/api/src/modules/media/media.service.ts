import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { MediaType } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly uploadsDir = path.join(process.cwd(), 'uploads', 'media');

  constructor(private prisma: PrismaService) {
    fs.mkdirSync(this.uploadsDir, { recursive: true });
  }

  async upload(
    userId: string,
    organizationId: string,
    projectId: string,
    file: Express.Multer.File,
    dto: UploadMediaDto,
  ) {
    const ext = path.extname(file.originalname) || this.getExtFromMime(file.mimetype);
    const uuid = randomUUID();
    const projectDir = path.join(this.uploadsDir, projectId);
    fs.mkdirSync(projectDir, { recursive: true });

    const fileName = `${uuid}${ext}`;
    const filePath = path.join(projectDir, fileName);

    // Move file from multer temp to final location
    fs.renameSync(file.path, filePath);

    // Generate thumbnail for photos
    let thumbnailPath: string | null = null;
    if (dto.type === MediaType.PHOTO) {
      try {
        const sharp = (await import('sharp')).default;
        const thumbName = `${uuid}_thumb${ext}`;
        const thumbFullPath = path.join(projectDir, thumbName);
        await sharp(filePath).resize(200).toFile(thumbFullPath);
        thumbnailPath = path.join(projectId, thumbName);
      } catch (err: any) {
        this.logger.warn(`Thumbnail generation failed: ${err.message}`);
      }
    }

    const media = await this.prisma.media.create({
      data: {
        organizationId,
        projectId,
        dailyLogId: dto.dailyLogId || null,
        voiceNoteId: dto.voiceNoteId || null,
        incidentId: dto.incidentId || null,
        type: dto.type,
        fileName: file.originalname,
        filePath: path.join(projectId, fileName),
        mimeType: file.mimetype,
        fileSize: file.size,
        caption: dto.caption || null,
        thumbnailPath,
        uploadedById: userId,
      },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return media;
  }

  async listByProject(
    projectId: string,
    filters?: { dailyLogId?: string; incidentId?: string; type?: MediaType },
  ) {
    const where: any = { projectId };
    if (filters?.dailyLogId) where.dailyLogId = filters.dailyLogId;
    if (filters?.incidentId) where.incidentId = filters.incidentId;
    if (filters?.type) where.type = filters.type;

    return this.prisma.media.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async getById(id: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
    if (!media) throw new NotFoundException('Media not found');
    return media;
  }

  async delete(projectId: string, id: string) {
    const media = await this.prisma.media.findFirst({
      where: { id, projectId },
    });
    if (!media) throw new NotFoundException('Media not found');

    // Delete files from disk
    const fullPath = path.join(this.uploadsDir, media.filePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    if (media.thumbnailPath) {
      const thumbPath = path.join(this.uploadsDir, media.thumbnailPath);
      if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    }

    await this.prisma.media.delete({ where: { id } });
  }

  getFilePath(media: { filePath: string }): string {
    return path.join(this.uploadsDir, media.filePath);
  }

  getThumbnailPath(media: { thumbnailPath: string | null; filePath: string }): string {
    if (media.thumbnailPath) {
      return path.join(this.uploadsDir, media.thumbnailPath);
    }
    // Fall back to original file if no thumbnail
    return path.join(this.uploadsDir, media.filePath);
  }

  private getExtFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/heic': '.heic',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
    };
    return map[mime] || '.bin';
  }
}
