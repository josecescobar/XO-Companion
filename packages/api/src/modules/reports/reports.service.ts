import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { TaskStatus } from '@prisma/client';

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

const REPORT_SYSTEM_PROMPT = `You are a construction project reporting assistant. Generate a professional weekly progress report for a construction project. The report should be written in a clear, professional tone suitable for sending to a client, general contractor, or project owner.

Structure the report with these sections:
1. Executive Summary (2-3 sentences — what happened this week, key accomplishments, any concerns)
2. Work Completed (narrative format, reference specific locations and quantities)
3. Workforce Summary (trades on site, total hours)
4. Safety (incidents, toolbox talks, compliance status)
5. Delays & Issues (what caused delays, impact, resolution status)
6. Materials & Equipment (deliveries, equipment status)
7. Next Week Outlook (based on tasks and momentum)

Keep it concise — no more than 1 page when printed. Use professional construction reporting language.`;

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async generateWeeklyReport(projectId: string, weekOfDate: string): Promise<WeeklyReport> {
    // Calculate Monday–Sunday range
    const weekOf = new Date(weekOfDate);
    const dayOfWeek = weekOf.getDay();
    const monday = new Date(weekOf);
    monday.setDate(weekOf.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Fetch daily logs with all sub-entries
    const logs = await this.prisma.dailyLog.findMany({
      where: {
        projectId,
        logDate: { gte: monday, lte: sunday },
      },
      include: {
        workforce: true,
        equipment: true,
        workCompleted: true,
        materials: true,
        safety: true,
        delays: true,
      },
    });

    // Aggregate data
    const tradeMap = new Map<string, { hours: number; workers: number }>();
    let totalLaborHours = 0;
    let totalOvertimeHours = 0;

    for (const log of logs) {
      for (const wf of log.workforce) {
        const existing = tradeMap.get(wf.trade) || { hours: 0, workers: 0 };
        existing.hours += wf.hoursWorked * wf.workerCount;
        existing.workers += wf.workerCount;
        tradeMap.set(wf.trade, existing);
        totalLaborHours += wf.hoursWorked * wf.workerCount;
        totalOvertimeHours += wf.overtimeHours * wf.workerCount;
      }
    }

    const tradeBreakdown = Array.from(tradeMap.entries()).map(([trade, data]) => ({
      trade,
      hours: Math.round(data.hours * 10) / 10,
      workers: data.workers,
    }));

    const workCompleted = logs.flatMap((log) =>
      log.workCompleted.map((wc) => ({
        location: wc.location,
        description: wc.description,
        quantity: wc.quantity ?? undefined,
        unit: wc.unit ?? undefined,
      })),
    );

    const delayMap = new Map<string, number>();
    let totalDelayMinutes = 0;
    for (const log of logs) {
      for (const d of log.delays) {
        delayMap.set(d.cause, (delayMap.get(d.cause) || 0) + d.durationMinutes);
        totalDelayMinutes += d.durationMinutes;
      }
    }
    const delayBreakdown = Array.from(delayMap.entries()).map(([cause, minutes]) => ({ cause, minutes }));

    let safetyIncidents = 0;
    let oshaRecordables = 0;
    const toolboxTalks: string[] = [];
    for (const log of logs) {
      if (log.safety) {
        safetyIncidents += log.safety.incidents.length;
        if (log.safety.oshaRecordable) oshaRecordables++;
        toolboxTalks.push(...log.safety.toolboxTalks);
      }
    }

    const materialsDelivered = logs.reduce((sum, log) => sum + log.materials.length, 0);

    // Task counts for the week
    const [tasksCreated, tasksCompleted] = await Promise.all([
      this.prisma.task.count({
        where: {
          projectId,
          createdAt: { gte: monday, lte: sunday },
        },
      }),
      this.prisma.task.count({
        where: {
          projectId,
          status: TaskStatus.COMPLETED,
          completedAt: { gte: monday, lte: sunday },
        },
      }),
    ]);

    const structured = {
      totalLaborHours: Math.round(totalLaborHours * 10) / 10,
      totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
      tradeBreakdown,
      workCompleted,
      delayMinutes: totalDelayMinutes,
      delayBreakdown,
      safetyIncidents,
      oshaRecordables,
      toolboxTalks,
      materialsDelivered,
      tasksCreated,
      tasksCompleted,
      daysWithLogs: logs.length,
    };

    // Fetch project name for the report
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, code: true },
    });

    // Generate AI narrative
    let narrative = '';
    try {
      const dataPrompt = `Generate a weekly progress report for the following construction project data:

Project: ${project?.name ?? 'Unknown'} (${project?.code ?? ''})
Week: ${this.formatDate(monday)} – ${this.formatDate(sunday)}
Days with daily logs: ${logs.length}

Workforce:
- Total labor hours: ${structured.totalLaborHours}
- Total overtime hours: ${structured.totalOvertimeHours}
- Trades: ${tradeBreakdown.map((t) => `${t.trade} (${t.workers} workers, ${t.hours} hrs)`).join(', ') || 'None reported'}

Work Completed:
${workCompleted.map((w) => `- ${w.location}: ${w.description}${w.quantity ? ` (${w.quantity} ${w.unit || ''})` : ''}`).join('\n') || '- None reported'}

Safety:
- Incidents: ${safetyIncidents}
- OSHA Recordables: ${oshaRecordables}
- Toolbox Talks: ${toolboxTalks.join(', ') || 'None'}

Delays (${totalDelayMinutes} total minutes):
${delayBreakdown.map((d) => `- ${d.cause}: ${d.minutes} min`).join('\n') || '- None reported'}

Materials: ${materialsDelivered} deliveries received

Tasks: ${tasksCreated} created, ${tasksCompleted} completed this week`;

      const model = this.createModel();
      const result = await generateText({
        model,
        system: REPORT_SYSTEM_PROMPT,
        prompt: dataPrompt,
      });
      narrative = result.text;
    } catch (err: any) {
      this.logger.warn(`AI narrative generation failed: ${err.message}`);
      narrative = 'AI narrative generation unavailable. Please review the structured data below.';
    }

    return {
      projectId,
      weekOf: this.formatDate(monday),
      weekEnd: this.formatDate(sunday),
      structured,
      narrative,
      generatedAt: new Date().toISOString(),
    };
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private createModel() {
    const modelId = this.configService.get<string>('AI_PRIMARY_MODEL') || 'claude-sonnet-4-20250514';

    if (modelId.startsWith('claude') || modelId.startsWith('anthropic')) {
      const anthropic = createAnthropic({
        apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
      });
      return anthropic(modelId);
    }

    const openai = createOpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
    return openai(modelId);
  }
}
