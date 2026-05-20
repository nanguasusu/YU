import { LazyStore } from '@tauri-apps/plugin-store';
import {
  STORAGE_KEY,
  STORE_FILE,
  PROGRESS_COLORS,
  ACCENT_COLORS,
  DEFAULT_STATE,
  DEFAULT_OPACITY,
  defaultTasks,
  defaultProgressItems,
  getDefaultTargetDate,
  type PersistedState,
} from '../types';

type LegacyPersistedState = Partial<PersistedState> & {
  notifications?: boolean;
  accentColorId?: string;
};

const store = new LazyStore(STORE_FILE);

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
  };
};

const migrateLocalStorageState = async (): Promise<PersistedState | null> => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const normalized = normalizeState(JSON.parse(raw) as LegacyPersistedState);
    await store.set(STORAGE_KEY, normalized);
    await store.save();
    window.localStorage.removeItem(STORAGE_KEY);
    return normalized;
  } catch {
    return null;
  }
};

export const loadPersistedState = async (): Promise<PersistedState> => {
  try {
    const stored = await store.get<LegacyPersistedState>(STORAGE_KEY);
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
  await store.set(STORAGE_KEY, state);
  await store.save();
};
