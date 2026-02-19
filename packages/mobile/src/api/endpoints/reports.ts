import { api } from '../client';

export interface WeeklyReport {
  projectId: string;
  weekOf: string;
  weekEnd: string;
  structured: {
    totalLaborHours: number;
    totalOvertimeHours: number;
    tradeBreakdown: { trade: string; hours: number; workers: number }[];
    workCompleted: { location: string; description: string; quantity?: number; unit?: string }[];
    delayMinutes: number;
    delayBreakdown: { cause: string; minutes: number }[];
    safetyIncidents: number;
    oshaRecordables: number;
    toolboxTalks: string[];
    materialsDelivered: number;
    tasksCreated: number;
    tasksCompleted: number;
    daysWithLogs: number;
  };
  narrative: string;
  generatedAt: string;
}

export function getWeeklyReport(projectId: string, weekOf: string): Promise<WeeklyReport> {
  return api<WeeklyReport>(`/projects/${projectId}/reports/weekly?weekOf=${weekOf}`);
}
