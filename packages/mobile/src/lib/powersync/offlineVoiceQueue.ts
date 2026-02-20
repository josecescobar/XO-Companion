import { File, Directory, Paths } from 'expo-file-system';
import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import { getAccessToken } from '@/lib/secure-storage';
import { API_BASE_URL } from '@/lib/constants';

const QUEUE_DIR_NAME = 'offline-voice-queue';

function getQueueDir(): Directory {
  return new Directory(Paths.document, QUEUE_DIR_NAME);
}

export interface QueuedVoiceNote {
  localUri: string;
  projectId: string;
  dailyLogId: string;
  recordedAt: string;
  mimeType: string;
  durationSeconds: number;
}

function ensureQueueDir(): void {
  const dir = getQueueDir();
  if (!dir.exists) {
    dir.create();
  }
}

export async function queueVoiceNote(note: QueuedVoiceNote): Promise<void> {
  ensureQueueDir();

  // Copy the recording to our queue directory
  const fileName = `voice-${Date.now()}.m4a`;
  const sourceFile = new File(note.localUri);
  const destFile = new File(getQueueDir(), fileName);
  sourceFile.copy(destFile);

  // Save metadata
  const metaFile = new File(getQueueDir(), `${fileName}.json`);
  metaFile.write(
    JSON.stringify({
      ...note,
      localUri: destFile.uri,
      queuedAt: new Date().toISOString(),
    }),
  );
}

export async function getQueuedVoiceNotes(): Promise<QueuedVoiceNote[]> {
  ensureQueueDir();

  const dir = getQueueDir();
  const entries = dir.list();
  const metaFiles = entries.filter(
    (entry): entry is File => entry instanceof File && entry.name.endsWith('.json'),
  );

  const notes: QueuedVoiceNote[] = [];
  for (const metaFile of metaFiles) {
    const content = await metaFile.text();
    notes.push(JSON.parse(content));
  }

  return notes.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
}

export async function uploadQueuedVoiceNote(note: QueuedVoiceNote): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  try {
    const uploadUrl = `${API_BASE_URL}/projects/${note.projectId}/daily-logs/${note.dailyLogId}/voice`;

    const uploadResult = await uploadAsync(uploadUrl, note.localUri, {
      httpMethod: 'POST',
      uploadType: FileSystemUploadType.MULTIPART,
      fieldName: 'audio',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (uploadResult.status >= 200 && uploadResult.status < 300) {
      // Clean up local files
      const audioFile = new File(note.localUri);
      const metaFile = new File(`${note.localUri}.json`);
      if (audioFile.exists) audioFile.delete();
      if (metaFile.exists) metaFile.delete();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to upload queued voice note:', error);
    return false;
  }
}

export async function processVoiceQueue(): Promise<{ uploaded: number; failed: number }> {
  const notes = await getQueuedVoiceNotes();
  let uploaded = 0;
  let failed = 0;

  for (const note of notes) {
    const success = await uploadQueuedVoiceNote(note);
    if (success) {
      uploaded++;
    } else {
      failed++;
    }
  }

  return { uploaded, failed };
}
