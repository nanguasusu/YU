import { LazyStore } from '@tauri-apps/plugin-store';
import {
  STORAGE_KEY,
  STORE_FILE,
  PROGRESS_COLORS,
  ACCENT_COLORS,
  DEFAULT_STATE,
  DEFAULT_OPACITY,
  DEFAULT_TIMER_LABELS,
  defaultTasks,
  defaultProgressItems,
  getDefaultTargetDate,
  type PersistedState,
  type TaskItem,
  type ProgressItem,
  type TimerStatus,
} from '../types';

type LegacyPersistedState = Partial<PersistedState> & {
  notifications?: boolean;
  accentColorId?: string;
};

type CorePersistedState = Pick<
  PersistedState,
  'targetTitle' | 'targetDate' | 'countdownStyle' | 'miniTimerFont' | 'muted' | 'opacity' | 'widgetWidth' | 'accentColor'
>;

type TimerRuntimeState = Pick<
  PersistedState,
  'activityTag' | 'timerStatus' | 'elapsedMs' | 'lastStartedAt'
>;

const TASKS_KEY = `${STORAGE_KEY}:tasks`;
const PROGRESS_ITEMS_KEY = `${STORAGE_KEY}:progress-items`;
const TIMER_RUNTIME_KEY = `${STORAGE_KEY}:timer-runtime`;
const TIMER_LABELS_KEY = `${STORAGE_KEY}:timer-labels`;
export const PERSISTED_STATE_KEYS = [
  STORAGE_KEY,
  TASKS_KEY,
  PROGRESS_ITEMS_KEY,
  TIMER_RUNTIME_KEY,
  TIMER_LABELS_KEY,
] as const;

export const appStateStore = new LazyStore(STORE_FILE);
let persistedStateCache: PersistedState | null = null;

const isTauriStoreAvailable = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const getDefaultState = (): PersistedState => ({
  ...DEFAULT_STATE,
  targetDate: getDefaultTargetDate(),
});

const getDefaultCoreState = (): CorePersistedState => {
  const defaults = getDefaultState();
  return {
    targetTitle: defaults.targetTitle,
    targetDate: defaults.targetDate,
    countdownStyle: defaults.countdownStyle,
    miniTimerFont: defaults.miniTimerFont,
    muted: defaults.muted,
    opacity: defaults.opacity,
    widgetWidth: defaults.widgetWidth,
    accentColor: defaults.accentColor,
  };
};

const getDefaultTimerRuntimeState = (): TimerRuntimeState => {
  const defaults = getDefaultState();
  return {
    activityTag: defaults.activityTag,
    timerStatus: defaults.timerStatus,
    elapsedMs: defaults.elapsedMs,
    lastStartedAt: defaults.lastStartedAt,
  };
};

const normalizeTasks = (tasks: unknown): TaskItem[] =>
  Array.isArray(tasks) && tasks.length > 0 ? (tasks as TaskItem[]) : defaultTasks;

const normalizeProgressItems = (progressItems: unknown): ProgressItem[] =>
  Array.isArray(progressItems) && progressItems.length > 0
    ? (progressItems as ProgressItem[]).map((item, index) => ({
        ...item,
        title: item.title?.trim() || `杩涘害 ${index + 1}`,
        current: Math.max(0, Number(item.current) || 0),
        total: Math.max(1, Number(item.total) || 1),
        color: PROGRESS_COLORS.includes(item.color)
          ? item.color
          : PROGRESS_COLORS[index % PROGRESS_COLORS.length],
      }))
    : defaultProgressItems;

const normalizeTimerRuntimeState = (parsed: Partial<TimerRuntimeState> | null | undefined): TimerRuntimeState => {
  const defaults = getDefaultTimerRuntimeState();
  return {
    activityTag: parsed?.activityTag?.trim() || '',
    timerStatus:
      parsed?.timerStatus === 'running' || parsed?.timerStatus === 'paused' || parsed?.timerStatus === 'idle'
        ? parsed.timerStatus
        : defaults.timerStatus,
    elapsedMs: Math.max(0, Number(parsed?.elapsedMs) || 0),
    lastStartedAt:
      typeof parsed?.lastStartedAt === 'number' && Number.isFinite(parsed.lastStartedAt)
        ? parsed.lastStartedAt
        : null,
  };
};

const normalizeTimerLabels = (labels: unknown): string[] =>
  Array.isArray(labels) && labels.length > 0
    ? labels.filter((label): label is string => typeof label === 'string' && label.trim().length > 0)
    : DEFAULT_TIMER_LABELS;

const normalizeCoreState = (parsed: Partial<LegacyPersistedState>): CorePersistedState => {
  const defaults = getDefaultCoreState();
  const resolvedAccent =
    parsed.accentColor ??
    (parsed.accentColorId ? (ACCENT_COLORS[parsed.accentColorId] ?? defaults.accentColor) : defaults.accentColor);

  return {
    targetTitle: parsed.targetTitle?.trim() || defaults.targetTitle,
    targetDate: parsed.targetDate || defaults.targetDate,
    countdownStyle: parsed.countdownStyle || defaults.countdownStyle,
    miniTimerFont: parsed.miniTimerFont ?? defaults.miniTimerFont,
    muted: parsed.muted ?? parsed.notifications ?? defaults.muted,
    opacity: Math.min(100, Math.max(20, Number(parsed.opacity) || DEFAULT_OPACITY)),
    widgetWidth: Math.min(480, Math.max(260, Number(parsed.widgetWidth) || defaults.widgetWidth)),
    accentColor: /^#[0-9a-fA-F]{6}$/.test(resolvedAccent) ? resolvedAccent : defaults.accentColor,
  };
};

const normalizeState = (parsed: LegacyPersistedState): PersistedState => ({
  ...normalizeCoreState(parsed),
  tasks: normalizeTasks(parsed.tasks),
  progressItems: normalizeProgressItems(parsed.progressItems),
  ...normalizeTimerRuntimeState(parsed),
  timerLabels: normalizeTimerLabels(parsed.timerLabels),
});

const loadBrowserItem = <T>(key: string): T | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const saveBrowserItem = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore browser storage failures
  }
};

const removeBrowserItem = (key: string) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore browser storage failures
  }
};

const loadStoreItem = async <T>(key: string): Promise<T | null> => {
  if (!isTauriStoreAvailable()) {
    return loadBrowserItem<T>(key);
  }

  try {
    const stored = await appStateStore.get<T>(key);
    return stored ?? null;
  } catch {
    return null;
  }
};

const saveStoreItem = async (key: string, value: unknown): Promise<void> => {
  if (!isTauriStoreAvailable()) {
    saveBrowserItem(key, value);
    return;
  }

  await appStateStore.set(key, value);
};

const saveStoreItems = async (entries: Array<[string, unknown]>): Promise<void> => {
  if (!isTauriStoreAvailable()) {
    for (const [key, value] of entries) {
      saveBrowserItem(key, value);
    }
    return;
  }

  for (const [key, value] of entries) {
    await appStateStore.set(key, value);
  }
  await appStateStore.save();
};

const removeStoreItem = async (key: string): Promise<void> => {
  if (!isTauriStoreAvailable()) {
    removeBrowserItem(key);
    return;
  }

  await appStateStore.delete(key);
};

const splitPersistedState = (state: PersistedState) => {
  const coreState: CorePersistedState = {
    targetTitle: state.targetTitle,
    targetDate: state.targetDate,
    countdownStyle: state.countdownStyle,
    miniTimerFont: state.miniTimerFont,
    muted: state.muted,
    opacity: state.opacity,
    widgetWidth: state.widgetWidth,
    accentColor: state.accentColor,
  };
  const timerRuntime: TimerRuntimeState = {
    activityTag: state.activityTag,
    timerStatus: state.timerStatus,
    elapsedMs: state.elapsedMs,
    lastStartedAt: state.lastStartedAt,
  };

  return {
    coreState,
    tasks: state.tasks,
    progressItems: state.progressItems,
    timerRuntime,
    timerLabels: state.timerLabels,
  };
};

const loadBrowserFallbackState = (): PersistedState | null => {
  if (typeof window === 'undefined') return null;

  const legacyRaw = loadBrowserItem<LegacyPersistedState>(STORAGE_KEY);
  const tasks = loadBrowserItem<TaskItem[]>(TASKS_KEY);
  const progressItems = loadBrowserItem<ProgressItem[]>(PROGRESS_ITEMS_KEY);
  const timerRuntime = loadBrowserItem<TimerRuntimeState>(TIMER_RUNTIME_KEY);
  const timerLabels = loadBrowserItem<string[]>(TIMER_LABELS_KEY);

  if (!legacyRaw && !tasks && !progressItems && !timerRuntime && !timerLabels) {
    return null;
  }

  const legacyNormalized = legacyRaw ? normalizeState(legacyRaw) : getDefaultState();
  return {
    ...legacyNormalized,
    tasks: normalizeTasks(tasks ?? legacyNormalized.tasks),
    progressItems: normalizeProgressItems(progressItems ?? legacyNormalized.progressItems),
    ...normalizeTimerRuntimeState(timerRuntime ?? legacyNormalized),
    timerLabels: normalizeTimerLabels(timerLabels ?? legacyNormalized.timerLabels),
  };
};

const migrateLegacyState = async (legacyState: LegacyPersistedState): Promise<PersistedState> => {
  const normalized = normalizeState(legacyState);
  await savePersistedState(normalized);
  return normalized;
};

const migrateLocalStorageState = async (): Promise<PersistedState | null> => {
  const legacy = loadBrowserItem<LegacyPersistedState>(STORAGE_KEY);
  if (!legacy) return null;

  const normalized = await migrateLegacyState(legacy);
  removeBrowserItem(STORAGE_KEY);
  return normalized;
};

export const invalidatePersistedStateCache = () => {
  persistedStateCache = null;
};

export const loadPersistedState = async (): Promise<PersistedState> => {
  if (persistedStateCache) {
    return persistedStateCache;
  }

  if (!isTauriStoreAvailable()) {
    const state = loadBrowserFallbackState() ?? getDefaultState();
    persistedStateCache = state;
    return state;
  }

  try {
    const [
      legacyStored,
      tasksStored,
      progressItemsStored,
      timerRuntimeStored,
      timerLabelsStored,
    ] = await Promise.all([
      loadStoreItem<LegacyPersistedState>(STORAGE_KEY),
      loadStoreItem<TaskItem[]>(TASKS_KEY),
      loadStoreItem<ProgressItem[]>(PROGRESS_ITEMS_KEY),
      loadStoreItem<TimerRuntimeState>(TIMER_RUNTIME_KEY),
      loadStoreItem<string[]>(TIMER_LABELS_KEY),
    ]);

    const hasSplitState = tasksStored || progressItemsStored || timerRuntimeStored || timerLabelsStored;
    if (hasSplitState || legacyStored) {
      const legacyNormalized = legacyStored ? normalizeState(legacyStored) : getDefaultState();
      const state: PersistedState = {
        ...legacyNormalized,
        tasks: normalizeTasks(tasksStored ?? legacyNormalized.tasks),
        progressItems: normalizeProgressItems(progressItemsStored ?? legacyNormalized.progressItems),
        ...normalizeTimerRuntimeState(timerRuntimeStored ?? legacyNormalized),
        timerLabels: normalizeTimerLabels(timerLabelsStored ?? legacyNormalized.timerLabels),
      };
      persistedStateCache = state;
      return state;
    }

    const migrated = await migrateLocalStorageState();
    if (migrated) {
      persistedStateCache = migrated;
      return migrated;
    }
  } catch {
    const migrated = await migrateLocalStorageState();
    if (migrated) {
      persistedStateCache = migrated;
      return migrated;
    }
  }

  const fallback = getDefaultState();
  persistedStateCache = fallback;
  return fallback;
};

export const savePersistedState = async (state: PersistedState): Promise<void> => {
  persistedStateCache = state;
  const { coreState, tasks, progressItems, timerRuntime, timerLabels } = splitPersistedState(state);

  await saveStoreItems([
    [STORAGE_KEY, coreState],
    [TASKS_KEY, tasks],
    [PROGRESS_ITEMS_KEY, progressItems],
    [TIMER_RUNTIME_KEY, timerRuntime],
    [TIMER_LABELS_KEY, timerLabels],
  ]);
};

export const mergePersistedState = async (
  patch: Partial<PersistedState>,
): Promise<PersistedState> => {
  const baseState = persistedStateCache ?? (await loadPersistedState());
  const nextState = {
    ...baseState,
    ...patch,
  };

  await savePersistedState(nextState);
  return nextState;
};

export const savePersistedStatePatch = async (
  patch: Partial<PersistedState>,
): Promise<PersistedState> => {
  const baseState = persistedStateCache ?? (await loadPersistedState());
  const nextState = {
    ...baseState,
    ...patch,
  };

  persistedStateCache = nextState;
  const writes: Array<[string, unknown]> = [];

  if (
    patch.targetTitle !== undefined ||
    patch.targetDate !== undefined ||
    patch.countdownStyle !== undefined ||
    patch.miniTimerFont !== undefined ||
    patch.muted !== undefined ||
    patch.opacity !== undefined ||
    patch.widgetWidth !== undefined ||
    patch.accentColor !== undefined
  ) {
    writes.push([STORAGE_KEY, splitPersistedState(nextState).coreState]);
  }

  if (patch.tasks !== undefined) {
    writes.push([TASKS_KEY, nextState.tasks]);
  }

  if (patch.progressItems !== undefined) {
    writes.push([PROGRESS_ITEMS_KEY, nextState.progressItems]);
  }

  if (
    patch.activityTag !== undefined ||
    patch.timerStatus !== undefined ||
    patch.elapsedMs !== undefined ||
    patch.lastStartedAt !== undefined
  ) {
    writes.push([TIMER_RUNTIME_KEY, splitPersistedState(nextState).timerRuntime]);
  }

  if (patch.timerLabels !== undefined) {
    writes.push([TIMER_LABELS_KEY, nextState.timerLabels]);
  }

  if (writes.length > 0) {
    await saveStoreItems(writes);
  }

  return nextState;
};

export const clearLegacyPersistedState = async (): Promise<void> => {
  invalidatePersistedStateCache();
  await removeStoreItem(STORAGE_KEY);
};
