import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProjectsService } from '../projects/projects.service';

@ApiTags('Reviews')
@ApiBearerAuth()
@Controller('projects/:projectId/daily-logs/:logId/reviews')
export class ReviewController {
  constructor(
    private reviewService: ReviewService,
    private projectsService: ProjectsService,
  ) {}

  @Get('pending')
  async getPending(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('logId', ParseUUIDPipe) logId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.reviewService.getPending(logId, projectId);
  }

  @Post()
  async submitReview(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('logId', ParseUUIDPipe) logId: string,
    @Body() dto: SubmitReviewDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.reviewService.submitReview(logId, projectId, user.id, dto);
  }

  @Get()
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('logId', ParseUUIDPipe) logId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.reviewService.findAll(logId, projectId);
  }
}

@ApiTags('Reviews')
@ApiBearerAuth()
@Controller('projects/:projectId/reviews')
export class ReviewStatsController {
  constructor(
    private reviewService: ReviewService,
    private projectsService: ProjectsService,
  ) {}

  @Get('stats')
  async getStats(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    await this.projectsService.verifyMembership(projectId, user.id, user.organizationId);
    return this.reviewService.getStats(projectId);
  }
}
