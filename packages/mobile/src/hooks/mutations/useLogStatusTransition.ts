import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  submitDailyLog,
  approveDailyLog,
  amendDailyLog,
} from '@/api/endpoints/daily-logs';
import type { DailyLogDetail } from '@/api/endpoints/daily-logs';

type LogAction = 'submit' | 'approve' | 'amend';

const actionFns = {
  submit: submitDailyLog,
  approve: approveDailyLog,
  amend: amendDailyLog,
} as const;

export function useLogStatusTransition(action: LogAction) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, logId }: { projectId: string; logId: string }) =>
      actionFns[action](projectId, logId),
    onSuccess: (updatedLog, variables) => {
      queryClient.setQueryData<DailyLogDetail>(
        ['daily-logs', variables.projectId, variables.logId],
        updatedLog,
      );
      queryClient.invalidateQueries({
        queryKey: ['daily-logs', variables.projectId],
        exact: false,
      });
    },
  });
}
