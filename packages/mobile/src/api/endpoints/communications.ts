import { api } from '../client';

export type CommunicationType = 'EMAIL' | 'TEXT' | 'CALL' | 'RFI' | 'CHANGE_ORDER';
export type CommunicationStatus = 'DRAFTING' | 'DRAFT' | 'APPROVED' | 'SENT' | 'CANCELLED';
export type CommunicationUrgency = 'LOW' | 'NORMAL' | 'HIGH';

export interface CommunicationDetail {
  id: string;
  projectId: string;
  type: CommunicationType;
  status: CommunicationStatus;
  urgency: CommunicationUrgency;
  recipient: string;
  recipientEmail: string | null;
  recipientPhone: string | null;
  subject: string;
  body: string | null;
  context: string | null;
  editedBody: string | null;
  aiGenerated: boolean;
  aiConfidence: number | null;
  aiDraftedAt: string | null;
  processingError: string | null;
  tokensUsed: number | null;
  approvedBy: { id: string; firstName: string; lastName: string } | null;
  approvedAt: string | null;
  sentAt: string | null;
  createdBy: { id: string; firstName: string; lastName: string };
  createdAt: string;
  dailyLogId: string | null;
  voiceNoteId: string | null;
}

export interface CommunicationSummary {
  drafting: number;
  draft: number;
  approved: number;
  sent: number;
  total: number;
}

export async function createCommunication(
  projectId: string,
  data: {
    type: CommunicationType;
    recipient: string;
    recipientEmail?: string;
    recipientPhone?: string;
    subject: string;
    urgency?: CommunicationUrgency;
    context?: string;
    dailyLogId?: string;
  },
): Promise<CommunicationDetail> {
  return api<CommunicationDetail>(`/projects/${projectId}/communications`, {
    method: 'POST',
    body: data,
  });
}

export async function listCommunications(
  projectId: string,
  filters?: { type?: string; status?: string; urgency?: string },
): Promise<CommunicationDetail[]> {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.urgency) params.append('urgency', filters.urgency);
  const qs = params.toString();
  return api<CommunicationDetail[]>(`/projects/${projectId}/communications${qs ? `?${qs}` : ''}`);
}

export async function getCommunication(projectId: string, commId: string): Promise<CommunicationDetail> {
  return api<CommunicationDetail>(`/projects/${projectId}/communications/${commId}`);
}

export async function getCommunicationSummary(projectId: string): Promise<CommunicationSummary> {
  return api<CommunicationSummary>(`/projects/${projectId}/communications/summary`);
}

export async function updateCommunication(
  projectId: string,
  commId: string,
  data: { recipient?: string; recipientEmail?: string; recipientPhone?: string; subject?: string; editedBody?: string; urgency?: CommunicationUrgency },
): Promise<CommunicationDetail> {
  return api<CommunicationDetail>(`/projects/${projectId}/communications/${commId}`, {
    method: 'PATCH',
    body: data,
  });
}

export async function approveCommunication(projectId: string, commId: string): Promise<CommunicationDetail> {
  return api<CommunicationDetail>(`/projects/${projectId}/communications/${commId}/approve`, { method: 'POST' });
}

export async function sendCommunication(projectId: string, commId: string): Promise<CommunicationDetail> {
  return api<CommunicationDetail>(`/projects/${projectId}/communications/${commId}/send`, { method: 'POST' });
}

export async function cancelCommunication(projectId: string, commId: string): Promise<CommunicationDetail> {
  return api<CommunicationDetail>(`/projects/${projectId}/communications/${commId}/cancel`, { method: 'POST' });
}

export async function redraftCommunication(projectId: string, commId: string): Promise<CommunicationDetail> {
  return api<CommunicationDetail>(`/projects/${projectId}/communications/${commId}/redraft`, { method: 'POST' });
}

export async function deleteCommunication(projectId: string, commId: string): Promise<void> {
  return api<void>(`/projects/${projectId}/communications/${commId}`, { method: 'DELETE' });
}
