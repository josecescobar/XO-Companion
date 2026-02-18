import { api } from '../client';
import { API_BASE_URL } from '@/lib/constants';
import { getAccessToken } from '@/lib/secure-storage';

export interface VoiceNote {
  id: string;
  status: string;
  durationSeconds: number | null;
  aiProcessed: boolean;
  processingError: string | null;
  createdAt: string;
}

export interface VoiceNoteDetail {
  id: string;
  dailyLogId: string;
  status: string;
  transcript: string | null;
  extractedData: Record<string, unknown> | null;
  durationSeconds: number | null;
  aiProcessed: boolean;
  processingError: string | null;
  createdAt: string;
}

export interface ExtractedData {
  voiceNoteId: string;
  status: string;
  transcript: string;
  extractedData: Record<string, unknown>;
}

export function listVoiceNotes(
  projectId: string,
  logId: string,
): Promise<VoiceNote[]> {
  return api<VoiceNote[]>(
    `/projects/${projectId}/daily-logs/${logId}/voice`,
  );
}

export function getVoiceNote(
  projectId: string,
  logId: string,
  id: string,
): Promise<VoiceNoteDetail> {
  return api<VoiceNoteDetail>(
    `/projects/${projectId}/daily-logs/${logId}/voice/${id}`,
  );
}

export function getExtractedData(
  projectId: string,
  logId: string,
  id: string,
): Promise<ExtractedData> {
  return api<ExtractedData>(
    `/projects/${projectId}/daily-logs/${logId}/voice/${id}/extracted`,
  );
}

export function applyExtractedData(
  projectId: string,
  logId: string,
  id: string,
): Promise<unknown> {
  return api(`/projects/${projectId}/daily-logs/${logId}/voice/${id}/apply`, {
    method: 'POST',
  });
}

export function reprocessVoiceNote(
  projectId: string,
  logId: string,
  id: string,
): Promise<{ message: string; voiceNoteId: string }> {
  return api(`/projects/${projectId}/daily-logs/${logId}/voice/${id}/reprocess`, {
    method: 'POST',
  });
}

// Upload uses multipart form data — can't use the typed api() wrapper
export async function uploadAudio(
  projectId: string,
  logId: string,
  fileUri: string,
  mimeType: string = 'audio/m4a',
): Promise<VoiceNoteDetail> {
  const token = await getAccessToken();

  const formData = new FormData();
  formData.append('audio', {
    uri: fileUri,
    name: 'recording.m4a',
    type: mimeType,
  } as unknown as Blob);

  const res = await fetch(
    `${API_BASE_URL}/projects/${projectId}/daily-logs/${logId}/voice/upload`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
  );

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || `Upload failed: ${res.status}`);
  }

  return res.json();
}
