import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, CheckSquare, BarChart2, Minimize2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { usePersistedState } from './hooks/usePersistedState';
import { useTagStore } from './hooks/useTagStore';
import { playSound } from './lib/sound';
import { BrandClockIcon } from './components/BrandClockIcon';
import { TagPicker } from './components/TagPicker';
import { TimerTab } from './components/TimerTab';
import { TasksTab } from './components/TasksTab';
import { StatsTab } from './components/StatsTab';
import { formatElapsedTime } from './types';
import type { ActiveTab, TimerStatus, CustomTag } from './types';
import './App.css';

/**
 * 根据 activityTag 和 timerStatus 返回唯一一条状态文案。
 * 纯函数，无 React 依赖，便于测试。
 */
export function getStatusText(activityTag: string, timerStatus: TimerStatus): string {
  const tag = activityTag.trim();

  if (!tag) return '请选择标签';

  switch (timerStatus) {
    case 'running':
      return ` 进行中`;
    case 'paused':
      return `已暂停`;
    case 'idle':
    default:
      return `待开始`;
  }
}

function MiniTimer({
  accentColor,
  activityTag,
  timerStatus,
  displayTime,
  onToggle,
  onReset,
  onSelectTag,
  onCreateTag,
  onDeleteTag,
  customTags,
  visibleCustomTags,
  allCustomTags,
  hasMoreTags,
  isAtLimit,
}: {
  accentColor: string;
  activityTag: string;
  timerStatus: TimerStatus;
  displayTime: string;
  onToggle: () => void;
  onReset: () => void;
  onSelectTag: (tag: string) => void;
  onCreateTag: (name: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteTag: (tagId: number) => Promise<{ success: boolean; error?: string }>;
  customTags: CustomTag[];
  visibleCustomTags: CustomTag[];
  allCustomTags: CustomTag[];
  hasMoreTags: boolean;
  isAtLimit: boolean;
}) {
  const statusText = getStatusText(activityTag, timerStatus);

  return (
    <div className="mini-timer-shell">
      <div className="mini-timer-head">
        <TagPicker
          currentTag={activityTag}
          onSelectTag={onSelectTag}
          accentColor={accentColor}
          customTags={customTags}
          visibleCustomTags={visibleCustomTags}
          allCustomTags={allCustomTags}
          hasMoreTags={hasMoreTags}
          isAtLimit={isAtLimit}
          onCreateTag={onCreateTag}
          onDeleteTag={onDeleteTag}
        />
        {activityTag.trim() && (
          <span className="mini-timer-status">{statusText}</span>
        )}
      </div>

      <button
        type="button"
        className="mini-timer-display"
        onClick={onToggle}
        onDoubleClick={onReset}
        onMouseDown={(e) => e.stopPropagation()}
        title={activityTag.trim() ? '单击暂停/继续，双击重置' : '请先选择标签'}
        aria-label={activityTag.trim() ? `${statusText}，当前时间 ${displayTime}` : statusText}
      >
        <span className="mini-info-text mini-time-text" style={{ color: accentColor }}>
          {displayTime}
        </span>
        <span className="mini-timer-hint">单击暂停，双击重置</span>
      </button>
    </div>
  );
}

export default function App() {
  const state = usePersistedState();
  const tagStore = useTagStore();
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('timer');
  const [liveNow, setLiveNow] = useState(() => Date.now());

  const trimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseLeave = useCallback(() => {
    trimTimerRef.current = setTimeout(async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        console.log('[trim_memory] invoking...');
        await invoke('trim_memory');
        console.log('[trim_memory] done');
      } catch (e) {
        console.error('[trim_memory] error', e);
      }
    }, 30_000);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (trimTimerRef.current) {
      clearTimeout(trimTimerRef.current);
      trimTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (state.timerStatus !== 'running') return undefined;
    const id = window.setInterval(() => setLiveNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [state.timerStatus]);

  useEffect(() => {
    setLiveNow(Date.now());
  }, [state.timerStatus, state.elapsedMs, state.lastStartedAt]);

  const liveElapsedMs =
    state.timerStatus !== 'running' || state.lastStartedAt === null
      ? state.elapsedMs
      : state.elapsedMs + Math.max(0, liveNow - state.lastStartedAt);

  const timerDisplay = formatElapsedTime(liveElapsedMs);

  const [recordError, setRecordError] = useState<string>('');

  // Auto-clear error after 3 seconds
  useEffect(() => {
    if (!recordError) return undefined;
    const id = setTimeout(() => setRecordError(''), 3000);
    return () => clearTimeout(id);
  }, [recordError]);

  const handleSelectTag = useCallback(async (newTag: string) => {
    // If running and switching tags, record duration for the old tag first
    if (state.timerStatus === 'running' && state.activityTag.trim()) {
      const now = Date.now();
      const elapsed = state.elapsedMs + Math.max(0, now - (state.lastStartedAt ?? now));
      if (elapsed >= 1000) {
        const result = await tagStore.recordDuration(state.activityTag, elapsed);
        if (!result.success) {
          setRecordError('存储失败，计时数据未保存');
          // Don't reset elapsedMs, don't proceed with tag switch
          return;
        }
      }
    }

    if (newTag.trim()) {
      void tagStore.touchTag(newTag);
    }
    state.selectActivityTag(newTag);
  }, [tagStore, state]);

  const handleToggle = useCallback(async () => {
    if (!state.activityTag.trim()) return;
    // If currently running, record duration before pausing
    if (state.timerStatus === 'running') {
      const now = Date.now();
      const sessionMs = Math.max(0, now - (state.lastStartedAt ?? now));
      if (sessionMs >= 1000) {
        const result = await tagStore.recordDuration(state.activityTag, sessionMs);
        if (!result.success) {
          setRecordError('存储失败，计时数据未保存');
          // Keep elapsedMs, don't toggle
          return;
        }
      }
    }
    state.toggleTimer();
  }, [state, tagStore]);

  const handleReset = useCallback(async () => {
    // If currently running, record full elapsed duration before resetting
    if (state.timerStatus === 'running' && state.activityTag.trim()) {
      const now = Date.now();
      const elapsed = state.elapsedMs + Math.max(0, now - (state.lastStartedAt ?? now));
      if (elapsed >= 1000) {
        const result = await tagStore.recordDuration(state.activityTag, elapsed);
        if (!result.success) {
          setRecordError('存储失败，计时数据未保存');
          // Keep elapsedMs, don't reset
          return;
        }
      }
    }
    state.resetTimer();
  }, [state, tagStore]);

  const handleDeleteTag = useCallback(async (tagId: number) => {
    const tagToDelete = tagStore.customTags.find((t) => t.id === tagId);
    const result = await tagStore.deleteTag(tagId);
    if (result.success && tagToDelete && tagToDelete.name === state.activityTag) {
      // Reset timer when the deleted tag is the current activity tag
      state.selectActivityTag('');
    }
    return result;
  }, [tagStore, state]);

  const changeTab = (tab: ActiveTab) => {
    if (activeTab === tab) return;
    playSound('click', state.isMuted);
    setActiveTab(tab);
  };

  const toggleMinimize = () => {
    playSound(isMinimized ? 'unminimize' : 'minimize', state.isMuted);
    setIsMinimized((value) => !value);
  };

  const tryStartResizeDrag = async () => {
    try { await getCurrentWindow().startResizeDragging('East'); } catch { /* non-Tauri */ }
  };

  const tryStartWindowDrag = async () => {
    try { await getCurrentWindow().startDragging(); } catch { /* non-Tauri */ }
  };

  const handleWindowDragMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    void tryStartWindowDrag();
  };

  return (
    <div className="app-wrapper">
      <div
        className={`widget-container ${isMinimized ? 'widget-minimized' : 'widget-expanded'}`}
        style={{
          backgroundColor: `rgba(255, 255, 255, ${state.widgetOpacity / 100})`,
          maxWidth: state.widgetWidth,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="resize-handle-east"
          onMouseDown={() => void tryStartResizeDrag()}
          title="拖拽调整宽度"
          aria-hidden="true"
        />

        <div
          className={`top-bar ${isMinimized ? 'top-bar-minimized' : 'top-bar-expanded'}`}
          onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          {isMinimized ? (
            <div className="top-bar-drag-zone mini-drag-zone" onMouseDown={handleWindowDragMouseDown}>
              <div className="mini-info mini-info-visible">
                <MiniTimer
                  accentColor={state.accentColor}
                  activityTag={state.activityTag}
                  timerStatus={state.timerStatus}
                  displayTime={timerDisplay}
                  onToggle={handleToggle}
                  onReset={handleReset}
                  onSelectTag={handleSelectTag}
                  onCreateTag={tagStore.createTag}
                  onDeleteTag={handleDeleteTag}
                  customTags={tagStore.customTags}
                  visibleCustomTags={tagStore.visibleCustomTags}
                  allCustomTags={tagStore.allCustomTags}
                  hasMoreTags={tagStore.hasMoreTags}
                  isAtLimit={tagStore.isAtLimit}
                />
              </div>
            </div>
          ) : (
            <div className="top-bar-drag-zone" onMouseDown={handleWindowDragMouseDown}>
              <BrandClockIcon accentColor={state.accentColor} />
            </div>
          )}

          <div className="top-actions">
            <button
              type="button"
              className="icon-button"
              onClick={(e) => { e.stopPropagation(); toggleMinimize(); }}
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
              <TimerTab
                targetTitle={state.targetTitle}
                setTargetTitle={state.setTargetTitle}
                targetDate={state.targetDate}
                setTargetDate={state.setTargetDate}
                countdownStyle={state.countdownStyle}
                accentColor={state.accentColor}
              />
            )}
            {activeTab === 'tasks' && (
              <TasksTab
                tasks={state.tasks}
                accentColor={state.accentColor}
                onToggle={state.toggleTask}
                onDelete={state.deleteTask}
                onAdd={state.addTask}
                onClearCompleted={state.clearCompletedTasks}
                onSound={(type) => playSound(type, state.isMuted)}
              />
            )}
            {activeTab === 'stats' && (
              <StatsTab
                progressItems={state.progressItems}
                onAdd={state.addProgress}
                onDelete={state.deleteProgress}
                onUpdateTitle={state.updateProgressTitle}
                onNormalizeTitle={state.normalizeProgressTitle}
                onUpdateTotal={state.updateProgressTotal}
                onUpdateProgress={state.updateProgress}
                onSound={(type) => playSound(type, state.isMuted)}
              />
            )}
          </AnimatePresence>
        </div>

        <div className={`bottom-nav ${isMinimized ? 'bottom-nav-hidden' : 'bottom-nav-visible'}`}>
          {(
            [
              { tab: 'timer', Icon: Clock, label: '计时器' },
              { tab: 'tasks', Icon: CheckSquare, label: '任务列表' },
              { tab: 'stats', Icon: BarChart2, label: '进度统计' },
            ] as const
          ).map(({ tab, Icon, label }) => (
            <button
              key={tab}
              type="button"
              onClick={() => changeTab(tab)}
              className={`nav-btn ${activeTab === tab ? 'nav-btn-active' : 'nav-btn-inactive'}`}
              style={activeTab === tab ? { color: state.accentColor } : undefined}
              aria-label={label}
            >
              <Icon className="nav-icon" strokeWidth={2} />
            </button>
          ))}
        </div>
      </div>

      {recordError && (
        <div className="record-error-toast" role="alert">
          {recordError}
        </div>
      )}
    </div>
  );
}
