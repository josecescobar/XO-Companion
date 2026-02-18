import { useQuery } from '@tanstack/react-query';
import { listVoiceNotes, getVoiceNote } from '@/api/endpoints/voice';

export function useVoiceNotes(projectId: string, logId: string, polling = false) {
  return useQuery({
    queryKey: ['voice-notes', projectId, logId],
    queryFn: () => listVoiceNotes(projectId, logId),
    enabled: !!projectId && !!logId,
    refetchInterval: polling ? 5000 : false,
  });
}

export function useVoiceNote(
  projectId: string,
  logId: string,
  id: string,
  polling = false,
) {
  return useQuery({
    queryKey: ['voice-notes', projectId, logId, id],
    queryFn: () => getVoiceNote(projectId, logId, id),
    enabled: !!projectId && !!logId && !!id,
    refetchInterval: polling
      ? (query) => {
          const status = query.state.data?.status;
          return status === 'TRANSCRIBING' || status === 'EXTRACTING'
            ? 5000
            : false;
        }
      : false,
  });
}
