import { api } from '../client';

// ─── Types ───────────────────────────────────────────────────────

export interface ProjectDashboard {
  projectId: string;
  summary: {
    totalLogs: number;
    totalWorkHours: number;
    totalDelayHours: number;
    activeDays: number;
    avgDailyWorkforce: number;
  };
  safetyScore: SafetyScore;
  delayAnalysis: {
    totalHours: number;
    byCategory: DelayCategoryBreakdown[];
    patterns: DelayPattern[];
    trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  };
  workforceTrend: WorkforceTrend;
  scheduleRisk: ScheduleRisk;
  activeAlerts: RiskAlert[];
}

export interface SafetyScore {
  score: number;
  trir: number;
  daysSinceLastRecordable: number | null;
  toolboxTalkCompliance: number;
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
}

export interface DelayCategoryBreakdown {
  cause: string;
  totalMinutes: number;
  totalHours: number;
}

export interface DelayPattern {
  cause: string;
  count: number;
  totalMinutes: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  lastOccurrence: string;
}

export interface WorkforceTrend {
  currentAvg: number;
  previousAvg: number;
  trend: 'GROWING' | 'DECLINING' | 'STABLE';
  byTrade: { trade: string; avgCount: number }[];
}

export interface ScheduleRisk {
  totalDelayHours: number;
  delayPercentage: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  projectedImpact: string;
}

export interface RiskAlert {
  id: string;
  organizationId: string;
  projectId: string;
  alertType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  sourceData: unknown;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgOverview {
  totalProjects: number;
  activeProjects: number;
  totalAlerts: number;
  criticalAlerts: number;
  orgSafetyScore: number;
  projectSummaries: {
    projectId: string;
    name: string;
    isActive: boolean;
    safetyScore: number;
    alertCount: number;
    riskLevel: string;
  }[];
}

// ─── API Functions ───────────────────────────────────────────────

export function getProjectDashboard(projectId: string): Promise<ProjectDashboard> {
  return api<ProjectDashboard>(`/analytics/projects/${projectId}/dashboard`);
}

export function getOrgOverview(): Promise<OrgOverview> {
  return api<OrgOverview>('/analytics/overview');
}

export function getDelayAnalysis(projectId: string) {
  return api(`/analytics/projects/${projectId}/delays`);
}

export function getSafetyMetrics(projectId: string) {
  return api(`/analytics/projects/${projectId}/safety`);
}

export function getWorkforceTrends(projectId: string) {
  return api(`/analytics/projects/${projectId}/workforce`);
}
