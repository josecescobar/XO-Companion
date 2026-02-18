import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDailyLog } from '@/api/endpoints/daily-logs';
import type { CreateDailyLogBody } from '@/api/endpoints/daily-logs';

export function useCreateDailyLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      ...body
    }: {
      projectId: string;
    } & CreateDailyLogBody) => createDailyLog(projectId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['daily-logs', variables.projectId],
      });
    },
  });
}
