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
export type ActiveTab = 'timer' | 'tasks' | 'stats';
export type SoundType = 'click' | 'complete' | 'minimize' | 'unminimize' | 'pop';
export type TimerStatus = 'idle' | 'running' | 'paused';

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
  activityTag: string;
  timerStatus: TimerStatus;
  elapsedMs: number;
  lastStartedAt: number | null;
  timerLabels: string[];
};

export const defaultTasks: TaskItem[] = [
  { id: 1, text: '读 1 篇文献', tag: '#论文', completed: false },
  { id: 2, text: '论文返修', tag: '', completed: false },
];

export const defaultProgressItems: ProgressItem[] = [
  { id: 1, title: '研究生开题报告', current: 41, total: 50, color: PROGRESS_COLORS[0] },
  { id: 2, title: '遥感影像预处理', current: 5, total: 20, color: PROGRESS_COLORS[1] },
];

export const DEFAULT_TIMER_LABELS: string[] = ['Coding', '学习', '阅读', '休息'];
export const TIMER_LABELS_KEY = 'timer-labels';

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
  activityTag: '',
  timerStatus: 'idle',
  elapsedMs: 0,
  lastStartedAt: null,
  timerLabels: DEFAULT_TIMER_LABELS,
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

export const ACTIVITY_TAG_OPTIONS = ['Coding', '学习', '阅读', '休息'] as const;

export const formatElapsedTime = (elapsedMs: number): string => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
};

// --- Tag Store Types ---

export type CustomTag = {
  /** 唯一标识，使用创建时的时间戳 */
  id: number;
  /** 标签名称，最大 10 个 Unicode 字符 */
  name: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 最近一次被选中的时间戳，用于排序 */
  lastUsedAt: number;
};

export type TagRecord = {
  /** 标签名称（关联 key） */
  tagName: string;
  /** 累计计时总时长（毫秒） */
  totalMs: number;
  /** 最后一次记录的时间戳 */
  lastRecordedAt: number;
};

export type TagStoreData = {
  /** 用户创建的自定义标签列表 */
  customTags: CustomTag[];
  /** 每个标签的累计计时记录 */
  tagRecords: TagRecord[];
};

export const TAG_STORE_KEY = 'countdown-widget-tag-store';

// --- Dual-mode types ---

export type AppMode = 'widget' | 'timer';
export type WindowState = 'full' | 'mini' | 'hidden';
export type WidgetTab = 'countdown' | 'tasks' | 'progress';
export type TimerTab = 'start' | 'timeline' | 'stats';

export type TimerRecord = {
  id: string;           // crypto.randomUUID() or timestamp fallback
  title: string;        // tag name when no explicit title
  tag?: string;         // selected activity tag
  startTime: number;    // Unix ms timestamp
  endTime: number;      // Unix ms timestamp
  duration: number;     // total elapsed ms (must be >= 1000 to persist)
  note?: string;        // optional user note (future use)
};

export const TIMER_RECORDS_KEY = 'timer-records';
export const APP_MODE_KEY = 'app-mode';

// --- Tag color system ---

/**
 * Soft, low-saturation color tokens for per-tag coloring.
 * The global accent color is reserved for the top tag / active timer.
 */
export const SOFT_COLOR_TOKENS = [
  'softBlue',
  'softPurple',
  'softGreen',
  'softOrange',
  'softRose',
  'softTeal',
  'softGray',
] as const;

export type SoftColorToken = (typeof SOFT_COLOR_TOKENS)[number];

/** CSS variable values for each soft token */
export const SOFT_COLOR_VALUES: Record<SoftColorToken, string> = {
  softBlue:   '#8ab4e8',   // 柔和蓝，降饱和
  softPurple: '#a89cc8',   // 柔和紫，降饱和去艳
  softGreen:  '#7dba8c',   // 柔和绿，略降亮度
  softOrange: '#d4956a',   // 柔和橙棕，去掉高饱和黄橙
  softRose:   '#d4899e',   // 柔和玫瑰，降饱和
  softTeal:   '#72b0aa',   // 柔和青绿，降饱和
  softGray:   '#9eadb8',   // 柔和蓝灰
};

/**
 * Future-proof tag type.
 * colorToken is optional — when absent the system auto-assigns from the soft palette.
 * Backward-compatible: existing string[] tag names still work via resolveTagName().
 */
export type TimerTag = {
  id: string;
  name: string;
  colorToken?: SoftColorToken;
};

/**
 * Format a duration in milliseconds to a human-readable string.
 * < 1 hour  → "X分钟"
 * >= 1 hour → "X小时Y分钟" (or "X小时" if minutes === 0)
 */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}分钟`;
  return minutes === 0 ? `${hours}小时` : `${hours}小时${minutes}分钟`;
}

/**
 * Format a start/end timestamp pair as "HH:MM - HH:MM" in local time.
 */
export function formatTimeRange(startTime: number, endTime: number): string {
  const fmt = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  return `${fmt(startTime)} - ${fmt(endTime)}`;
}

/**
 * Format a total duration for the stats header badge.
 * < 1 hour  → "X分钟"
 * >= 1 hour → "X.X小时"
 */
export function formatTotalHours(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  if (totalMinutes < 60) return `${totalMinutes}分钟`;
  const hours = ms / 3_600_000;
  return `${hours.toFixed(1)}小时`;
}
