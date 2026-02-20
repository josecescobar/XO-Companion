import { useQuery } from '@tanstack/react-query';
import { listInspections, getInspection, getInspectionSummary } from '@/api/endpoints/inspections';

export function useProjectInspections(projectId: string, filters?: { inspectionType?: string; status?: string; dailyLogId?: string }) {
  return useQuery({
    queryKey: ['inspections', projectId, filters],
    queryFn: () => listInspections(projectId, filters),
    enabled: !!projectId,
  });
}

export function useInspection(projectId: string, inspectionId: string) {
  return useQuery({
    queryKey: ['inspections', projectId, inspectionId],
    queryFn: () => getInspection(projectId, inspectionId),
    enabled: !!projectId && !!inspectionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'PENDING' || status === 'PROCESSING' ? 3000 : false;
    },
  });
}

export function useInspectionSummary(projectId: string) {
  return useQuery({
    queryKey: ['inspections', 'summary', projectId],
    queryFn: () => getInspectionSummary(projectId),
    enabled: !!projectId,
  });
}
