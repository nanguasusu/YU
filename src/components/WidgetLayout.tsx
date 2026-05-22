import { AnimatePresence } from 'motion/react';
import { Clock, CheckSquare, BarChart2 } from 'lucide-react';

import { usePersistedState } from '../hooks/usePersistedState';
import { useTagStore } from '../hooks/useTagStore';
import { playSound } from '../lib/sound';
import { TimerTab } from './TimerTab';
import { TasksTab } from './TasksTab';
import { StatsTab } from './StatsTab';
import type { WidgetTab, SoundType } from '../types';

interface WidgetLayoutProps {
  activeTab: WidgetTab;
  setActiveTab: (tab: WidgetTab) => void;
  state: ReturnType<typeof usePersistedState>;
  tagStore: ReturnType<typeof useTagStore>;
  accentColor: string;
  onSound: (type: SoundType) => void;
}

const NAV_ITEMS = [
  { tab: 'countdown' as WidgetTab, Icon: Clock,       label: '计时器' },
  { tab: 'tasks'     as WidgetTab, Icon: CheckSquare, label: '任务列表' },
  { tab: 'progress'  as WidgetTab, Icon: BarChart2,   label: '进度统计' },
] as const;

export function WidgetLayout({
  activeTab,
  setActiveTab,
  state,
  accentColor,
  onSound,
}: WidgetLayoutProps) {
  const changeTab = (tab: WidgetTab) => {
    if (activeTab === tab) return;
    playSound('click', state.isMuted);
    setActiveTab(tab);
  };

  return (
    <>
      <div className="content-area content-visible">
        <AnimatePresence mode="wait">
          {activeTab === 'countdown' && (
            <TimerTab
              key="countdown"
              targetTitle={state.targetTitle}
              setTargetTitle={state.setTargetTitle}
              targetDate={state.targetDate}
              setTargetDate={state.setTargetDate}
              countdownStyle={state.countdownStyle}
              accentColor={accentColor}
            />
          )}
          {activeTab === 'tasks' && (
            <TasksTab
              key="tasks"
              tasks={state.tasks}
              accentColor={accentColor}
              onToggle={state.toggleTask}
              onDelete={state.deleteTask}
              onAdd={state.addTask}
              onClearCompleted={state.clearCompletedTasks}
              onSound={(type) => onSound(type)}
            />
          )}
          {activeTab === 'progress' && (
            <StatsTab
              key="progress"
              progressItems={state.progressItems}
              onAdd={state.addProgress}
              onDelete={state.deleteProgress}
              onUpdateTitle={state.updateProgressTitle}
              onNormalizeTitle={state.normalizeProgressTitle}
              onUpdateTotal={state.updateProgressTotal}
              onUpdateProgress={state.updateProgress}
              onSound={(type) => onSound(type)}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="bottom-nav bottom-nav-visible">
        {NAV_ITEMS.map(({ tab, Icon, label }) => (
          <button
            key={tab}
            type="button"
            onClick={() => changeTab(tab)}
            className={`nav-btn ${activeTab === tab ? 'nav-btn-active' : 'nav-btn-inactive'}`}
            style={activeTab === tab ? { color: accentColor } : undefined}
            aria-label={label}
          >
            <Icon className="nav-icon" strokeWidth={2} />
          </button>
        ))}
      </div>
    </>
  );
}
