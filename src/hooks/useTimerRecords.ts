import { useState, useEffect, useCallback } from 'react';
import { appStateStore } from '../lib/storage';
import { TIMER_RECORDS_KEY } from '../types';
import type { TimerRecord } from '../types';

const isTauriAvailable = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const loadRecords = async (): Promise<TimerRecord[]> => {
  try {
    if (isTauriAvailable()) {
      const stored = await appStateStore.get<TimerRecord[]>(TIMER_RECORDS_KEY);
      return stored ?? [];
    } else {
      const raw = localStorage.getItem(TIMER_RECORDS_KEY);
      return raw ? (JSON.parse(raw) as TimerRecord[]) : [];
    }
  } catch {
    return [];
  }
};

const saveRecords = async (records: TimerRecord[]): Promise<void> => {
  try {
    if (isTauriAvailable()) {
      await appStateStore.set(TIMER_RECORDS_KEY, records);
      await appStateStore.save();
    } else {
      localStorage.setItem(TIMER_RECORDS_KEY, JSON.stringify(records));
    }
  } catch {
    // ignore save errors
  }
};

/** 返回今天零点的时间戳（毫秒） */
function getTodayStart(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export function useTimerRecords() {
  const [records, setRecords] = useState<TimerRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 加载时自动清除非今日记录
  useEffect(() => {
    const load = async () => {
      const loaded = await loadRecords();
      const todayStart = getTodayStart();
      const todayEnd = todayStart + 86_400_000;
      const todayOnly = loaded.filter(
        (r) => r.startTime >= todayStart && r.startTime < todayEnd,
      );
      // 如果有旧数据被清除，立即写回存储
      if (todayOnly.length !== loaded.length) {
        void saveRecords(todayOnly);
      }
      setRecords(todayOnly);
      setIsLoaded(true);
    };
    void load();
  }, []);

  const addRecord = useCallback(async (record: TimerRecord) => {
    // Enforce minimum duration
    if (record.duration < 1000) return;

    setRecords((prev) => {
      // 幂等检查：相同 id 已存在则跳过
      if (prev.some((r) => r.id === record.id)) return prev;
      const updated = [...prev, record];
      void saveRecords(updated);
      return updated;
    });
  }, []);

  const getTodayRecords = useCallback((): TimerRecord[] => {
    const todayStart = getTodayStart();
    const todayEnd = todayStart + 86_400_000;
    return records.filter((r) => r.startTime >= todayStart && r.startTime < todayEnd);
  }, [records]);

  return { records, isLoaded, addRecord, getTodayRecords };
}
