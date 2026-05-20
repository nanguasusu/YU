import React, { useEffect, useState } from 'react';
import {
  Clock,
  CheckSquare,
  BarChart2,
  Settings,
  Minimize2,
  Plus,
  Volume2,
  X,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import './App.css';

const STORAGE_KEY = 'countdown-task-widget-state';
const DEFAULT_TARGET = '2026-03-14';
const DEFAULT_TARGET_TITLE = '开题报告';

const PROGRESS_COLORS = ['color-0', 'color-1', 'color-2', 'color-3', 'color-4'] as const;

type CountdownStyle = 'sans' | 'serif' | 'mono';
type ActiveTab = 'timer' | 'tasks' | 'stats' | 'settings';

type TaskItem = {
  id: number;
  text: string;
  tag: string;
  completed: boolean;
};

type ProgressItem = {
  id: number;
  title: string;
  current: number;
  total: number;
  color: (typeof PROGRESS_COLORS)[number];
};

const ACCENT_COLORS: Record<string, string> = {
  blue: '#007aff', purple: '#8b5cf6', pink: '#ec4899', red: '#ff453a',
  orange: '#ff9500', green: '#30d158', teal: '#5ac8fa', mono: '#1d1d1f',
};

type PersistedState = {
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

const defaultTasks: TaskItem[] = [
  { id: 1, text: '读 1 篇文献', tag: '#论文', completed: false },
  { id: 2, text: '论文返修', tag: '', completed: false },
];

const defaultProgressItems: ProgressItem[] = [
  { id: 1, title: '研究生开题报告', current: 41, total: 50, color: PROGRESS_COLORS[0] },
  { id: 2, title: '遥感影像预处理', current: 5, total: 20, color: PROGRESS_COLORS[1] },
];

const DEFAULT_OPACITY = 40;

const getProgressTone = (percent: number) => {
  if (percent >= 100) return 'progress-tone-complete';
  if (percent >= 75) return 'progress-tone-high';
  if (percent >= 50) return 'progress-tone-mid';
  if (percent >= 25) return 'progress-tone-low';
  return 'progress-tone-start';
};

const buildDateFromInput = (value: string) => new Date(`${value}T00:00:00`);

const formatDateInput = (date: Date) => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
};

const playSound = (type: 'click' | 'complete' | 'minimize' | 'unminimize' | 'pop', muted = false) => {
  if (muted) return;

  try {
    const AudioContextClass = window.AudioContext || (window as never as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'complete') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'click') {
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.05);
    } else if (type === 'minimize') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'unminimize') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'pop') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.05);
    }
  } catch {
    // Ignore audio errors.
  }
};

const loadPersistedState = (): PersistedState => {
  if (typeof window === 'undefined') {
    return {
      targetTitle: DEFAULT_TARGET_TITLE,
      targetDate: DEFAULT_TARGET,
      countdownStyle: 'sans',
      muted: false,
      opacity: DEFAULT_OPACITY,
      widgetWidth: 420,
      tasks: defaultTasks,
      progressItems: defaultProgressItems,
      accentColor: '#007aff',
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        targetTitle: DEFAULT_TARGET_TITLE,
        targetDate: DEFAULT_TARGET,
        countdownStyle: 'sans',
        muted: false,
        opacity: DEFAULT_OPACITY,
        widgetWidth: 420,
        tasks: defaultTasks,
        progressItems: defaultProgressItems,
        accentColor: '#007aff',
      };
    }

    const parsed = JSON.parse(raw) as Partial<PersistedState> & { notifications?: boolean; accentColorId?: string };
    // migrate old accentColorId to hex
    const resolvedAccent = parsed.accentColor ??
      (parsed.accentColorId ? (ACCENT_COLORS[parsed.accentColorId] ?? '#007aff') : '#007aff');

    return {
      targetTitle: parsed.targetTitle?.trim() || DEFAULT_TARGET_TITLE,
      targetDate: parsed.targetDate || DEFAULT_TARGET,
      countdownStyle: parsed.countdownStyle || 'sans',
      muted: parsed.muted ?? parsed.notifications ?? false,
      opacity: Math.min(100, Math.max(20, Number(parsed.opacity) || DEFAULT_OPACITY)),
      widgetWidth: Math.min(640, Math.max(320, Number(parsed.widgetWidth) || 420)),
      tasks: Array.isArray(parsed.tasks) && parsed.tasks.length > 0 ? parsed.tasks : defaultTasks,
      progressItems:
        Array.isArray(parsed.progressItems) && parsed.progressItems.length > 0
          ? parsed.progressItems.map((item, index) => ({
              ...item,
              title: item.title?.trim() || `进度 ${index + 1}`,
              current: Math.max(0, Number(item.current) || 0),
              total: Math.max(1, Number(item.total) || 1),
              color: PROGRESS_COLORS.includes(item.color) ? item.color : PROGRESS_COLORS[index % PROGRESS_COLORS.length],
            }))
          : defaultProgressItems,
      accentColor: /^#[0-9a-fA-F]{6}$/.test(resolvedAccent) ? resolvedAccent : '#007aff',
    };
  } catch {
    return {
      targetTitle: DEFAULT_TARGET_TITLE,
      targetDate: DEFAULT_TARGET,
      countdownStyle: 'sans',
      muted: false,
      opacity: DEFAULT_OPACITY,
      widgetWidth: 420,
      tasks: defaultTasks,
      progressItems: defaultProgressItems,
      accentColor: '#007aff',
    };
  }
};

function BrandClockIcon({ accentColor, size = 32, className = 'brand-icon' }: { accentColor: string; size?: number; className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="18" r="16" fill={accentColor} opacity="0.10" />
        <circle cx="18" cy="18" r="11" fill={accentColor} opacity="0.15" />
        <circle cx="18" cy="18" r="8.5" fill="white" opacity="0.7" />
        <circle cx="18" cy="18" r="8.5" stroke={accentColor} strokeWidth="1.5" fill="none" opacity="0.6" />
        <line x1="18" y1="18" x2="18" y2="12.5" stroke={accentColor} strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
        <line x1="18" y1="18" x2="22" y2="18" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
        <circle cx="18" cy="18" r="1.2" fill={accentColor} opacity="0.9" />
        <g opacity="0.7" transform="translate(27, 8)">
          <line x1="0" y1="-2.5" x2="0" y2="2.5" stroke={accentColor} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="-2.5" y1="0" x2="2.5" y2="0" stroke={accentColor} strokeWidth="1.2" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

export default function App() {
  const persisted = loadPersistedState();

  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('timer');
  const [now, setNow] = useState(new Date());

  const [targetTitle, setTargetTitle] = useState(persisted.targetTitle);
  const [isEditingTargetTitle, setIsEditingTargetTitle] = useState(false);
  const [targetDate, setTargetDate] = useState(buildDateFromInput(persisted.targetDate));
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(persisted.targetDate);
  const [dateError, setDateError] = useState('');
  const [countdownStyle, setCountdownStyle] = useState<CountdownStyle>(persisted.countdownStyle);
  const [widgetOpacity, setWidgetOpacity] = useState(persisted.opacity);
  const [widgetWidth, setWidgetWidth] = useState(persisted.widgetWidth);

  const [tasks, setTasks] = useState<TaskItem[]>(persisted.tasks);
  const [newTaskText, setNewTaskText] = useState('');

  const [progressItems, setProgressItems] = useState<ProgressItem[]>(persisted.progressItems);
  const [isMuted, setIsMuted] = useState(persisted.muted);
  const [accentColor, setAccentColor] = useState<string>(persisted.accentColor);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const serialized: PersistedState = {
      targetTitle,
      targetDate: formatDateInput(targetDate),
      countdownStyle,
      muted: isMuted,
      opacity: widgetOpacity,
      widgetWidth,
      tasks,
      progressItems,
      accentColor,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  }, [countdownStyle, isMuted, progressItems, targetDate, targetTitle, tasks, widgetOpacity, accentColor, widgetWidth]);

  // Listen to window resize events and persist the new width
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
            const clamped = Math.min(640, Math.max(320, logicalW));
            setWidgetWidth(clamped);
          } catch { /* ignore */ }
        });
      } catch { /* non-Tauri env */ }
    };
    void setup();
    return () => { unlisten?.(); };
  }, []);

  const diff = Math.max(0, targetDate.getTime() - now.getTime());
  const d = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const completedCount = tasks.filter((task) => task.completed).length;
  const hasOverdueTarget = targetDate.getTime() < now.getTime();
  const miniClockText = [
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  ].map((part) => String(part).padStart(2, '0')).join(':');

  const saveTargetDate = () => {
    const nextDate = buildDateFromInput(tempTarget);
    if (Number.isNaN(nextDate.getTime())) {
      setDateError('请输入有效日期');
      return;
    }

    setTargetDate(nextDate);
    setDateError('');
    setIsEditingTarget(false);
    playSound('click', isMuted);
  };

  const cancelTargetEdit = () => {
    setTempTarget(formatDateInput(targetDate));
    setDateError('');
    setIsEditingTarget(false);
  };

  const startTargetEdit = () => {
    setTempTarget(formatDateInput(targetDate));
    setDateError('');
    setIsEditingTarget(true);
  };

  const finishTargetTitleEdit = (title: string) => {
    setTargetTitle(title.trim() || DEFAULT_TARGET_TITLE);
    setIsEditingTargetTitle(false);
  };

  const tryStartResizeDrag = async () => {
    try {
      await getCurrentWindow().startResizeDragging('East');
    } catch {
      // Ignore non-Tauri environments.
    }
  };

  const tryStartWindowDrag = async () => {
    try {
      await getCurrentWindow().startDragging();
    } catch {
      // Ignore non-Tauri environments.
    }
  };

  const handleWindowDragMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    void tryStartWindowDrag();
  };

  const toggleTask = (id: number) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id !== id) return task;
        playSound(task.completed ? 'click' : 'complete', isMuted);
        return { ...task, completed: !task.completed };
      }),
    );
  };

  const deleteTask = (id: number) => {
    playSound('complete', isMuted);
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));
  };

  const submitTask = () => {
    const trimmedText = newTaskText.trim();
    if (!trimmedText) return;

    const parts = trimmedText.split(/\s+/);
    const tag = parts.find((part) => part.startsWith('#')) || '';
    const text = trimmedText.replace(tag, '').trim() || trimmedText;

    playSound('click', isMuted);
    setTasks((currentTasks) => [...currentTasks, { id: Date.now(), text, tag, completed: false }]);
    setNewTaskText('');
  };

  const handleTaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      submitTask();
    }
  };

  const clearCompletedTasks = () => {
    playSound('complete', isMuted);
    setTasks((currentTasks) => currentTasks.filter((task) => !task.completed));
  };

  const updateProgress = (id: number, delta: number) => {
    playSound('pop', isMuted);
    setProgressItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, current: Math.max(0, Math.min(item.total, item.current + delta)) } : item,
      ),
    );
  };

  const updateProgressTitle = (id: number, title: string) => {
    setProgressItems((items) => items.map((item) => (item.id === id ? { ...item, title } : item)));
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
    playSound('pop', isMuted);
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
    playSound('pop', isMuted);
    setProgressItems((items) => items.filter((item) => item.id !== id));
  };

  const changeTab = (tab: ActiveTab) => {
    if (activeTab === tab) return;
    playSound('click', isMuted);
    setActiveTab(tab);
  };

  const toggleMinimize = () => {
    playSound(isMinimized ? 'unminimize' : 'minimize', isMuted);
    setIsMinimized((current) => !current);
  };

  return (
    <div className="app-wrapper">
      <div
        className={`widget-container ${isMinimized ? 'widget-minimized' : 'widget-expanded'}`}
        style={{ backgroundColor: `rgba(255, 255, 255, ${widgetOpacity / 100})`, maxWidth: widgetWidth }}
      >
        {/* Right-edge resize handle */}
        <div
          className="resize-handle-east"
          onMouseDown={() => void tryStartResizeDrag()}
          title="拖拽调整宽度"
          aria-hidden="true"
        />
        <div
          className={`top-bar ${isMinimized ? 'top-bar-minimized' : 'top-bar-expanded'}`}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {isMinimized ? (
            <>
              <div className="mini-side-slot mini-side-left" onMouseDown={handleWindowDragMouseDown}>
                <BrandClockIcon accentColor={accentColor} size={32} className="mini-brand-icon" />
              </div>
              <div className="top-bar-drag-zone mini-drag-zone" onMouseDown={handleWindowDragMouseDown}>
                <div className="mini-info mini-info-visible">
                  <span
                    className="mini-info-text mini-time-text"
                    title={`${targetTitle} · ${miniClockText}`}
                    style={{ color: accentColor }}
                  >
                    {miniClockText}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div
              className="top-bar-drag-zone"
              onMouseDown={handleWindowDragMouseDown}
            >
              <BrandClockIcon accentColor={accentColor} />
            </div>
          )}

          <div className="top-actions">
            <button
              type="button"
              className="icon-button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMinimize();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                aria-label={isMinimized ? '展开组件' : '最小化组件'}
              >
              <Minimize2
                className={`action-icon ${isMinimized ? 'icon-rotate-180' : ''}`}
                strokeWidth={2}
              />
            </button>
          </div>
        </div>

        <div className={`content-area ${isMinimized ? 'content-hidden' : 'content-visible'}`}>
          <AnimatePresence mode="wait">
            {activeTab === 'timer' && (
              <motion.div
                key="timer"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15, transition: { duration: 0.15 } }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <div className="tab-header">
                  <Clock className="tab-header-icon" strokeWidth={2} />
                  {hasOverdueTarget ? (
                    <>
                      {isEditingTargetTitle ? (
                        <input
                          type="text"
                          value={targetTitle}
                          onChange={(e) => setTargetTitle(e.target.value)}
                          onBlur={(e) => finishTargetTitleEdit(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') finishTargetTitleEdit(e.currentTarget.value);
                            if (e.key === 'Escape') finishTargetTitleEdit(targetTitle);
                          }}
                          className="target-title-inline-input"
                          aria-label="目标名称"
                          maxLength={20}
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          className="target-title-inline-btn"
                          onClick={() => setIsEditingTargetTitle(true)}
                        >
                          {targetTitle}
                        </button>
                      )}
                      <span> 日期已到</span>
                    </>
                  ) : (
                    <>
                      <span>距离 </span>
                      {isEditingTargetTitle ? (
                        <input
                          type="text"
                          value={targetTitle}
                          onChange={(e) => setTargetTitle(e.target.value)}
                          onBlur={(e) => finishTargetTitleEdit(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') finishTargetTitleEdit(e.currentTarget.value);
                            if (e.key === 'Escape') finishTargetTitleEdit(targetTitle);
                          }}
                          className="target-title-inline-input"
                          aria-label="目标名称"
                          maxLength={20}
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          className="target-title-inline-btn"
                          onClick={() => setIsEditingTargetTitle(true)}
                        >
                          {targetTitle}
                        </button>
                      )}
                      <span> 还有</span>
                    </>
                  )}
                </div>

                <div className="timer-content">
                  <div className={`timer-container timer-font-${countdownStyle}`}>
                    <span className={`timer-number timer-number-${countdownStyle}`} style={{ color: accentColor }}>{d}</span>
                    <span className="timer-label">天</span>
                  </div>

                  <div className="target-info-block">
                    <div className="target-info">
                      <span>目标日期：</span>
                      {isEditingTarget ? (
                        <div className="target-edit-group">
                          <input
                            type="date"
                            value={tempTarget}
                            onChange={(e) => {
                              setTempTarget(e.target.value);
                              if (dateError) setDateError('');
                            }}
                            onBlur={() => {
                              if (!dateError) saveTargetDate();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveTargetDate();
                              if (e.key === 'Escape') cancelTargetEdit();
                            }}
                            className="target-date-input"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <button type="button" className="target-date-display" onClick={startTargetEdit}>
                          {targetDate
                            .toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
                            .replace(/\//g, '-')}
                        </button>
                      )}
                    </div>
                    {dateError ? <div className="helper-text helper-text-error">{dateError}</div> : null}
                    {hasOverdueTarget ? <div className="helper-text">已到达目标日期</div> : null}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'tasks' && (
              <motion.div
                key="tasks"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15, transition: { duration: 0.15 } }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <div className="tab-header-row">
                  <div className="tab-header task-header-inline">今日任务 ({completedCount}/{tasks.length})</div>
                  {completedCount > 0 ? (
                    <button type="button" className="text-action-btn" style={{ color: accentColor }} onClick={clearCompletedTasks}>
                      清空已完成
                    </button>
                  ) : null}
                </div>

                <div className="task-list">
                  <AnimatePresence>
                    {tasks.map((task) => (
                      <motion.div
                        key={task.id}
                        className="task-item task-item-group"
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{
                          opacity: 0,
                          scale: 1.1,
                          rotateZ: (Math.random() - 0.5) * 15,
                          y: 10,
                          filter: 'blur(8px)',
                          transition: { duration: 0.4, ease: 'easeIn' },
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          className="task-checkbox-btn"
                          aria-label={task.completed ? `取消完成 ${task.text}` : `完成 ${task.text}`}
                        >
                          {task.completed ? (
                            <CheckSquare className="task-checkbox-icon task-checkbox-icon-checked" strokeWidth={2} style={{ color: accentColor }} />
                          ) : (
                            <div className="task-checkbox-empty" style={{ '--accent': accentColor } as React.CSSProperties}></div>
                          )}
                        </button>
                        <span className={`task-text ${task.completed ? 'task-text-completed' : 'task-text-pending'}`}>
                          {task.text}
                        </span>
                        {task.tag ? <span className="task-tag">{task.tag}</span> : null}

                        {task.completed ? (
                          <button
                            type="button"
                            onClick={() => deleteTask(task.id)}
                            className="task-delete-btn"
                            title="删除任务"
                            aria-label={`删除任务 ${task.text}`}
                          >
                            <Trash2 className="task-delete-icon" strokeWidth={2} />
                          </button>
                        ) : null}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {tasks.length === 0 ? <div className="empty-state-simple">今天还没有任务</div> : null}
                </div>

                <div className="task-input-container">
                  <div className="task-input-icon-wrap">
                    <Plus className="task-input-icon" strokeWidth={2.5} />
                  </div>
                  <input
                    type="text"
                    placeholder="添加任务，回车保存，可带 #标签"
                    className="task-input"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyDown={handleTaskKeyDown}
                    maxLength={60}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'stats' && (
              <motion.div
                key="stats"
                className="stats-panel"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15, transition: { duration: 0.15 } }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <div className="tab-header-flex">
                  <div className="tab-header" style={{ marginBottom: 0 }}>
                    进度条
                  </div>
                  <button type="button" onClick={addProgress} className="tab-icon-btn progress-add-btn" aria-label="新增进度条" title="新增进度条">
                    <Plus className="tab-header-icon" style={{ margin: 0 }} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="progress-list-scroll">
                  <div className="progress-list">
                    <AnimatePresence initial={false}>
                      {progressItems.map((item, index) => {
                        const percent = Math.min(100, Math.max(0, (item.current / item.total) * 100));
                        const isComplete = percent >= 100;

                        return (
                          <motion.div
                            key={item.id}
                            layout
                            className="progress-item-group"
                            initial={{ opacity: 0, y: 14, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.96, transition: { duration: 0.22, ease: 'easeInOut' } }}
                            transition={{ duration: 0.24, ease: 'easeOut' }}
                            >
                              <div className="progress-header">
                                <input
                                value={item.title}
                                onChange={(e) => updateProgressTitle(item.id, e.target.value)}
                                onBlur={(e) => normalizeProgressTitle(item.id, e.target.value)}
                                className="progress-title-input"
                                aria-label={`进度标题 ${index + 1}`}
                                  maxLength={20}
                                />
                                <div className={`progress-meta ${getProgressTone(percent)}`}>
                                  <span className="progress-current">{item.current}</span>
                                  <span className="progress-slash">/</span>
                                  <input
                                    type="number"
                                    title="自定义总数"
                                    value={item.total}
                                    onChange={(e) => updateProgressTotal(item.id, e.target.value)}
                                    className="progress-total-input no-spinners"
                                    min={1}
                                    aria-label={`${item.title} 总数`}
                                  />
                                </div>
                                <button type="button" onClick={() => deleteProgress(item.id)} className="progress-delete-btn" aria-label={`删除 ${item.title}`} title="删除进度条">
                                  <X className="progress-delete-icon" strokeWidth={2.5} />
                                </button>
                              </div>
                            <button
                              type="button"
                              className={`progress-track ${getProgressTone(percent)}`}
                              onClick={() => updateProgress(item.id, 1)}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                updateProgress(item.id, -1);
                              }}
                              title={`${item.title}：点击增加`}
                              aria-label={`${item.title} 进度，点击增加`}
                            >
                              <span className={`progress-fill ${isComplete ? 'progress-fill-complete' : ''}`} style={{ width: `${percent}%` }}></span>
                            </button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {progressItems.length === 0 ? <div className="empty-state-simple">还没有进度条</div> : null}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15, transition: { duration: 0.15 } }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="settings-motion"
              >
                <div className="settings-scroll">
                  <div className="tab-header">应用设置</div>
                  <div className="settings-list">

                    {/* 静音 */}
                    <div className="settings-item">
                      <div className="settings-label">
                        <Volume2 className="settings-icon" />
                        <span className="settings-text">静音开关</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (isMuted) playSound('click', false);
                          setIsMuted((current) => !current);
                        }}
                        className={`toggle-btn ${isMuted ? 'toggle-btn-on' : 'toggle-btn-off'}`}
                        aria-pressed={isMuted}
                        aria-label={isMuted ? '关闭静音' : '开启静音'}
                      >
                        <div className={`toggle-knob ${isMuted ? 'toggle-knob-on' : 'toggle-knob-off'}`}></div>
                      </button>
                    </div>

                    {/* 透明度 */}
                    <div className="settings-item-col">
                      <span className="settings-mini-label">透明度</span>
                      <div className="settings-mini-row">
                        <input
                          type="range"
                          min={20}
                          max={100}
                          step={1}
                          value={widgetOpacity}
                          onChange={(e) => setWidgetOpacity(Number(e.target.value))}
                          className="opacity-slider"
                          aria-label="窗口透明度"
                        />
                        <span className="settings-mini-value">{widgetOpacity}%</span>
                      </div>
                    </div>

                    {/* 全局色彩 */}
                    <div className="settings-item">
                      <div className="settings-label" style={{ marginBottom: 0 }}>
                        <svg className="settings-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <circle cx="8" cy="8" r="6.5" />
                          <path d="M8 1.5C8 1.5 11 4.5 11 7a3 3 0 0 1-6 0c0-2.5 3-5.5 3-5.5Z" fill="currentColor" stroke="none" opacity="0.5"/>
                        </svg>
                        <span className="settings-text">全局色彩</span>
                      </div>
                      <label className="color-picker-wrap" aria-label="选择主题色">
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="color-picker-input"
                        />
                        <span className="color-picker-swatch" style={{ background: accentColor }} />
                      </label>
                    </div>

                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={`bottom-nav ${isMinimized ? 'bottom-nav-hidden' : 'bottom-nav-visible'}`}>
          <button
            type="button"
            onClick={() => changeTab('timer')}
            className={`nav-btn ${activeTab === 'timer' ? 'nav-btn-active' : 'nav-btn-inactive'}`}
            style={activeTab === 'timer' ? { color: accentColor } : undefined}
            aria-label="倒计时"
          >
            <Clock className="nav-icon" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => changeTab('tasks')}
            className={`nav-btn ${activeTab === 'tasks' ? 'nav-btn-active' : 'nav-btn-inactive'}`}
            style={activeTab === 'tasks' ? { color: accentColor } : undefined}
            aria-label="任务列表"
          >
            <CheckSquare className="nav-icon" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => changeTab('stats')}
            className={`nav-btn ${activeTab === 'stats' ? 'nav-btn-active' : 'nav-btn-inactive'}`}
            style={activeTab === 'stats' ? { color: accentColor } : undefined}
            aria-label="进度统计"
          >
            <BarChart2 className="nav-icon" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => changeTab('settings')}
            className={`nav-btn ${activeTab === 'settings' ? 'nav-btn-active' : 'nav-btn-inactive'}`}
            style={activeTab === 'settings' ? { color: accentColor } : undefined}
            aria-label="设置"
          >
            <Settings className="nav-icon" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
