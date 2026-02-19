import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskEngineService } from './risk-engine.service';
import { RiskAlertType, RiskSeverity } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private riskEngine: RiskEngineService,
  ) {}

  async getProjectDashboard(projectId: string, orgId: string) {
    // Verify project
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) throw new NotFoundException('Project not found');

    // Summary stats
    const totalLogs = await this.prisma.dailyLog.count({ where: { projectId } });

    const workforce = await this.prisma.workforceEntry.findMany({
      where: { dailyLog: { projectId } },
    });
    const totalWorkHours = Math.round(
      workforce.reduce((sum, w) => sum + w.workerCount * w.hoursWorked, 0) * 10,
    ) / 10;

    const delays = await this.prisma.delayEntry.findMany({
      where: { dailyLog: { projectId } },
    });
    const totalDelayHours = Math.round(
      (delays.reduce((sum, d) => sum + d.durationMinutes, 0) / 60) * 10,
    ) / 10;

    const activeDays = await this.prisma.dailyLog.groupBy({
      by: ['logDate'],
      where: { projectId },
    });

    const avgDailyWorkforce = activeDays.length > 0
      ? Math.round(
          (workforce.reduce((sum, w) => sum + w.workerCount, 0) / activeDays.length) * 10,
        ) / 10
      : 0;

    // Analyses
    const [safetyScore, delayPatterns, workforceTrend, scheduleRisk] = await Promise.all([
      this.riskEngine.calculateSafetyScore(projectId),
      this.riskEngine.analyzeDelayPatterns(projectId),
      this.riskEngine.analyzeWorkforceTrends(projectId),
      this.riskEngine.calculateScheduleRisk(projectId),
    ]);

    // Delay by category
    const delayCategoryMap = new Map<string, number>();
    for (const d of delays) {
      delayCategoryMap.set(d.cause, (delayCategoryMap.get(d.cause) || 0) + d.durationMinutes);
    }
    const byCategory = Array.from(delayCategoryMap.entries()).map(([cause, minutes]) => ({
      cause,
      totalMinutes: minutes,
      totalHours: Math.round((minutes / 60) * 10) / 10,
    }));

    // Delay trend
    let delayTrend: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE';
    const increasingPatterns = delayPatterns.filter((p) => p.trend === 'INCREASING').length;
    const decreasingPatterns = delayPatterns.filter((p) => p.trend === 'DECREASING').length;
    if (increasingPatterns > decreasingPatterns) delayTrend = 'INCREASING';
    else if (decreasingPatterns > increasingPatterns) delayTrend = 'DECREASING';

    // Active alerts
    const activeAlerts = await this.prisma.riskAlert.findMany({
      where: { projectId, status: 'ACTIVE' },
      orderBy: { severity: 'desc' },
    });

    return {
      projectId,
      summary: {
        totalLogs,
        totalWorkHours,
        totalDelayHours,
        activeDays: activeDays.length,
        avgDailyWorkforce,
      },
      safetyScore,
      delayAnalysis: {
        totalHours: totalDelayHours,
        byCategory,
        patterns: delayPatterns,
        trend: delayTrend,
      },
      workforceTrend,
      scheduleRisk,
      activeAlerts,
    };
  }

  async getOrganizationOverview(orgId: string) {
    const projects = await this.prisma.project.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, isActive: true },
    });

    const alerts = await this.prisma.riskAlert.findMany({
      where: { organizationId: orgId, status: 'ACTIVE' },
    });

    // Calculate per-project summaries
    const projectSummaries = await Promise.all(
      projects.map(async (p) => {
        const projectAlerts = alerts.filter((a) => a.projectId === p.id);
        const safetyScore = await this.riskEngine.calculateSafetyScore(p.id);
        const scheduleRisk = await this.riskEngine.calculateScheduleRisk(p.id);

        return {
          projectId: p.id,
          name: p.name,
          isActive: p.isActive,
          safetyScore: safetyScore.score,
          alertCount: projectAlerts.length,
          riskLevel: scheduleRisk.riskLevel,
        };
      }),
    );

    // Org-wide safety score (average of project scores)
    const activeProjects = projectSummaries.filter((p) => p.isActive);
    const orgSafetyScore = activeProjects.length > 0
      ? Math.round(
          activeProjects.reduce((sum, p) => sum + p.safetyScore, 0) / activeProjects.length,
        )
      : 100;

    return {
      totalProjects: projects.length,
      activeProjects: activeProjects.length,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter((a) => a.severity === 'CRITICAL').length,
      orgSafetyScore,
      projectSummaries,
    };
  }

  async runRiskAnalysis(projectId: string, orgId: string) {
    // Verify project
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const newAlerts: Array<{
      alertType: RiskAlertType;
      severity: RiskSeverity;
      title: string;
      description: string;
      sourceData: any;
    }> = [];

    // 1. Delay pattern analysis (use full project history)
    const delayPatterns = await this.riskEngine.analyzeDelayPatterns(projectId, 36500);
    for (const pattern of delayPatterns) {
      const severity = pattern.trend === 'INCREASING'
        ? (pattern.count >= 5 ? 'HIGH' : 'MEDIUM')
        : 'LOW';
      newAlerts.push({
        alertType: 'DELAY_PATTERN',
        severity: severity as RiskSeverity,
        title: `Recurring ${pattern.cause.toLowerCase().replace(/_/g, ' ')} delays`,
        description: `${pattern.cause} delays occurred ${pattern.count} times totaling ${Math.round(pattern.totalMinutes / 60 * 10) / 10} hours. Trend: ${pattern.trend}.`,
        sourceData: pattern,
      });
    }

    // 2. Safety score analysis (use full project history)
    const safetyScore = await this.riskEngine.calculateSafetyScore(projectId, 36500);
    if (safetyScore.score < 60) {
      newAlerts.push({
        alertType: 'SAFETY_TREND',
        severity: safetyScore.score < 40 ? 'CRITICAL' : 'HIGH',
        title: 'Safety score below threshold',
        description: `Safety score is ${safetyScore.score}/100 (threshold: 60). TRIR: ${safetyScore.trir.toFixed(2)}. Trend: ${safetyScore.trend}.`,
        sourceData: safetyScore,
      });
    }

    // 3. Workforce trends (use full project history)
    const workforceTrend = await this.riskEngine.analyzeWorkforceTrends(projectId, 36500);
    if (workforceTrend.trend === 'DECLINING' && workforceTrend.previousAvg > 0) {
      const dropPct = Math.round(
        ((workforceTrend.previousAvg - workforceTrend.currentAvg) / workforceTrend.previousAvg) * 100,
      );
      if (dropPct >= 20) {
        newAlerts.push({
          alertType: 'WORKFORCE_SHORTAGE',
          severity: dropPct >= 40 ? 'HIGH' : 'MEDIUM',
          title: 'Workforce declining significantly',
          description: `Average daily workforce dropped ${dropPct}% from ${workforceTrend.previousAvg} to ${workforceTrend.currentAvg} workers.`,
          sourceData: workforceTrend,
        });
      }
    }

    // 4. Schedule risk
    const scheduleRisk = await this.riskEngine.calculateScheduleRisk(projectId);
    if (scheduleRisk.delayPercentage > 10) {
      newAlerts.push({
        alertType: 'SCHEDULE_SLIP',
        severity: scheduleRisk.riskLevel as RiskSeverity,
        title: 'Cumulative delays exceeding threshold',
        description: `Total delay: ${scheduleRisk.totalDelayHours}h (${scheduleRisk.delayPercentage}% of elapsed time). ${scheduleRisk.projectedImpact}.`,
        sourceData: scheduleRisk,
      });
    }

    // Deduplicate against existing ACTIVE alerts of the same type
    const existingAlerts = await this.prisma.riskAlert.findMany({
      where: { projectId, status: 'ACTIVE' },
      select: { alertType: true },
    });
    const existingTypes = new Set(existingAlerts.map((a) => a.alertType));

    const created: any[] = [];
    for (const alert of newAlerts) {
      if (existingTypes.has(alert.alertType)) continue;

      const record = await this.prisma.riskAlert.create({
        data: {
          organizationId: orgId,
          projectId,
          ...alert,
        },
      });
      created.push(record);
    }

    return created;
  }

  // ─── Alert Management ───

  async findAlerts(orgId: string, filters: {
    projectId?: string;
    severity?: string;
    status?: string;
    alertType?: string;
  }) {
    const where: any = { organizationId: orgId };
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.severity) where.severity = filters.severity;
    if (filters.status) where.status = filters.status;
    if (filters.alertType) where.alertType = filters.alertType;

    return this.prisma.riskAlert.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findAlert(id: string, orgId: string) {
    const alert = await this.prisma.riskAlert.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }

  async acknowledgeAlert(id: string, orgId: string, userId: string) {
    await this.findAlert(id, orgId);
    return this.prisma.riskAlert.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      },
    });
  }

  async resolveAlert(id: string, orgId: string) {
    await this.findAlert(id, orgId);
    return this.prisma.riskAlert.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    });
  }

  async dismissAlert(id: string, orgId: string) {
    await this.findAlert(id, orgId);
    return this.prisma.riskAlert.update({
      where: { id },
      data: { status: 'DISMISSED' },
    });
  }

  // ─── Detail Endpoints ───

  async getDelayAnalysis(projectId: string, orgId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const delays = await this.prisma.delayEntry.findMany({
      where: { dailyLog: { projectId } },
      include: { dailyLog: { select: { logDate: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const patterns = await this.riskEngine.analyzeDelayPatterns(projectId);
    const scheduleRisk = await this.riskEngine.calculateScheduleRisk(projectId);

    // Group by category
    const byCause = new Map<string, { count: number; totalMinutes: number }>();
    for (const d of delays) {
      const entry = byCause.get(d.cause) || { count: 0, totalMinutes: 0 };
      entry.count++;
      entry.totalMinutes += d.durationMinutes;
      byCause.set(d.cause, entry);
    }

    return {
      projectId,
      totalDelays: delays.length,
      totalDelayHours: scheduleRisk.totalDelayHours,
      byCategory: Array.from(byCause.entries()).map(([cause, data]) => ({
        cause,
        ...data,
        totalHours: Math.round((data.totalMinutes / 60) * 10) / 10,
      })),
      patterns,
      scheduleRisk,
      recentDelays: delays.slice(0, 10).map((d) => ({
        id: d.id,
        cause: d.cause,
        description: d.description,
        durationMinutes: d.durationMinutes,
        date: d.dailyLog.logDate,
      })),
    };
  }

  async getSafetyMetrics(projectId: string, orgId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const safetyScore = await this.riskEngine.calculateSafetyScore(projectId);

    const incidents = await this.prisma.oshaIncident.findMany({
      where: { projectId },
      orderBy: { incidentDate: 'desc' },
      take: 10,
    });

    return {
      projectId,
      ...safetyScore,
      industryAvgTrir: 2.8,
      recentIncidents: incidents.map((i) => ({
        id: i.id,
        date: i.incidentDate,
        description: i.description,
        caseType: i.caseType,
        isRecordable: i.isRecordable,
      })),
    };
  }

  async getWorkforceTrends(projectId: string, orgId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const trend = await this.riskEngine.analyzeWorkforceTrends(projectId);

    // Get daily totals for charting
    const workforce = await this.prisma.workforceEntry.findMany({
      where: { dailyLog: { projectId } },
      include: { dailyLog: { select: { logDate: true } } },
      orderBy: { dailyLog: { logDate: 'asc' } },
    });

    const dailyTotals = new Map<string, number>();
    for (const w of workforce) {
      const dateKey = w.dailyLog.logDate.toISOString().split('T')[0];
      dailyTotals.set(dateKey, (dailyTotals.get(dateKey) || 0) + w.workerCount);
    }

    return {
      projectId,
      ...trend,
      dailyTotals: Array.from(dailyTotals.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, totalWorkers: count })),
    };
  }
}
