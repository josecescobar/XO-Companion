import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadMedia, deleteMedia } from '@/api/endpoints/media';

export function useUploadMedia(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      file: { uri: string; type: string; name: string };
      metadata: {
        type: 'PHOTO' | 'VIDEO';
        dailyLogId?: string;
        incidentId?: string;
        voiceNoteId?: string;
        caption?: string;
      };
    }) => uploadMedia(projectId, args.file, args.metadata),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media', projectId] });
    },
  });
}

export function useDeleteMedia(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mediaId: string) => deleteMedia(projectId, mediaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media', projectId] });
    },
  });
}
