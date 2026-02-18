import { useQuery } from '@tanstack/react-query';
import { getPendingReviews, getReviewHistory, getReviewStats } from '@/api/endpoints/reviews';

export function usePendingReviews(projectId: string, logId: string) {
  return useQuery({
    queryKey: ['reviews', 'pending', projectId, logId],
    queryFn: () => getPendingReviews(projectId, logId),
    enabled: !!projectId && !!logId,
  });
}

export function useReviewHistory(projectId: string, logId: string) {
  return useQuery({
    queryKey: ['reviews', 'history', projectId, logId],
    queryFn: () => getReviewHistory(projectId, logId),
    enabled: !!projectId && !!logId,
  });
}

export function useReviewStats(projectId: string) {
  return useQuery({
    queryKey: ['reviews', 'stats', projectId],
    queryFn: () => getReviewStats(projectId),
    enabled: !!projectId,
  });
}
