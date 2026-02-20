import { API_BASE_URL } from '@/lib/constants';
import { getAccessToken } from '@/lib/secure-storage';
import { api } from '../client';

export interface ProjectDocument {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  pageCount: number | null;
  category: DocumentCategory;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  chunksCreated: number;
  embedded: boolean;
  processingError: string | null;
  processedAt: string | null;
  createdAt: string;
  uploadedBy: { id: string; firstName: string; lastName: string };
}

export type DocumentCategory =
  | 'DRAWING'
  | 'SPECIFICATION'
  | 'SAFETY_MANUAL'
  | 'CONTRACT'
  | 'SUBMITTAL'
  | 'RFI'
  | 'CHANGE_ORDER'
  | 'PERMIT'
  | 'INSPECTION_REPORT'
  | 'MEETING_MINUTES'
  | 'SCHEDULE'
  | 'OTHER';

export async function uploadDocument(
  projectId: string,
  file: { uri: string; type: string; name: string },
  metadata: { title: string; category: DocumentCategory; description?: string },
): Promise<ProjectDocument> {
  const token = await getAccessToken();

  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);
  formData.append('title', metadata.title);
  formData.append('category', metadata.category);
  if (metadata.description) formData.append('description', metadata.description);

  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || `Upload failed: ${res.status}`);
  }

  return res.json();
}

export function listDocuments(
  projectId: string,
  filters?: { category?: string; status?: string },
): Promise<ProjectDocument[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.status) params.set('status', filters.status);
  const qs = params.toString();
  return api<ProjectDocument[]>(
    `/projects/${projectId}/documents${qs ? `?${qs}` : ''}`,
  );
}

export function getDocument(
  projectId: string,
  docId: string,
): Promise<ProjectDocument> {
  return api<ProjectDocument>(`/projects/${projectId}/documents/${docId}`);
}

export function deleteDocument(
  projectId: string,
  docId: string,
): Promise<void> {
  return api<void>(`/projects/${projectId}/documents/${docId}`, {
    method: 'DELETE',
  });
}

export function reprocessDocument(
  projectId: string,
  docId: string,
): Promise<void> {
  return api<void>(`/projects/${projectId}/documents/${docId}/reprocess`, {
    method: 'POST',
  });
}
