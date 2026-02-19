import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Res,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { DocumentsService } from './documents.service';
import { ProjectsService } from '../projects/projects.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const ALLOWED_MIMES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'image/tiff',
];

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('projects/:projectId/documents')
export class DocumentsController {
  constructor(
    private documentsService: DocumentsService,
    private projectsService: ProjectsService,
    @InjectQueue('document-ingestion')
    private ingestionQueue: Queue,
  ) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = path.join('uploads', 'documents', 'tmp');
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
        }
      },
    }),
  )
  async upload(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(
      projectId,
      user.id,
      user.organizationId,
    );

    const doc = await this.documentsService.upload(
      user.id,
      user.organizationId,
      projectId,
      file,
      { title: dto.title, category: dto.category, description: dto.description },
    );

    // Queue background processing
    await this.ingestionQueue.add('ingest-document', {
      documentId: doc.id,
      projectId,
    });

    return doc;
  }

  @Get()
  async list(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @CurrentUser() user?: { id: string; organizationId: string },
  ) {
    if (user) {
      await this.projectsService.verifyMembership(
        projectId,
        user.id,
        user.organizationId,
      );
    }
    return this.documentsService.list(projectId, { category, status });
  }

  @Get(':id')
  async getById(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(
      projectId,
      user.id,
      user.organizationId,
    );
    return this.documentsService.getById(id);
  }

  @Delete(':id')
  async delete(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(
      projectId,
      user.id,
      user.organizationId,
    );
    await this.documentsService.delete(id);
    return { message: 'Document deleted' };
  }

  @Get(':id/file')
  async getFile(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(
      projectId,
      user.id,
      user.organizationId,
    );

    const { filePath, mimeType, fileName } =
      await this.documentsService.getDocumentFile(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${fileName}"`,
    );
    res.sendFile(filePath);
  }

  @Post(':id/reprocess')
  @HttpCode(HttpStatus.OK)
  async reprocess(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(
      projectId,
      user.id,
      user.organizationId,
    );

    await this.ingestionQueue.add('ingest-document', {
      documentId: id,
      projectId,
    });

    return { message: 'Document reprocessing queued' };
  }
}
