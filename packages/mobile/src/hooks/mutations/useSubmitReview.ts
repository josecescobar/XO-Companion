import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitReview } from '@/api/endpoints/reviews';

export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      logId,
      ...data
    }: {
      projectId: string;
      logId: string;
      entityId: string;
      entityType: string;
      action: 'APPROVED' | 'REJECTED' | 'MODIFIED';
      newValue?: Record<string, unknown>;
      comment?: string;
    }) => submitReview(projectId, logId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['reviews', 'pending', variables.projectId, variables.logId],
      });
      queryClient.invalidateQueries({
        queryKey: ['daily-logs', variables.projectId, variables.logId],
      });
      queryClient.invalidateQueries({
        queryKey: ['reviews', 'stats', variables.projectId],
      });
    },
  });
}
