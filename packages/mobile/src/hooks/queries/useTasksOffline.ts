import { useOfflineFirst } from '@/lib/powersync/useOfflineQuery';
import { listTasks, getTaskSummary, type Task, type TaskSummary } from '@/api/endpoints/tasks';

function rowToTask(r: any): Task {
  return {
    id: r.id,
    projectId: r.project_id,
    description: r.description,
    assignee: r.assignee,
    dueDate: r.due_date,
    priority: r.priority,
    category: r.category,
    status: r.status,
    aiGenerated: !!r.ai_generated,
    aiConfidence: r.ai_confidence,
    dailyLogId: r.daily_log_id,
    voiceNoteId: r.voice_note_id,
    completedAt: r.completed_at,
    createdAt: r.created_at,
  };
}

export function useProjectTasksOffline(
  projectId: string,
  filters?: { status?: string; priority?: string; assignee?: string; category?: string },
) {
  let sql = 'SELECT * FROM tasks WHERE project_id = ?';
  const params: any[] = [projectId];

  if (filters?.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.priority) {
    sql += ' AND priority = ?';
    params.push(filters.priority);
  }
  if (filters?.assignee) {
    sql += ' AND assignee = ?';
    params.push(filters.assignee);
  }
  if (filters?.category) {
    sql += ' AND category = ?';
    params.push(filters.category);
  }
  sql += ' ORDER BY created_at DESC';

  return useOfflineFirst<Task[]>(
    sql,
    params,
    (rows) => rows.map(rowToTask),
    {
      queryKey: ['tasks', projectId, filters],
      queryFn: () => listTasks(projectId, filters),
      enabled: !!projectId,
    },
  );
}

export function useTaskSummaryOffline(projectId: string) {
  return useOfflineFirst<TaskSummary>(
    `SELECT
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
      COUNT(CASE WHEN priority = 'URGENT' AND status NOT IN ('COMPLETED', 'CANCELLED') THEN 1 END) as urgent,
      COUNT(CASE WHEN status = 'COMPLETED' AND completed_at >= date('now', '-7 days') THEN 1 END) as completed_this_week,
      COUNT(CASE WHEN due_date < date('now') AND status NOT IN ('COMPLETED', 'CANCELLED') THEN 1 END) as overdue
    FROM tasks WHERE project_id = ?`,
    [projectId],
    (rows) =>
      rows.length > 0
        ? {
            pending: rows[0].pending || 0,
            urgent: rows[0].urgent || 0,
            completedThisWeek: rows[0].completed_this_week || 0,
            overdue: rows[0].overdue || 0,
          }
        : { pending: 0, urgent: 0, completedThisWeek: 0, overdue: 0 },
    {
      queryKey: ['tasks', projectId, 'summary'],
      queryFn: () => getTaskSummary(projectId),
      enabled: !!projectId,
    },
  );
}
