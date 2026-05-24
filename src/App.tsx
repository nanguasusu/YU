import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Minimize2 } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { usePersistedState } from './hooks/usePersistedState';
import { useTagStore } from './hooks/useTagStore';
import { useAppMode } from './hooks/useAppMode';
import { useTimerRecords } from './hooks/useTimerRecords';
import { useLiveElapsedMs } from './hooks/useLiveElapsedMs';
import { playSound } from './lib/sound';
import { BrandClockIcon } from './components/BrandClockIcon';
import { ModeMenu } from './components/ModeMenu';
import { TagPicker } from './components/TagPicker';
import { WidgetLayout } from './components/WidgetLayout';
import { TimerLayout } from './components/TimerLayout';
import { formatElapsedTime } from './types';
import type { AppMode, TimerStatus, WindowState, WidgetTab, TimerTab } from './types';
import './App.css';

const ALL_APP_MODES: AppMode[] = ['widget', 'timer'];

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
  onSelectTag,
  timerLabels,
  miniTimerFont,
}: {
  accentColor: string;
  activityTag: string;
  timerStatus: TimerStatus;
  displayTime: string;
  onSelectTag: (tag: string) => void;
  timerLabels: string[];
  miniTimerFont: string;
}) {
  const statusText = getStatusText(activityTag, timerStatus);

  return (
    <div className="mini-timer-shell">
      <div className="mini-timer-head">
        <TagPicker
          currentTag={activityTag}
          onSelectTag={onSelectTag}
          accentColor={accentColor}
          labels={timerLabels}
          disabled
        />
        {activityTag.trim() && (
          <span className="mini-timer-status">{statusText}</span>
        )}
      </div>

      <div className="mini-timer-display">
        <span
          className={`mini-info-text mini-time-text mini-time-font-${miniTimerFont}`}
          style={{ color: accentColor }}
        >
          {displayTime}
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const state = usePersistedState();
  const tagStore = useTagStore();

  // --- Task 11.1: New hooks and state ---
  const { appMode, setAppMode } = useAppMode();
  const { addRecord, records } = useTimerRecords();
  const [windowState, setWindowState] = useState<WindowState>('full');
  const [widgetTab, setWidgetTab] = useState<WidgetTab>('countdown');
  const [timerTab, setTimerTab] = useState<TimerTab>('start');
  const [modeMenuOpen, setModeMenuOpen] = useState(false);

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

  const liveElapsedMs = useLiveElapsedMs(state.timerStatus, state.elapsedMs, state.lastStartedAt);

  const timerDisplay = formatElapsedTime(liveElapsedMs);

  const [recordError, setRecordError] = useState<string>('');

  // Auto-clear error after 3 seconds
  useEffect(() => {
    if (!recordError) return undefined;
    const id = setTimeout(() => setRecordError(''), 3000);
    return () => clearTimeout(id);
  }, [recordError]);

  const flushCurrentSession = useCallback(async (): Promise<boolean> => {
    // 不需要 flush 的情况
    if (state.timerStatus !== 'running' || !state.activityTag.trim()) {
      return true;
    }

    const now = Date.now();
    const elapsed =
      state.elapsedMs + Math.max(0, now - (state.lastStartedAt ?? now));

    if (elapsed < 1000) return true;

    const result = await tagStore.recordDuration(state.activityTag, elapsed);
    if (!result.success) {
      setRecordError('存储失败，计时数据未保存');
      return false;
    }
    return true;
  }, [state.timerStatus, state.activityTag, state.elapsedMs, state.lastStartedAt, tagStore]);

  const handleSelectTag = useCallback(async (newTag: string) => {
    const ok = await flushCurrentSession();
    if (!ok) return;
    if (newTag.trim()) void tagStore.touchTag(newTag);
    state.selectActivityTag(newTag);
  }, [flushCurrentSession, tagStore, state]);

  const handleToggle = useCallback(async () => {
    if (!state.activityTag.trim()) return;
    if (state.timerStatus === 'running') {
      const ok = await flushCurrentSession();
      if (!ok) return;
    }
    state.toggleTimer();
  }, [flushCurrentSession, state]);

  const handleReset = useCallback(async () => {
    const ok = await flushCurrentSession();
    if (!ok) return;
    state.resetTimer();
  }, [flushCurrentSession, state]);

  // --- Task 11.3: Updated minimize handler ---
  const handleMinimize = useCallback(() => {
    if (appMode === 'timer') {
      playSound('minimize', state.isMuted);
      setWindowState('mini');
    } else {
      playSound('minimize', state.isMuted);
      void getCurrentWindow().hide();
    }
  }, [appMode, state.isMuted]);

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

  // --- Task 6.1: Merge timerLabels with visibleCustomTags ---
  const mergedLabels = useMemo(() => (
    tagStore.isLoaded
      ? Array.from(new Set([...state.timerLabels, ...tagStore.visibleCustomTags.map((t) => t.name)]))
      : state.timerLabels
  ), [state.timerLabels, tagStore.isLoaded, tagStore.visibleCustomTags]);

  // --- Task 11.2: Dual-mode render logic ---

  // Mini-timer: only in timer mode
  if (windowState === 'mini' && appMode === 'timer') {
    return (
      <div className="app-wrapper">
        <div
          className="widget-container widget-minimized"
          style={{
            backgroundColor: `rgba(255, 255, 255, ${state.widgetOpacity / 100})`,
            maxWidth: state.widgetWidth,
            // 将透明度比例暴露为 CSS 变量，供内层元素复用
            ['--widget-opacity' as string]: state.widgetOpacity / 100,
          }}
        >
          <div
            className="resize-handle-east"
            onMouseDown={() => void tryStartResizeDrag()}
            title="拖拽调整宽度"
            aria-hidden="true"
          />
          <div
            className="top-bar top-bar-minimized"
            onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <div className="top-bar-drag-zone mini-drag-zone" onMouseDown={handleWindowDragMouseDown}>
              <div className="mini-info mini-info-visible">
                <MiniTimer
                  accentColor={state.accentColor}
                  activityTag={state.activityTag}
                  timerStatus={state.timerStatus}
                  displayTime={timerDisplay}
                  onSelectTag={handleSelectTag}
                  timerLabels={mergedLabels}
                  miniTimerFont={state.miniTimerFont}
                />
              </div>
            </div>
            <div className="top-actions">
              <button
                type="button"
                className="icon-button"
                onClick={(e) => { e.stopPropagation(); setWindowState('full'); }}
                onMouseDown={(e) => e.stopPropagation()}
                aria-label="展开组件"
              >
                <Minimize2 className="action-icon icon-rotate-180" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
        {recordError && <div className="record-error-toast" role="alert">{recordError}</div>}
      </div>
    );
  }

  // Full layouts
  return (
    <div className="app-wrapper">
      <div
        className="widget-container widget-expanded"
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

        {/* Top bar */}
        <div
          className="top-bar top-bar-expanded"
          onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div className="top-bar-drag-zone" onMouseDown={handleWindowDragMouseDown}>
            {/* Brand icon doubles as mode-switch entry */}
            <div className="brand-icon-wrap">
              <BrandClockIcon
                accentColor={state.accentColor}
                variant={appMode === 'widget' ? 'widget' : 'timer'}
                onClick={(e) => {
                  e.stopPropagation();
                  setModeMenuOpen((prev) => !prev);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                ariaLabel={`当前：${appMode === 'widget' ? '桌面挂件' : '计时钟'}，点击切换模式`}
              />
              {modeMenuOpen && (
                <>
                  {/* Transparent backdrop to close menu on outside click */}
                  <div
                    className="mode-menu-backdrop"
                    onMouseDown={() => setModeMenuOpen(false)}
                  />
                  <ModeMenu
                    appMode={appMode}
                    accentColor={state.accentColor}
                    onSwitch={(mode: AppMode) => void setAppMode(mode)}
                    onClose={() => setModeMenuOpen(false)}
                    availableModes={ALL_APP_MODES.filter((m) => m !== appMode)}
                  />
                </>
              )}
            </div>
          </div>
          <div className="top-actions">
            {appMode === 'timer' && (
              <button
                type="button"
                className="icon-button"
                onClick={(e) => { e.stopPropagation(); handleMinimize(); }}
                onMouseDown={(e) => e.stopPropagation()}
                aria-label="最小化组件"
              >
                <Minimize2 className="action-icon" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {/* Content: delegate to WidgetLayout or TimerLayout */}
        {appMode === 'widget' ? (
          <WidgetLayout
            activeTab={widgetTab}
            setActiveTab={setWidgetTab}
            state={state}
            tagStore={tagStore}
            accentColor={state.accentColor}
            onSound={(type) => playSound(type, state.isMuted)}
          />
        ) : (
          <TimerLayout
            timerTab={timerTab}
            setTimerTab={setTimerTab}
            records={records}
            addRecord={addRecord}
            liveElapsedMs={liveElapsedMs}
            state={state}
            accentColor={state.accentColor}
            timerLabels={mergedLabels}
            activeTag={state.activityTag.trim() || undefined}
          />
        )}
      </div>
      {recordError && <div className="record-error-toast" role="alert">{recordError}</div>}
    </div>
  );
}
