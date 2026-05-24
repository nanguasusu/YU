import { useState, useEffect, useCallback, useMemo } from 'react';
import { loadTagStore, saveTagStore, updateTagRecordDuration } from '../lib/tag-storage';
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

  useEffect(() => {
    const load = async () => {
      const data = await loadTagStore();
      setTagStore(data);
      setIsLoaded(true);
    };
    void load();
  }, []);

  const customTagNames = useMemo(
    () => new Set(tagStore.customTags.map((tag) => tag.name)),
    [tagStore.customTags],
  );

  const allExistingNames = useMemo(
    () => new Set([...ACTIVITY_TAG_OPTIONS, ...tagStore.customTags.map((tag) => tag.name)]),
    [tagStore.customTags],
  );

  const tagDurationMap = useMemo(
    () => new Map(tagStore.tagRecords.map((record) => [record.tagName, record.totalMs] as const)),
    [tagStore.tagRecords],
  );

  const sortedCustomTags = useMemo(
    () => [...tagStore.customTags].sort((a, b) => b.lastUsedAt - a.lastUsedAt),
    [tagStore.customTags],
  );

  const createTag = useCallback(
    async (name: string): Promise<{ success: boolean; error?: string }> => {
      const trimmed = name.trim().slice(0, MAX_TAG_NAME_LENGTH);
      if (!trimmed) return { success: false, error: 'empty' };

      if (allExistingNames.has(trimmed)) {
        return { success: true };
      }

      if (tagStore.customTags.length >= MAX_CUSTOM_TAGS) {
        return { success: false, error: 'limit_reached' };
      }

      const now = Date.now();
      const newTag: CustomTag = {
        id: now,
        name: trimmed,
        createdAt: now,
        lastUsedAt: now,
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
    [allExistingNames, tagStore],
  );

  const deleteTag = useCallback(
    async (tagId: number): Promise<{ success: boolean; error?: string }> => {
      const updated: TagStoreData = {
        ...tagStore,
        customTags: tagStore.customTags.filter((tag) => tag.id !== tagId),
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

  const touchTag = useCallback(
    async (tagName: string) => {
      if (!customTagNames.has(tagName)) return;

      const touchedAt = Date.now();
      const updated: TagStoreData = {
        ...tagStore,
        customTags: tagStore.customTags.map((tag) =>
          tag.name === tagName ? { ...tag, lastUsedAt: touchedAt } : tag,
        ),
      };
      setTagStore(updated);
      await saveTagStore(updated);
    },
    [customTagNames, tagStore],
  );

  const recordDuration = useCallback(
    async (
      tagName: string,
      durationMs: number,
    ): Promise<{ success: boolean; error?: string }> => {
      if (durationMs < 1000) return { success: true };

      try {
        const updated = updateTagRecordDuration(tagStore, tagName, durationMs);
        setTagStore(updated);
        await saveTagStore(updated);
        return { success: true };
      } catch {
        return { success: false, error: 'record_failed' };
      }
    },
    [tagStore],
  );

  const getTagDuration = useCallback(
    (tagName: string): number => tagDurationMap.get(tagName) ?? 0,
    [tagDurationMap],
  );

  const visibleCustomTags = useMemo(
    () => sortedCustomTags.slice(0, VISIBLE_CUSTOM_TAGS),
    [sortedCustomTags],
  );
  const hasMoreTags = sortedCustomTags.length > VISIBLE_CUSTOM_TAGS;
  const allCustomTags = sortedCustomTags;
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
