import { useQuery } from '@tanstack/react-query';
import { listDailyLogs, getDailyLog } from '@/api/endpoints/daily-logs';

export function useDailyLogs(projectId: string, status?: string) {
  return useQuery({
    queryKey: ['daily-logs', projectId, { status }],
    queryFn: () => listDailyLogs(projectId, status ? { status } : undefined),
    enabled: !!projectId,
  });
}

export function useDailyLog(projectId: string, logId: string) {
  return useQuery({
    queryKey: ['daily-logs', projectId, logId],
    queryFn: () => getDailyLog(projectId, logId),
    enabled: !!projectId && !!logId,
  });
}
