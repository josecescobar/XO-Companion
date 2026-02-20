import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  uploadDocument,
  deleteDocument,
  reprocessDocument,
} from '@/api/endpoints/documents';
import type { DocumentCategory } from '@/api/endpoints/documents';

export function useUploadDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      file: { uri: string; type: string; name: string };
      metadata: {
        title: string;
        category: DocumentCategory;
        description?: string;
      };
    }) => uploadDocument(projectId, params.file, params.metadata),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', projectId] }),
  });
}

export function useDeleteDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => deleteDocument(projectId, docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', projectId] }),
  });
}

export function useReprocessDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => reprocessDocument(projectId, docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', projectId] }),
  });
}
