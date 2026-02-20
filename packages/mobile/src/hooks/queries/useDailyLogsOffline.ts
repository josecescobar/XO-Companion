import { useOfflineFirst } from '@/lib/powersync/useOfflineQuery';
import { listDailyLogs, type DailyLogSummary } from '@/api/endpoints/daily-logs';

function rowToDailyLog(r: any): DailyLogSummary {
  return {
    id: r.id,
    projectId: r.project_id,
    logDate: r.log_date,
    status: r.status,
    reportNumber: null,
    notes: r.notes,
    createdAt: r.created_at,
    createdBy: { id: r.user_id || '', firstName: '', lastName: '' },
    _count: {
      workforce: 0,
      equipment: 0,
      workCompleted: 0,
      materials: 0,
      delays: 0,
      voiceNotes: 0,
      signatures: 0,
    },
  };
}

export function useDailyLogsOffline(projectId: string, status?: string) {
  const sql = status
    ? 'SELECT * FROM daily_logs WHERE project_id = ? AND status = ? ORDER BY log_date DESC'
    : 'SELECT * FROM daily_logs WHERE project_id = ? ORDER BY log_date DESC';
  const params = status ? [projectId, status] : [projectId];

  return useOfflineFirst<DailyLogSummary[]>(
    sql,
    params,
    (rows) => rows.map(rowToDailyLog),
    {
      queryKey: ['daily-logs', projectId, { status }],
      queryFn: () => listDailyLogs(projectId, status ? { status } : undefined),
      enabled: !!projectId,
    },
  );
}
