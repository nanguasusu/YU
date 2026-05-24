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
} from '../types';

type LegacyPersistedState = Partial<PersistedState> & {
  notifications?: boolean;
  accentColorId?: string;
};

export const appStateStore = new LazyStore(STORE_FILE);

const isTauriStoreAvailable = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const loadBrowserFallbackState = (): PersistedState | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw) as LegacyPersistedState) : null;
  } catch {
    return null;
  }
};

const saveBrowserFallbackState = (state: PersistedState) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore browser storage failures
  }
};

const getDefaultState = (): PersistedState => ({
  ...DEFAULT_STATE,
  targetDate: getDefaultTargetDate(),
});

const normalizeState = (parsed: LegacyPersistedState): PersistedState => {
  const defaults = getDefaultState();
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
    tasks:
      Array.isArray(parsed.tasks) && parsed.tasks.length > 0
        ? parsed.tasks
        : defaultTasks,
    progressItems:
      Array.isArray(parsed.progressItems) && parsed.progressItems.length > 0
        ? parsed.progressItems.map((item, index) => ({
            ...item,
            title: item.title?.trim() || `进度 ${index + 1}`,
            current: Math.max(0, Number(item.current) || 0),
            total: Math.max(1, Number(item.total) || 1),
            color: PROGRESS_COLORS.includes(item.color)
              ? item.color
              : PROGRESS_COLORS[index % PROGRESS_COLORS.length],
          }))
        : defaultProgressItems,
    accentColor: /^#[0-9a-fA-F]{6}$/.test(resolvedAccent) ? resolvedAccent : defaults.accentColor,
    activityTag: parsed.activityTag?.trim() || '',
    timerStatus:
      parsed.timerStatus === 'running' || parsed.timerStatus === 'paused' || parsed.timerStatus === 'idle'
        ? parsed.timerStatus
        : defaults.timerStatus,
    elapsedMs: Math.max(0, Number(parsed.elapsedMs) || 0),
    lastStartedAt:
      typeof parsed.lastStartedAt === 'number' && Number.isFinite(parsed.lastStartedAt)
        ? parsed.lastStartedAt
        : null,
    timerLabels:
      Array.isArray(parsed.timerLabels) && parsed.timerLabels.length > 0
        ? parsed.timerLabels.filter((l): l is string => typeof l === 'string' && l.trim().length > 0)
        : DEFAULT_TIMER_LABELS,
  };
};

const migrateLocalStorageState = async (): Promise<PersistedState | null> => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const normalized = normalizeState(JSON.parse(raw) as LegacyPersistedState);
    await appStateStore.set(STORAGE_KEY, normalized);
    await appStateStore.save();
    window.localStorage.removeItem(STORAGE_KEY);
    return normalized;
  } catch {
    return null;
  }
};

export const loadPersistedState = async (): Promise<PersistedState> => {
  if (!isTauriStoreAvailable()) {
    return loadBrowserFallbackState() ?? getDefaultState();
  }

  try {
    const stored = await appStateStore.get<LegacyPersistedState>(STORAGE_KEY);
    if (stored) return normalizeState(stored);

    const migrated = await migrateLocalStorageState();
    if (migrated) return migrated;
  } catch {
    const migrated = await migrateLocalStorageState();
    if (migrated) return migrated;
  }

  return getDefaultState();
};

export const savePersistedState = async (state: PersistedState): Promise<void> => {
  if (!isTauriStoreAvailable()) {
    saveBrowserFallbackState(state);
    return;
  }

  await appStateStore.set(STORAGE_KEY, state);
  await appStateStore.save();
};

export const mergePersistedState = async (
  patch: Partial<PersistedState>,
): Promise<PersistedState> => {
  const nextState = {
    ...(await loadPersistedState()),
    ...patch,
  };

  await savePersistedState(nextState);
  return nextState;
};
