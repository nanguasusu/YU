import { appStateStore } from './storage';
import type { TagStoreData } from '../types';
import { TAG_STORE_KEY } from '../types';

const isTauriStoreAvailable = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const getDefaultTagStore = (): TagStoreData => ({
  customTags: [],
  tagRecords: [],
});

/** 加载标签存储 */
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

/** 保存标签存储 */
export const saveTagStore = async (data: TagStoreData): Promise<void> => {
  if (!isTauriStoreAvailable()) {
    try {
      window.localStorage.setItem(TAG_STORE_KEY, JSON.stringify(data));
    } catch { /* ignore browser storage failures */ }
    return;
  }

  await appStateStore.set(TAG_STORE_KEY, data);
  await appStateStore.save();
};

/** 添加计时记录到指定标签 */
export const addDurationToTag = async (
  tagName: string,
  durationMs: number,
): Promise<TagStoreData> => {
  const store = await loadTagStore();
  const existingRecord = store.tagRecords.find((r) => r.tagName === tagName);

  if (existingRecord) {
    existingRecord.totalMs += durationMs;
    existingRecord.lastRecordedAt = Date.now();
  } else {
    store.tagRecords.push({
      tagName,
      totalMs: durationMs,
      lastRecordedAt: Date.now(),
    });
  }

  await saveTagStore(store);
  return store;
};
