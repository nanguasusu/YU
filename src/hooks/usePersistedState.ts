import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { loadPersistedState, savePersistedState } from '../lib/storage';
import { buildDateFromInput, formatDateInput, PROGRESS_COLORS } from '../types';
import type { CountdownStyle, TaskItem, ProgressItem } from '../types';

export function usePersistedState() {
  const persisted = loadPersistedState();

  const [targetTitle, setTargetTitle] = useState(persisted.targetTitle);
  const [targetDate, setTargetDate] = useState(buildDateFromInput(persisted.targetDate));
  const [countdownStyle, setCountdownStyle] = useState<CountdownStyle>(persisted.countdownStyle);
  const [widgetOpacity, setWidgetOpacity] = useState(persisted.opacity);
  const [widgetWidth, setWidgetWidth] = useState(persisted.widgetWidth);
  const [tasks, setTasks] = useState<TaskItem[]>(persisted.tasks);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>(persisted.progressItems);
  const [isMuted, setIsMuted] = useState(persisted.muted);
  const [accentColor, setAccentColor] = useState<string>(persisted.accentColor);

  // Persist state on every change
  useEffect(() => {
    savePersistedState({
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
  }, [countdownStyle, isMuted, progressItems, targetDate, targetTitle, tasks, widgetOpacity, accentColor, widgetWidth]);

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
    // task actions
    toggleTask, deleteTask, addTask, clearCompletedTasks,
    // progress actions
    updateProgress, updateProgressTitle, normalizeProgressTitle,
    updateProgressTotal, addProgress, deleteProgress,
  };
}
