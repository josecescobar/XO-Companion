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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { MediaType } from '@prisma/client';
import { Response } from 'express';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { MediaService } from './media.service';
import { ProjectsService } from '../projects/projects.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/heic', 'video/mp4', 'video/quicktime'];

@ApiTags('Media')
@ApiBearerAuth()
@Controller('projects/:projectId/media')
export class MediaController {
  constructor(
    private mediaService: MediaService,
    private projectsService: ProjectsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Upload media file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/media/tmp',
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
      fileFilter: (_req, file, cb) => {
        cb(null, ALLOWED_MIMES.includes(file.mimetype));
      },
    }),
  )
  async upload(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.mediaService.upload(user.id, user.organizationId, projectId, file, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List media for a project' })
  async list(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('dailyLogId') dailyLogId?: string,
    @Query('incidentId') incidentId?: string,
    @Query('type') type?: MediaType,
    @CurrentUser() user?: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user!.id, user!.organizationId);
    return this.mediaService.listByProject(projectId, { dailyLogId, incidentId, type });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single media record' })
  async getOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user!.id, user!.organizationId);
    return this.mediaService.getById(id);
  }

  @Get(':id/file')
  @ApiOperation({ summary: 'Serve the media file' })
  async serveFile(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
    @CurrentUser() user?: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user!.id, user!.organizationId);
    const media = await this.mediaService.getById(id);
    const filePath = this.mediaService.getFilePath(media);
    res.setHeader('Content-Type', media.mimeType);
    res.sendFile(filePath);
  }

  @Get(':id/thumbnail')
  @ApiOperation({ summary: 'Serve the media thumbnail' })
  async serveThumbnail(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
    @CurrentUser() user?: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user!.id, user!.organizationId);
    const media = await this.mediaService.getById(id);
    const thumbPath = this.mediaService.getThumbnailPath(media);
    res.setHeader('Content-Type', media.mimeType);
    res.sendFile(thumbPath);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete media' })
  async delete(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user!.id, user!.organizationId);
    await this.mediaService.delete(projectId, id);
  }
}
