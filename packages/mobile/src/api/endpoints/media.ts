import { API_BASE_URL } from '@/lib/constants';
import { getAccessToken } from '@/lib/secure-storage';
import { api } from '../client';

export interface MediaUpload {
  id: string;
  type: 'PHOTO' | 'VIDEO';
  fileName: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  caption: string | null;
  thumbnailPath: string | null;
  createdAt: string;
  uploadedBy: { id: string; firstName: string; lastName: string };
}

export async function uploadMedia(
  projectId: string,
  file: { uri: string; type: string; name: string },
  metadata: {
    type: 'PHOTO' | 'VIDEO';
    dailyLogId?: string;
    incidentId?: string;
    voiceNoteId?: string;
    caption?: string;
  },
): Promise<MediaUpload> {
  const token = await getAccessToken();

  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);
  formData.append('type', metadata.type);
  if (metadata.dailyLogId) formData.append('dailyLogId', metadata.dailyLogId);
  if (metadata.incidentId) formData.append('incidentId', metadata.incidentId);
  if (metadata.voiceNoteId) formData.append('voiceNoteId', metadata.voiceNoteId);
  if (metadata.caption) formData.append('caption', metadata.caption);

  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/media`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || `Upload failed: ${res.status}`);
  }

  return res.json();
}

export function listMedia(
  projectId: string,
  filters?: { dailyLogId?: string; incidentId?: string; type?: string },
): Promise<MediaUpload[]> {
  const params = new URLSearchParams();
  if (filters?.dailyLogId) params.set('dailyLogId', filters.dailyLogId);
  if (filters?.incidentId) params.set('incidentId', filters.incidentId);
  if (filters?.type) params.set('type', filters.type);
  const qs = params.toString();
  return api<MediaUpload[]>(`/projects/${projectId}/media${qs ? `?${qs}` : ''}`);
}

export function deleteMedia(projectId: string, mediaId: string): Promise<void> {
  return api<void>(`/projects/${projectId}/media/${mediaId}`, { method: 'DELETE' });
}

export function getMediaUrl(projectId: string, mediaId: string): string {
  return `${API_BASE_URL}/projects/${projectId}/media/${mediaId}/file`;
}

export function getThumbnailUrl(projectId: string, mediaId: string): string {
  return `${API_BASE_URL}/projects/${projectId}/media/${mediaId}/thumbnail`;
}
