import React, { useEffect, useState } from 'react';
import { Clock, CheckSquare, BarChart2, Settings, Minimize2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { usePersistedState } from './hooks/usePersistedState';
import { playSound } from './lib/sound';
import { BrandClockIcon } from './components/BrandClockIcon';
import { TimerTab } from './components/TimerTab';
import { TasksTab } from './components/TasksTab';
import { StatsTab } from './components/StatsTab';
import { SettingsTab } from './components/SettingsTab';
import type { ActiveTab } from './types';
import './App.css';

export default function App() {
  const state = usePersistedState();
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('timer');
  const [now, setNow] = useState(new Date());

  // Clock tick
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const miniClockText = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((p) => String(p).padStart(2, '0'))
    .join(':');

  const changeTab = (tab: ActiveTab) => {
    if (activeTab === tab) return;
    playSound('click', state.isMuted);
    setActiveTab(tab);
  };

  const toggleMinimize = () => {
    playSound(isMinimized ? 'unminimize' : 'minimize', state.isMuted);
    setIsMinimized((v) => !v);
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
      >
        {/* Right-edge resize handle */}
        <div
          className="resize-handle-east"
          onMouseDown={() => void tryStartResizeDrag()}
          title="拖拽调整宽度"
          aria-hidden="true"
        />

        {/* Top bar */}
        <div
          className={`top-bar ${isMinimized ? 'top-bar-minimized' : 'top-bar-expanded'}`}
          onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          {isMinimized ? (
            <>
              <div className="top-bar-drag-zone mini-drag-zone" onMouseDown={handleWindowDragMouseDown}>
                <div className="mini-info mini-info-visible">
                  <span
                    className="mini-info-text mini-time-text"
                    title={`${state.targetTitle} · ${miniClockText}`}
                    style={{ color: state.accentColor }}
                  >
                    {miniClockText}
                  </span>
                </div>
              </div>
            </>
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

        {/* Content */}
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
                now={now}
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
            {activeTab === 'settings' && (
              <SettingsTab
                isMuted={state.isMuted}
                setIsMuted={state.setIsMuted}
                widgetOpacity={state.widgetOpacity}
                setWidgetOpacity={state.setWidgetOpacity}
                countdownStyle={state.countdownStyle}
                setCountdownStyle={state.setCountdownStyle}
                accentColor={state.accentColor}
                setAccentColor={state.setAccentColor}
                onSound={(type) => playSound(type, state.isMuted)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Bottom nav */}
        <div className={`bottom-nav ${isMinimized ? 'bottom-nav-hidden' : 'bottom-nav-visible'}`}>
          {(
            [
              { tab: 'timer', Icon: Clock, label: '倒计时' },
              { tab: 'tasks', Icon: CheckSquare, label: '任务列表' },
              { tab: 'stats', Icon: BarChart2, label: '进度统计' },
              { tab: 'settings', Icon: Settings, label: '设置' },
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
    </div>
  );
}
