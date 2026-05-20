import {
  STORAGE_KEY,
  PROGRESS_COLORS,
  ACCENT_COLORS,
  DEFAULT_STATE,
  DEFAULT_OPACITY,
  defaultTasks,
  defaultProgressItems,
  getDefaultTargetDate,
  type PersistedState,
} from '../types';

export const loadPersistedState = (): PersistedState => {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE, targetDate: getDefaultTargetDate() };

    const parsed = JSON.parse(raw) as Partial<PersistedState> & {
      notifications?: boolean;
      accentColorId?: string;
    };

    // Migrate old accentColorId to hex
    const resolvedAccent =
      parsed.accentColor ??
      (parsed.accentColorId ? (ACCENT_COLORS[parsed.accentColorId] ?? '#007aff') : '#007aff');

    return {
      targetTitle: parsed.targetTitle?.trim() || DEFAULT_STATE.targetTitle,
      targetDate: parsed.targetDate || getDefaultTargetDate(),
      countdownStyle: parsed.countdownStyle || 'sans',
      muted: parsed.muted ?? parsed.notifications ?? false,
      opacity: Math.min(100, Math.max(20, Number(parsed.opacity) || DEFAULT_OPACITY)),
      widgetWidth: Math.min(480, Math.max(260, Number(parsed.widgetWidth) || 320)),
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
      accentColor: /^#[0-9a-fA-F]{6}$/.test(resolvedAccent) ? resolvedAccent : '#007aff',
    };
  } catch {
    return { ...DEFAULT_STATE, targetDate: getDefaultTargetDate() };
  }
};

export const savePersistedState = (state: PersistedState): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
