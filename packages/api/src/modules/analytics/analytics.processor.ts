import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AnalyticsService } from './analytics.service';

export interface RiskAnalysisJobData {
  projectId: string;
  organizationId: string;
}

@Processor('risk-analysis')
export class AnalyticsProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(private analyticsService: AnalyticsService) {
    super();
  }

  async process(job: Job<RiskAnalysisJobData>) {
    const { projectId, organizationId } = job.data;
    this.logger.log(`Running risk analysis for project ${projectId}`);

    try {
      const alerts = await this.analyticsService.runRiskAnalysis(projectId, organizationId);
      this.logger.log(`Risk analysis complete: ${alerts.length} new alerts created`);
      return { alertsCreated: alerts.length };
    } catch (error) {
      this.logger.error(`Risk analysis failed: ${error}`);
      throw error;
    }
  }
}
