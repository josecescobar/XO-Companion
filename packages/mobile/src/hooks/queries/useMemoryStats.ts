import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

export interface MemoryStats {
  projectId: string;
  totalChunks: number;
  embeddedChunks: number;
  unembeddedChunks: number;
  embeddingAvailable: boolean;
  bySourceType: Array<{ sourceType: string; count: number }>;
  dateRange: { earliest: string | null; latest: string | null };
}

export function useMemoryStats(projectId: string) {
  return useQuery({
    queryKey: ['memory', 'stats', projectId],
    queryFn: () => api<MemoryStats>(`/projects/${projectId}/memory/stats`),
    enabled: !!projectId,
  });
}
