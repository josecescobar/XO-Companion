import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { VoiceService } from './voice.service';
import { ProjectsService } from '../projects/projects.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'voice');
mkdirSync(UPLOAD_DIR, { recursive: true });

@ApiTags('Voice Notes')
@ApiBearerAuth()
@Controller('projects/:projectId/daily-logs/:logId/voice')
export class VoiceController {
  constructor(
    private voiceService: VoiceService,
    private projectsService: ProjectsService,
  ) {}

  @Post('upload')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const name = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
      fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
          cb(null, true);
        } else {
          cb(new Error('Only audio files are allowed'), false);
        }
      },
    }),
  )
  async upload(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('logId', ParseUUIDPipe) logId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.voiceService.upload(logId, projectId, user.id, {
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
    });
  }

  @Get()
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('logId', ParseUUIDPipe) logId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.voiceService.findAll(logId, projectId);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.voiceService.findOne(id);
  }

  @Get(':id/extracted')
  async getExtracted(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.voiceService.getExtracted(id);
  }

  @Post(':id/apply')
  async apply(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.voiceService.apply(id, projectId);
  }

  @Post(':id/reprocess')
  async reprocess(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.voiceService.reprocess(id);
  }
}
