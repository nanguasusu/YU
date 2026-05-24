import { useEffect, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  appStateStore,
  invalidatePersistedStateCache,
  loadPersistedState,
  PERSISTED_STATE_KEYS,
  savePersistedStatePatch,
} from '../lib/storage';
import { buildDateFromInput, formatDateInput, PROGRESS_COLORS, DEFAULT_STATE, DEFAULT_TIMER_LABELS } from '../types';
import type { CountdownStyle, MiniTimerFont, TaskItem, ProgressItem, PersistedState, TimerStatus } from '../types';

type UsePersistedStateOptions = {
  trackWindowWidth?: boolean;
  persistMode?: 'main' | 'settings';
};

export function usePersistedState(options: UsePersistedStateOptions = {}) {
  const { trackWindowWidth = true, persistMode = 'main' } = options;
  const [targetTitle, setTargetTitle] = useState(DEFAULT_STATE.targetTitle);
  const [targetDate, setTargetDate] = useState(buildDateFromInput(DEFAULT_STATE.targetDate));
  const [countdownStyle, setCountdownStyle] = useState<CountdownStyle>(DEFAULT_STATE.countdownStyle);
  const [miniTimerFont, setMiniTimerFontState] = useState<MiniTimerFont>(DEFAULT_STATE.miniTimerFont);
  const [widgetOpacity, setWidgetOpacity] = useState(DEFAULT_STATE.opacity);
  const [widgetWidth, setWidgetWidth] = useState(DEFAULT_STATE.widgetWidth);
  const [tasks, setTasks] = useState<TaskItem[]>(DEFAULT_STATE.tasks);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>(DEFAULT_STATE.progressItems);
  const [isMuted, setIsMuted] = useState(DEFAULT_STATE.muted);
  const [accentColor, setAccentColor] = useState<string>(DEFAULT_STATE.accentColor);
  const [activityTag, setActivityTag] = useState(DEFAULT_STATE.activityTag);
  const [timerStatus, setTimerStatus] = useState<TimerStatus>(DEFAULT_STATE.timerStatus);
  const [elapsedMs, setElapsedMs] = useState(DEFAULT_STATE.elapsedMs);
  const [lastStartedAt, setLastStartedAt] = useState<number | null>(DEFAULT_STATE.lastStartedAt);
  const [autostart, setAutostartState] = useState(false);
  const [timerLabels, setTimerLabelsState] = useState<string[]>(DEFAULT_TIMER_LABELS);
  const [isHydrated, setIsHydrated] = useState(false);
  // Debounce timer ref for persisting state
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistSettingsPatch = (patch: Partial<PersistedState>) => {
    if (!isHydrated) return;
    void savePersistedStatePatch(patch);
  };
  const applyPersistedState = (persisted: PersistedState) => {
    setTargetTitle(persisted.targetTitle);
    setTargetDate(buildDateFromInput(persisted.targetDate));
    setCountdownStyle(persisted.countdownStyle);
    setMiniTimerFontState(persisted.miniTimerFont ?? 'mono');
    setWidgetOpacity(persisted.opacity);
    setWidgetWidth(persisted.widgetWidth);
    setTasks(persisted.tasks);
    setProgressItems(persisted.progressItems);
    setIsMuted(persisted.muted);
    setAccentColor(persisted.accentColor);
    setActivityTag(persisted.activityTag);
    setTimerStatus(persisted.timerStatus);
    setElapsedMs(persisted.elapsedMs);
    setLastStartedAt(persisted.lastStartedAt);
    setTimerLabelsState(persisted.timerLabels ?? DEFAULT_TIMER_LABELS);
  };

  useEffect(() => {
    const load = async () => {
      const persisted = await loadPersistedState();
      applyPersistedState(persisted);
      setIsHydrated(true);
    };

    void load();
  }, []);

  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return;

    let unlisten: (() => void) | undefined;

    const setup = async () => {
      try {
        const unlistenCallbacks = await Promise.all(
          PERSISTED_STATE_KEYS.map((key) => appStateStore.onKeyChange(key, async () => {
            invalidatePersistedStateCache();
            const persisted = await loadPersistedState();
            applyPersistedState(persisted);
          })),
        );
        unlisten = () => {
          unlistenCallbacks.forEach((callback) => callback());
        };
      } catch {
        // ignore store events outside Tauri
      }
    };

    void setup();

    return () => {
      unlisten?.();
    };
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
    if (persistMode !== 'main') return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void savePersistedStatePatch({
        targetTitle,
        targetDate: formatDateInput(targetDate),
        widgetWidth,
        tasks,
        progressItems,
        activityTag,
        timerStatus,
        elapsedMs,
        lastStartedAt,
        timerLabels,
        miniTimerFont,
      });
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    activityTag,
    miniTimerFont,
    elapsedMs,
    isHydrated,
    lastStartedAt,
    progressItems,
    targetDate,
    targetTitle,
    tasks,
    timerLabels,
    timerStatus,
    widgetWidth,
    persistMode,
  ]);

  // Listen to Tauri window resize and persist the new width
  useEffect(() => {
    if (!trackWindowWidth) return;

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
  }, [trackWindowWidth]);

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

  const updateMuted = (muted: boolean) => {
    setIsMuted(muted);
    if (persistMode === 'settings') persistSettingsPatch({ muted });
  };

  const updateWidgetOpacity = (opacity: number) => {
    setWidgetOpacity(opacity);
    if (persistMode === 'settings') persistSettingsPatch({ opacity });
  };

  const updateCountdownStyle = (style: CountdownStyle) => {
    setCountdownStyle(style);
    if (persistMode === 'settings') persistSettingsPatch({ countdownStyle: style });
  };

  const updateMiniTimerFont = (font: MiniTimerFont) => {
    setMiniTimerFontState(font);
    if (persistMode === 'settings') persistSettingsPatch({ miniTimerFont: font });
  };

  const updateAccentColor = (color: string) => {
    setAccentColor(color);
    if (persistMode === 'settings') persistSettingsPatch({ accentColor: color });
  };

  const updateTimerLabels = (labels: string[]) => {
    setTimerLabelsState(labels);
    if (persistMode === 'settings') persistSettingsPatch({ timerLabels: labels });
  };

  const selectActivityTag = (tag: string) => {
    setActivityTag(tag);
    if (tag.trim()) {
      setTimerStatus((current) => (current === 'idle' ? 'idle' : current));
    } else {
      setTimerStatus('idle');
      setElapsedMs(0);
      setLastStartedAt(null);
    }
  };

  const startOrResumeTimer = () => {
    if (!activityTag.trim()) return;
    if (timerStatus === 'running') return;
    setTimerStatus('running');
    setLastStartedAt(Date.now());
  };

  const pauseTimer = () => {
    if (timerStatus !== 'running') return;
    const now = Date.now();
    setElapsedMs((current) => current + Math.max(0, now - (lastStartedAt ?? now)));
    setLastStartedAt(null);
    setTimerStatus('paused');
  };

  const toggleTimer = () => {
    if (!activityTag.trim()) return;
    if (timerStatus === 'running') {
      pauseTimer();
      return;
    }
    startOrResumeTimer();
  };

  const resetTimer = () => {
    setElapsedMs(0);
    setLastStartedAt(null);
    setTimerStatus(activityTag.trim() ? 'paused' : 'idle');
  };

  return {
    // state
    targetTitle, setTargetTitle,
    targetDate, setTargetDate,
    countdownStyle, setCountdownStyle: updateCountdownStyle,
    miniTimerFont, setMiniTimerFont: updateMiniTimerFont,
    widgetOpacity, setWidgetOpacity: updateWidgetOpacity,
    widgetWidth,
    tasks,
    progressItems,
    isMuted, setIsMuted: updateMuted,
    accentColor, setAccentColor: updateAccentColor,
    activityTag,
    timerStatus,
    elapsedMs,
    lastStartedAt,
    autostart, toggleAutostart,
    timerLabels, setTimerLabels: updateTimerLabels,
    selectActivityTag,
    startOrResumeTimer,
    pauseTimer,
    toggleTimer,
    resetTimer,
    // task actions
    toggleTask, deleteTask, addTask, clearCompletedTasks,
    // progress actions
    updateProgress, updateProgressTitle, normalizeProgressTitle,
    updateProgressTotal, addProgress, deleteProgress,
  };
}
