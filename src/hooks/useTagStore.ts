import { useState, useEffect, useCallback } from 'react';
import { loadTagStore, saveTagStore, addDurationToTag } from '../lib/tag-storage';
import { ACTIVITY_TAG_OPTIONS } from '../types';
import type { CustomTag, TagStoreData } from '../types';

const MAX_CUSTOM_TAGS = 50;
const MAX_TAG_NAME_LENGTH = 10;
const VISIBLE_CUSTOM_TAGS = 10;

export function useTagStore() {
  const [tagStore, setTagStore] = useState<TagStoreData>({
    customTags: [],
    tagRecords: [],
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // 初始化加载
  useEffect(() => {
    const load = async () => {
      const data = await loadTagStore();
      setTagStore(data);
      setIsLoaded(true);
    };
    void load();
  }, []);

  // 创建自定义标签
  const createTag = useCallback(
    async (name: string): Promise<{ success: boolean; error?: string }> => {
      const trimmed = name.trim().slice(0, MAX_TAG_NAME_LENGTH);
      if (!trimmed) return { success: false, error: 'empty' };

      // 检查是否与预设标签或已有自定义标签重复（区分大小写）
      const allExisting = [
        ...ACTIVITY_TAG_OPTIONS,
        ...tagStore.customTags.map((t) => t.name),
      ];
      if (allExisting.includes(trimmed)) {
        return { success: true }; // 直接选中已有标签
      }

      if (tagStore.customTags.length >= MAX_CUSTOM_TAGS) {
        return { success: false, error: 'limit_reached' };
      }

      const newTag: CustomTag = {
        id: Date.now(),
        name: trimmed,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
      };

      const updated: TagStoreData = {
        ...tagStore,
        customTags: [...tagStore.customTags, newTag],
      };

      try {
        await saveTagStore(updated);
        setTagStore(updated);
        return { success: true };
      } catch {
        return { success: false, error: 'save_failed' };
      }
    },
    [tagStore],
  );

  // 删除自定义标签
  const deleteTag = useCallback(
    async (tagId: number): Promise<{ success: boolean; error?: string }> => {
      const updated: TagStoreData = {
        ...tagStore,
        customTags: tagStore.customTags.filter((t) => t.id !== tagId),
      };

      try {
        await saveTagStore(updated);
        setTagStore(updated);
        return { success: true };
      } catch {
        return { success: false, error: 'delete_failed' };
      }
    },
    [tagStore],
  );

  // 更新标签使用时间（排序用）
  const touchTag = useCallback(
    async (tagName: string) => {
      const updated: TagStoreData = {
        ...tagStore,
        customTags: tagStore.customTags.map((t) =>
          t.name === tagName ? { ...t, lastUsedAt: Date.now() } : t,
        ),
      };
      setTagStore(updated);
      await saveTagStore(updated);
    },
    [tagStore],
  );

  // 记录计时时长
  const recordDuration = useCallback(
    async (
      tagName: string,
      durationMs: number,
    ): Promise<{ success: boolean; error?: string }> => {
      if (durationMs < 1000) return { success: true }; // 不足1秒，丢弃

      try {
        const updated = await addDurationToTag(tagName, durationMs);
        setTagStore(updated);
        return { success: true };
      } catch {
        return { success: false, error: 'record_failed' };
      }
    },
    [],
  );

  // 获取标签累计时长
  const getTagDuration = useCallback(
    (tagName: string): number => {
      const record = tagStore.tagRecords.find((r) => r.tagName === tagName);
      return record?.totalMs ?? 0;
    },
    [tagStore.tagRecords],
  );

  // 获取排序后的可见自定义标签（按 lastUsedAt 降序取前 10）
  const visibleCustomTags = [...tagStore.customTags]
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
    .slice(0, VISIBLE_CUSTOM_TAGS);

  const hasMoreTags = tagStore.customTags.length > VISIBLE_CUSTOM_TAGS;
  const allCustomTags = [...tagStore.customTags].sort(
    (a, b) => b.lastUsedAt - a.lastUsedAt,
  );
  const isAtLimit = tagStore.customTags.length >= MAX_CUSTOM_TAGS;

  return {
    customTags: tagStore.customTags,
    tagRecords: tagStore.tagRecords,
    visibleCustomTags,
    allCustomTags,
    hasMoreTags,
    isAtLimit,
    isLoaded,
    createTag,
    deleteTag,
    touchTag,
    recordDuration,
    getTagDuration,
  };
}
