import { create } from 'zustand';

interface RecordingStore {
  selectedProjectId: string | null;
  selectedLogId: string | null;
  setTarget: (projectId: string, logId: string) => void;
  clearTarget: () => void;
}

export const useRecordingStore = create<RecordingStore>((set) => ({
  selectedProjectId: null,
  selectedLogId: null,
  setTarget: (projectId, logId) =>
    set({ selectedProjectId: projectId, selectedLogId: logId }),
  clearTarget: () => set({ selectedProjectId: null, selectedLogId: null }),
}));
