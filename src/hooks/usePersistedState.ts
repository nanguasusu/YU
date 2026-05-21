import { useEffect, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { loadPersistedState, savePersistedState } from '../lib/storage';
import { buildDateFromInput, formatDateInput, PROGRESS_COLORS, DEFAULT_STATE } from '../types';
import type { CountdownStyle, TaskItem, ProgressItem } from '../types';

export function usePersistedState() {
  const [targetTitle, setTargetTitle] = useState(DEFAULT_STATE.targetTitle);
  const [targetDate, setTargetDate] = useState(buildDateFromInput(DEFAULT_STATE.targetDate));
  const [countdownStyle, setCountdownStyle] = useState<CountdownStyle>(DEFAULT_STATE.countdownStyle);
  const [widgetOpacity, setWidgetOpacity] = useState(DEFAULT_STATE.opacity);
  const [widgetWidth, setWidgetWidth] = useState(DEFAULT_STATE.widgetWidth);
  const [tasks, setTasks] = useState<TaskItem[]>(DEFAULT_STATE.tasks);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>(DEFAULT_STATE.progressItems);
  const [isMuted, setIsMuted] = useState(DEFAULT_STATE.muted);
  const [accentColor, setAccentColor] = useState<string>(DEFAULT_STATE.accentColor);
  const [autostart, setAutostartState] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  // Debounce timer ref for persisting state
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      const persisted = await loadPersistedState();
      setTargetTitle(persisted.targetTitle);
      setTargetDate(buildDateFromInput(persisted.targetDate));
      setCountdownStyle(persisted.countdownStyle);
      setWidgetOpacity(persisted.opacity);
      setWidgetWidth(persisted.widgetWidth);
      setTasks(persisted.tasks);
      setProgressItems(persisted.progressItems);
      setIsMuted(persisted.muted);
      setAccentColor(persisted.accentColor);
      setIsHydrated(true);
    };

    void load();
  }, []);

  // Load autostart state on mount
  useEffect(() => {
    const load = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const enabled = await invoke<boolean>('get_autostart');
        setAutostartState(enabled);
      } catch { /* non-Tauri */ }
    };
    void load();
  }, []);

  // Persist state on every change — debounced 500 ms to avoid hammering disk
  useEffect(() => {
    if (!isHydrated) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void savePersistedState({
        targetTitle,
        targetDate: formatDateInput(targetDate),
        countdownStyle,
        muted: isMuted,
        opacity: widgetOpacity,
        widgetWidth,
        tasks,
        progressItems,
        accentColor,
      });
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [accentColor, countdownStyle, isHydrated, isMuted, progressItems, targetDate, targetTitle, tasks, widgetOpacity, widgetWidth]);

  // Listen to Tauri window resize and persist the new width
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setup = async () => {
      try {
        const win = getCurrentWindow();
        unlisten = await win.onResized(async () => {
          try {
            const size = await win.innerSize();
            const factor = await win.scaleFactor();
            const logicalW = Math.round(size.width / factor);
            setWidgetWidth(Math.min(480, Math.max(260, logicalW)));
          } catch { /* ignore */ }
        });
      } catch { /* non-Tauri env */ }
    };
    void setup();
    return () => { unlisten?.(); };
  }, []);

  // ── Progress helpers ──────────────────────────────────────────────────────

  const updateProgress = (id: number, delta: number) => {
    setProgressItems((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, current: Math.max(0, Math.min(item.total, item.current + delta)) }
          : item,
      ),
    );
  };

  const updateProgressTitle = (id: number, title: string) => {
    setProgressItems((items) =>
      items.map((item) => (item.id === id ? { ...item, title } : item)),
    );
  };

  const normalizeProgressTitle = (id: number, title: string) => {
    const trimmed = title.trim();
    setProgressItems((items) =>
      items.map((item, index) =>
        item.id === id ? { ...item, title: trimmed || `进度 ${index + 1}` } : item,
      ),
    );
  };

  const updateProgressTotal = (id: number, totalStr: string) => {
    const parsedTotal = Number(totalStr);
    const safeTotal = Number.isFinite(parsedTotal) ? Math.max(1, Math.floor(parsedTotal)) : 1;
    setProgressItems((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, total: safeTotal, current: Math.min(item.current, safeTotal) }
          : item,
      ),
    );
  };

  const addProgress = () => {
    setProgressItems((items) => [
      ...items,
      {
        id: Date.now(),
        title: `新进度 ${items.length + 1}`,
        current: 0,
        total: 100,
        color: PROGRESS_COLORS[items.length % PROGRESS_COLORS.length],
      },
    ]);
  };

  const deleteProgress = (id: number) => {
    setProgressItems((items) => items.filter((item) => item.id !== id));
  };

  // ── Task helpers ──────────────────────────────────────────────────────────

  const toggleTask = (id: number, onSound: (completed: boolean) => void) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id !== id) return task;
        onSound(task.completed);
        return { ...task, completed: !task.completed };
      }),
    );
  };

  const deleteTask = (id: number) => {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));
  };

  const addTask = (text: string, tag: string) => {
    setTasks((currentTasks) => [
      ...currentTasks,
      { id: Date.now(), text, tag, completed: false },
    ]);
  };

  const clearCompletedTasks = () => {
    setTasks((currentTasks) => currentTasks.filter((task) => !task.completed));
  };

  // ── Autostart ─────────────────────────────────────────────────────────────

  const toggleAutostart = async (enabled: boolean) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('set_autostart', { enabled });
      setAutostartState(enabled);
    } catch { /* non-Tauri */ }
  };

  return {
    // state
    targetTitle, setTargetTitle,
    targetDate, setTargetDate,
    countdownStyle, setCountdownStyle,
    widgetOpacity, setWidgetOpacity,
    widgetWidth,
    tasks,
    progressItems,
    isMuted, setIsMuted,
    accentColor, setAccentColor,
    autostart, toggleAutostart,
    // task actions
    toggleTask, deleteTask, addTask, clearCompletedTasks,
    // progress actions
    updateProgress, updateProgressTitle, normalizeProgressTitle,
    updateProgressTotal, addProgress, deleteProgress,
  };
}
