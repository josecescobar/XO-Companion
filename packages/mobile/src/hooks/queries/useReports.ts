import { useQuery } from '@tanstack/react-query';
import { getWeeklyReport } from '@/api/endpoints/reports';

export function useWeeklyReport(projectId: string, weekOf: string) {
  return useQuery({
    queryKey: ['reports', 'weekly', projectId, weekOf],
    queryFn: () => getWeeklyReport(projectId, weekOf),
    enabled: false, // Only fetch when user triggers via refetch()
  });
}
