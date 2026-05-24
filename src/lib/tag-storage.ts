import { appStateStore } from './storage';
import type { TagStoreData } from '../types';
import { TAG_STORE_KEY } from '../types';

const isTauriStoreAvailable = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const getDefaultTagStore = (): TagStoreData => ({
  customTags: [],
  tagRecords: [],
});

export const loadTagStore = async (): Promise<TagStoreData> => {
  if (!isTauriStoreAvailable()) {
    try {
      const raw = window.localStorage.getItem(TAG_STORE_KEY);
      return raw ? JSON.parse(raw) : getDefaultTagStore();
    } catch {
      return getDefaultTagStore();
    }
  }

  try {
    const stored = await appStateStore.get<TagStoreData>(TAG_STORE_KEY);
    return stored ?? getDefaultTagStore();
  } catch {
    return getDefaultTagStore();
  }
};

export const saveTagStore = async (data: TagStoreData): Promise<void> => {
  if (!isTauriStoreAvailable()) {
    try {
      window.localStorage.setItem(TAG_STORE_KEY, JSON.stringify(data));
    } catch {
      // ignore browser storage failures
    }
    return;
  }

  await appStateStore.set(TAG_STORE_KEY, data);
  await appStateStore.save();
};

export const updateTagRecordDuration = (
  data: TagStoreData,
  tagName: string,
  durationMs: number,
): TagStoreData => {
  const recordedAt = Date.now();
  const recordIndex = data.tagRecords.findIndex((record) => record.tagName === tagName);

  if (recordIndex === -1) {
    return {
      ...data,
      tagRecords: [
        ...data.tagRecords,
        {
          tagName,
          totalMs: durationMs,
          lastRecordedAt: recordedAt,
        },
      ],
    };
  }

  const nextRecords = [...data.tagRecords];
  const currentRecord = nextRecords[recordIndex];
  nextRecords[recordIndex] = {
    ...currentRecord,
    totalMs: currentRecord.totalMs + durationMs,
    lastRecordedAt: recordedAt,
  };

  return {
    ...data,
    tagRecords: nextRecords,
  };
};
