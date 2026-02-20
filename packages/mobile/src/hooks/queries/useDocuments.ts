import { useQuery } from '@tanstack/react-query';
import { listDocuments, getDocument } from '@/api/endpoints/documents';

export function useProjectDocuments(
  projectId: string,
  filters?: { category?: string; status?: string },
) {
  return useQuery({
    queryKey: ['documents', projectId, filters],
    queryFn: () => listDocuments(projectId, filters),
    enabled: !!projectId,
  });
}

export function useDocument(projectId: string, docId: string) {
  return useQuery({
    queryKey: ['documents', projectId, docId],
    queryFn: () => getDocument(projectId, docId),
    enabled: !!projectId && !!docId,
  });
}
