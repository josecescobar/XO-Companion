import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reprocessVoiceNote } from '@/api/endpoints/voice';

export function useReprocessVoiceNote() {
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
    }) => reprocessVoiceNote(projectId, logId, noteId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['voice-notes', variables.projectId, variables.logId, variables.noteId],
      });
      queryClient.invalidateQueries({
        queryKey: ['voice-notes', variables.projectId, variables.logId],
      });
    },
  });
}
