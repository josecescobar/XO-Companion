import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInspection, reviewInspection, deleteInspection } from '@/api/endpoints/inspections';
import type { InspectionType, InspectionStatus } from '@/api/endpoints/inspections';

export function useCreateInspection(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      mediaId: string;
      documentId?: string;
      dailyLogId?: string;
      title: string;
      description?: string;
      inspectionType: InspectionType;
    }) => createInspection(projectId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections', projectId] }),
  });
}

export function useReviewInspection(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { inspectionId: string; result: InspectionStatus; notes?: string }) =>
      reviewInspection(projectId, params.inspectionId, { result: params.result, notes: params.notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections', projectId] }),
  });
}

export function useDeleteInspection(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inspectionId: string) => deleteInspection(projectId, inspectionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections', projectId] }),
  });
}
