import { API_BASE_URL } from '@/lib/constants';
import { getAccessToken } from '@/lib/secure-storage';
import type { MediaAsset } from '@/hooks/useMediaCapture';

export interface MediaUpload {
  id: string;
  url: string;
  type: 'photo' | 'video';
  thumbnailUrl: string | null;
  fileName: string;
  fileSize: number | null;
  createdAt: string;
}

// Upload uses multipart form data — can't use the typed api() wrapper
export async function uploadMedia(
  projectId: string,
  logId: string,
  asset: MediaAsset,
): Promise<MediaUpload> {
  const token = await getAccessToken();

  const mimeType = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    name: asset.fileName,
    type: mimeType,
  } as unknown as Blob);
  formData.append('type', asset.type);

  const res = await fetch(
    `${API_BASE_URL}/projects/${projectId}/daily-logs/${logId}/media`,
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

export async function listMedia(
  projectId: string,
  logId: string,
): Promise<MediaUpload[]> {
  const token = await getAccessToken();

  const res = await fetch(
    `${API_BASE_URL}/projects/${projectId}/daily-logs/${logId}/media`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || `Fetch failed: ${res.status}`);
  }

  return res.json();
}
