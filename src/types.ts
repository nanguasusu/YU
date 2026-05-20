export const STORAGE_KEY = 'countdown-task-widget-state';
export const STORE_FILE = 'app-state.json';

export const PROGRESS_COLORS = ['color-0', 'color-1', 'color-2', 'color-3', 'color-4'] as const;

export const ACCENT_COLORS: Record<string, string> = {
  blue: '#007aff', purple: '#8b5cf6', pink: '#ec4899', red: '#ff453a',
  orange: '#ff9500', green: '#30d158', teal: '#5ac8fa', mono: '#1d1d1f',
};

export const DEFAULT_TARGET_TITLE = '我的目标';
export const DEFAULT_OPACITY = 40;
export const DEFAULT_ACCENT = '#007aff';

/** 默认目标日期：今天起 30 天后 */
export const getDefaultTargetDate = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return formatDateInput(d);
};

export type CountdownStyle = 'sans' | 'serif' | 'mono';
export type ActiveTab = 'timer' | 'tasks' | 'stats' | 'settings';
export type SoundType = 'click' | 'complete' | 'minimize' | 'unminimize' | 'pop';

export type TaskItem = {
  id: number;
  text: string;
  tag: string;
  completed: boolean;
};

export type ProgressItem = {
  id: number;
  title: string;
  current: number;
  total: number;
  color: (typeof PROGRESS_COLORS)[number];
};

export type PersistedState = {
  targetTitle: string;
  targetDate: string;
  countdownStyle: CountdownStyle;
  muted: boolean;
  opacity: number;
  widgetWidth: number;
  tasks: TaskItem[];
  progressItems: ProgressItem[];
  accentColor: string;
};

export const defaultTasks: TaskItem[] = [
  { id: 1, text: '读 1 篇文献', tag: '#论文', completed: false },
  { id: 2, text: '论文返修', tag: '', completed: false },
];

export const defaultProgressItems: ProgressItem[] = [
  { id: 1, title: '研究生开题报告', current: 41, total: 50, color: PROGRESS_COLORS[0] },
  { id: 2, title: '遥感影像预处理', current: 5, total: 20, color: PROGRESS_COLORS[1] },
];

export const DEFAULT_STATE: PersistedState = {
  targetTitle: DEFAULT_TARGET_TITLE,
  get targetDate() { return getDefaultTargetDate(); },
  countdownStyle: 'sans',
  muted: false,
  opacity: DEFAULT_OPACITY,
  widgetWidth: 320,
  tasks: defaultTasks,
  progressItems: defaultProgressItems,
  accentColor: DEFAULT_ACCENT,
};

export const buildDateFromInput = (value: string) => new Date(`${value}T00:00:00`);

export const formatDateInput = (date: Date): string => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
};

export const getProgressTone = (percent: number) => {
  if (percent >= 100) return 'progress-tone-complete';
  if (percent >= 75) return 'progress-tone-high';
  if (percent >= 50) return 'progress-tone-mid';
  if (percent >= 25) return 'progress-tone-low';
  return 'progress-tone-start';
};
