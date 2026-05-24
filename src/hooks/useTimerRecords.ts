import { useState, useEffect, useCallback } from 'react';
import { appStateStore } from '../lib/storage';
import { TIMER_RECORDS_KEY } from '../types';
import type { TimerRecord } from '../types';

const MAX_RECORDS_PER_DAY = 500;

const isTauriAvailable = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const loadRecords = async (): Promise<TimerRecord[]> => {
  try {
    if (isTauriAvailable()) {
      const stored = await appStateStore.get<TimerRecord[]>(TIMER_RECORDS_KEY);
      return stored ?? [];
    }

    const raw = localStorage.getItem(TIMER_RECORDS_KEY);
    return raw ? (JSON.parse(raw) as TimerRecord[]) : [];
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

function getTodayStart(now = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function getTodayWindow(now = new Date()) {
  const start = getTodayStart(now);
  return {
    start,
    end: start + 86_400_000,
  };
}

export function normalizeTodayRecords(
  records: TimerRecord[],
  now = new Date(),
): TimerRecord[] {
  const { start, end } = getTodayWindow(now);
  return records
    .filter((record) => record.startTime >= start && record.startTime < end)
    .sort((a, b) => a.startTime - b.startTime)
    .slice(-MAX_RECORDS_PER_DAY);
}

export function applyAddRecord(prev: TimerRecord[], record: TimerRecord, now = new Date()): TimerRecord[] {
  if (record.duration < 1000) return prev;

  const normalized = normalizeTodayRecords(prev, now);
  if (normalized.some((item) => item.id === record.id)) return normalized;

  return normalizeTodayRecords([...normalized, record], now);
}

export function useTimerRecords() {
  const [records, setRecords] = useState<TimerRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const loaded = await loadRecords();
      const normalized = normalizeTodayRecords(loaded);
      if (normalized.length !== loaded.length) {
        void saveRecords(normalized);
      }
      setRecords(normalized);
      setIsLoaded(true);
    };
    void load();
  }, []);

  const addRecord = useCallback(async (record: TimerRecord) => {
    setRecords((prev) => {
      const updated = applyAddRecord(prev, record);
      if (updated !== prev) {
        void saveRecords(updated);
      }
      return updated;
    });
  }, []);

  return { records, isLoaded, addRecord };
}
