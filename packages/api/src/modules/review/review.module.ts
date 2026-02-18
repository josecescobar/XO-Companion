import { Module } from '@nestjs/common';
import { ReviewController, ReviewStatsController } from './review.controller';
import { ReviewService } from './review.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [ProjectsModule],
  controllers: [ReviewController, ReviewStatsController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
