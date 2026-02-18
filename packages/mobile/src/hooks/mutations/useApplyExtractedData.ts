import { useMutation, useQueryClient } from '@tanstack/react-query';
import { applyExtractedData } from '@/api/endpoints/voice';

export function useApplyExtractedData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      logId,
      noteId,
    }: {
      projectId: string;
      logId: string;
      noteId: string;
    }) => applyExtractedData(projectId, logId, noteId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['voice-notes', variables.projectId, variables.logId, variables.noteId],
      });
      queryClient.invalidateQueries({
        queryKey: ['voice-notes', variables.projectId, variables.logId],
      });
      queryClient.invalidateQueries({
        queryKey: ['daily-logs', variables.projectId, variables.logId],
      });
      queryClient.invalidateQueries({
        queryKey: ['reviews', 'pending', variables.projectId, variables.logId],
      });
    },
  });
}
