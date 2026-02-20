import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createCommunication, updateCommunication, approveCommunication,
  sendCommunication, cancelCommunication, redraftCommunication, deleteCommunication,
} from '@/api/endpoints/communications';
import type { CommunicationType, CommunicationUrgency } from '@/api/endpoints/communications';

export function useCreateCommunication(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      type: CommunicationType; recipient: string; subject: string;
      recipientEmail?: string; recipientPhone?: string;
      urgency?: CommunicationUrgency; context?: string; dailyLogId?: string;
    }) => createCommunication(projectId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communications', projectId] }),
  });
}

export function useUpdateCommunication(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { commId: string; body: { recipient?: string; recipientEmail?: string; subject?: string; editedBody?: string; urgency?: CommunicationUrgency } }) =>
      updateCommunication(projectId, params.commId, params.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communications', projectId] }),
  });
}

export function useApproveCommunication(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commId: string) => approveCommunication(projectId, commId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communications', projectId] }),
  });
}

export function useSendCommunication(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commId: string) => sendCommunication(projectId, commId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communications', projectId] }),
  });
}

export function useCancelCommunication(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commId: string) => cancelCommunication(projectId, commId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communications', projectId] }),
  });
}

export function useRedraftCommunication(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commId: string) => redraftCommunication(projectId, commId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communications', projectId] }),
  });
}

export function useDeleteCommunication(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commId: string) => deleteCommunication(projectId, commId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communications', projectId] }),
  });
}
