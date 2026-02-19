import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DelayPattern {
  cause: string;
  count: number;
  totalMinutes: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  lastOccurrence: Date;
}

export interface SafetyScore {
  score: number;
  trir: number;
  daysSinceLastRecordable: number | null;
  toolboxTalkCompliance: number;
  nearMissRatio: number;
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
}

export interface WorkforceTrend {
  currentAvg: number;
  previousAvg: number;
  trend: 'GROWING' | 'DECLINING' | 'STABLE';
  byTrade: Array<{ trade: string; avgCount: number }>;
}

export interface ScheduleRisk {
  totalDelayHours: number;
  delayPercentage: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  projectedImpact: string;
}

@Injectable()
export class RiskEngineService {
  constructor(private prisma: PrismaService) {}

  async analyzeDelayPatterns(projectId: string, lookbackDays = 30): Promise<DelayPattern[]> {
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);

    const delays = await this.prisma.delayEntry.findMany({
      where: {
        dailyLog: {
          projectId,
          logDate: { gte: since },
        },
      },
      include: {
        dailyLog: { select: { logDate: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by cause
    const byCause = new Map<string, typeof delays>();
    for (const d of delays) {
      const group = byCause.get(d.cause) || [];
      group.push(d);
      byCause.set(d.cause, group);
    }

    const patterns: DelayPattern[] = [];
    for (const [cause, entries] of byCause) {
      if (entries.length < 3) continue;

      const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);
      const lastOccurrence = entries[entries.length - 1].dailyLog.logDate;

      // Trend: compare first half vs second half frequency
      const mid = Math.floor(entries.length / 2);
      const firstHalf = entries.slice(0, mid).length;
      const secondHalf = entries.slice(mid).length;
      let trend: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE';
      if (secondHalf > firstHalf * 1.3) trend = 'INCREASING';
      else if (secondHalf < firstHalf * 0.7) trend = 'DECREASING';

      patterns.push({ cause, count: entries.length, totalMinutes, trend, lastOccurrence });
    }

    return patterns;
  }

  async calculateSafetyScore(projectId: string, lookbackDays = 90): Promise<SafetyScore> {
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);

    // Get safety entries
    const safetyEntries = await this.prisma.safetyEntry.findMany({
      where: {
        dailyLog: { projectId, logDate: { gte: since } },
      },
      include: { dailyLog: { select: { logDate: true } } },
    });

    // Get OSHA incidents
    const incidents = await this.prisma.oshaIncident.findMany({
      where: {
        projectId,
        incidentDate: { gte: since },
        isRecordable: true,
      },
    });

    // Get workforce data for worker-hours calculation
    const workforce = await this.prisma.workforceEntry.findMany({
      where: {
        dailyLog: { projectId, logDate: { gte: since } },
      },
    });

    const totalWorkerHours = workforce.reduce(
      (sum, w) => sum + w.workerCount * w.hoursWorked,
      0,
    );

    // TRIR = (Recordable incidents x 200,000) / Total worker-hours
    const trir = totalWorkerHours > 0
      ? (incidents.length * 200000) / totalWorkerHours
      : 0;

    // Days since last recordable
    let daysSinceLastRecordable: number | null = null;
    if (incidents.length > 0) {
      const latest = incidents.reduce((a, b) =>
        new Date(a.incidentDate) > new Date(b.incidentDate) ? a : b,
      );
      daysSinceLastRecordable = Math.floor(
        (Date.now() - new Date(latest.incidentDate).getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    // Toolbox talk compliance: % of daily logs with safety entries that have talks
    const totalLogs = await this.prisma.dailyLog.count({
      where: { projectId, logDate: { gte: since } },
    });
    const logsWithTalks = safetyEntries.filter(
      (s) => s.toolboxTalks.length > 0,
    ).length;
    const toolboxTalkCompliance = totalLogs > 0 ? logsWithTalks / totalLogs : 0;

    // Near-miss ratio
    const totalNearMisses = safetyEntries.reduce((sum, s) => sum + s.nearMisses, 0);
    const nearMissRatio = incidents.length > 0 ? totalNearMisses / incidents.length : totalNearMisses;

    // Score calculation (0-100, 100 = safest)
    let score = 100;
    // Penalize for high TRIR (industry avg ~2.8)
    if (trir > 2.8) score -= Math.min(40, (trir - 2.8) * 10);
    else if (trir > 0) score -= trir * 5;
    // Penalize for low toolbox talk compliance
    score -= (1 - toolboxTalkCompliance) * 20;
    // Penalize for recent incidents
    if (daysSinceLastRecordable !== null && daysSinceLastRecordable < 30) {
      score -= 15;
    }
    // Bonus for near-miss reporting (indicates good safety culture)
    if (nearMissRatio > 5) score += 5;
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Trend: compare first half vs second half of period
    const midDate = new Date(since.getTime() + (Date.now() - since.getTime()) / 2);
    const firstHalfIncidents = incidents.filter(
      (i) => new Date(i.incidentDate) < midDate,
    ).length;
    const secondHalfIncidents = incidents.filter(
      (i) => new Date(i.incidentDate) >= midDate,
    ).length;
    let trend: 'IMPROVING' | 'DECLINING' | 'STABLE' = 'STABLE';
    if (secondHalfIncidents < firstHalfIncidents) trend = 'IMPROVING';
    else if (secondHalfIncidents > firstHalfIncidents) trend = 'DECLINING';

    return { score, trir, daysSinceLastRecordable, toolboxTalkCompliance, nearMissRatio, trend };
  }

  async analyzeWorkforceTrends(projectId: string, lookbackDays = 30): Promise<WorkforceTrend> {
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);

    const workforce = await this.prisma.workforceEntry.findMany({
      where: {
        dailyLog: { projectId, logDate: { gte: since } },
      },
      include: { dailyLog: { select: { logDate: true } } },
    });

    // Group by date
    const byDate = new Map<string, number>();
    const byTrade = new Map<string, number[]>();

    for (const w of workforce) {
      const dateKey = w.dailyLog.logDate.toISOString().split('T')[0];
      byDate.set(dateKey, (byDate.get(dateKey) || 0) + w.workerCount);

      const counts = byTrade.get(w.trade) || [];
      counts.push(w.workerCount);
      byTrade.set(w.trade, counts);
    }

    const dates = Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b));

    // Split into two halves for trend
    const mid = Math.floor(dates.length / 2);
    const firstHalf = dates.slice(0, mid || 1);
    const secondHalf = dates.slice(mid || 1);

    const avgFirst = firstHalf.length > 0
      ? firstHalf.reduce((sum, [, c]) => sum + c, 0) / firstHalf.length
      : 0;
    const avgSecond = secondHalf.length > 0
      ? secondHalf.reduce((sum, [, c]) => sum + c, 0) / secondHalf.length
      : 0;

    let trend: 'GROWING' | 'DECLINING' | 'STABLE' = 'STABLE';
    if (avgFirst > 0) {
      const change = (avgSecond - avgFirst) / avgFirst;
      if (change < -0.2) trend = 'DECLINING';
      else if (change > 0.2) trend = 'GROWING';
    }

    const tradeBreakdown = Array.from(byTrade.entries()).map(([trade, counts]) => ({
      trade,
      avgCount: Math.round((counts.reduce((a, b) => a + b, 0) / counts.length) * 10) / 10,
    }));

    return {
      currentAvg: Math.round(avgSecond * 10) / 10,
      previousAvg: Math.round(avgFirst * 10) / 10,
      trend,
      byTrade: tradeBreakdown,
    };
  }

  async calculateScheduleRisk(projectId: string): Promise<ScheduleRisk> {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { startDate: true, endDate: true },
    });

    // Sum all delay minutes
    const delays = await this.prisma.delayEntry.findMany({
      where: { dailyLog: { projectId } },
      select: { durationMinutes: true },
    });

    const totalDelayMinutes = delays.reduce((sum, d) => sum + d.durationMinutes, 0);
    const totalDelayHours = Math.round((totalDelayMinutes / 60) * 10) / 10;

    // Calculate elapsed project working hours (8hr days)
    const start = project.startDate ? new Date(project.startDate) : new Date();
    const now = new Date();
    const elapsedDays = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const elapsedWorkHours = elapsedDays * 8;

    const delayPercentage = elapsedWorkHours > 0
      ? Math.round((totalDelayHours / elapsedWorkHours) * 1000) / 10
      : 0;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (delayPercentage > 20) riskLevel = 'CRITICAL';
    else if (delayPercentage > 10) riskLevel = 'HIGH';
    else if (delayPercentage > 5) riskLevel = 'MEDIUM';

    let projectedImpact = 'On track';
    if (riskLevel === 'CRITICAL') projectedImpact = 'Significant schedule overrun likely';
    else if (riskLevel === 'HIGH') projectedImpact = 'Schedule at risk, mitigation needed';
    else if (riskLevel === 'MEDIUM') projectedImpact = 'Minor delays accumulating';

    return { totalDelayHours, delayPercentage, riskLevel, projectedImpact };
  }
}
