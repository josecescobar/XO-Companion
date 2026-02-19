import { useQuery } from '@tanstack/react-query';
import { listTasks, getTaskSummary } from '@/api/endpoints/tasks';

export function useProjectTasks(
  projectId: string,
  filters?: { status?: string; priority?: string; assignee?: string; category?: string },
) {
  return useQuery({
    queryKey: ['tasks', projectId, filters],
    queryFn: () => listTasks(projectId, filters),
    enabled: !!projectId,
  });
}

export function useTaskSummary(projectId: string) {
  return useQuery({
    queryKey: ['tasks', projectId, 'summary'],
    queryFn: () => getTaskSummary(projectId),
    enabled: !!projectId,
  });
}
