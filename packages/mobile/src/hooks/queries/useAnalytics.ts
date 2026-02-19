import { useQuery } from '@tanstack/react-query';
import { getProjectDashboard, getOrgOverview } from '@/api/endpoints/analytics';

export function useProjectDashboard(projectId: string) {
  return useQuery({
    queryKey: ['analytics', 'dashboard', projectId],
    queryFn: () => getProjectDashboard(projectId),
    enabled: !!projectId,
  });
}

export function useOrgOverview() {
  return useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: getOrgOverview,
  });
}
