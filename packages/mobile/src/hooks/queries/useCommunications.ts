import { useQuery } from '@tanstack/react-query';
import { listCommunications, getCommunication, getCommunicationSummary } from '@/api/endpoints/communications';

export function useProjectCommunications(projectId: string, filters?: { type?: string; status?: string; urgency?: string }) {
  return useQuery({
    queryKey: ['communications', projectId, filters],
    queryFn: () => listCommunications(projectId, filters),
    enabled: !!projectId,
  });
}

export function useCommunication(projectId: string, commId: string) {
  return useQuery({
    queryKey: ['communications', projectId, commId],
    queryFn: () => getCommunication(projectId, commId),
    enabled: !!projectId && !!commId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'DRAFTING' ? 3000 : false;
    },
  });
}

export function useCommunicationSummary(projectId: string) {
  return useQuery({
    queryKey: ['communications', 'summary', projectId],
    queryFn: () => getCommunicationSummary(projectId),
    enabled: !!projectId,
  });
}
