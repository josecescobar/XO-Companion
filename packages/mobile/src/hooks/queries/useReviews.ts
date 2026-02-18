import { useQuery } from '@tanstack/react-query';
import { getPendingReviews, getReviewStats } from '@/api/endpoints/reviews';

export function usePendingReviews(projectId: string, logId: string) {
  return useQuery({
    queryKey: ['reviews', 'pending', projectId, logId],
    queryFn: () => getPendingReviews(projectId, logId),
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
