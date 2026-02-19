import { useQuery } from '@tanstack/react-query';
import { listMedia } from '@/api/endpoints/media';

export function useLogMedia(projectId: string, dailyLogId: string) {
  return useQuery({
    queryKey: ['media', projectId, 'log', dailyLogId],
    queryFn: () => listMedia(projectId, { dailyLogId }),
    enabled: !!projectId && !!dailyLogId,
  });
}

export function useIncidentMedia(projectId: string, incidentId: string) {
  return useQuery({
    queryKey: ['media', projectId, 'incident', incidentId],
    queryFn: () => listMedia(projectId, { incidentId }),
    enabled: !!projectId && !!incidentId,
  });
}
