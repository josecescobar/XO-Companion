import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadAudio } from '@/api/endpoints/voice';

export function useUploadVoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      logId,
      fileUri,
    }: {
      projectId: string;
      logId: string;
      fileUri: string;
    }) => uploadAudio(projectId, logId, fileUri),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['voice-notes', variables.projectId, variables.logId],
      });
      queryClient.invalidateQueries({
        queryKey: ['daily-logs', variables.projectId, variables.logId],
      });
    },
  });
}
