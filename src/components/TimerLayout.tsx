import React from 'react';
import { AnimatePresence } from 'motion/react';
import { Play, List, PieChart } from 'lucide-react';

import { usePersistedState } from '../hooks/usePersistedState';
import { playSound } from '../lib/sound';
import { TimerStartPage } from './TimerStartPage';
import TimerTimelinePage from './TimerTimelinePage';
import TimerStatsPage from './TimerStatsPage';
import type { TimerTab, TimerRecord } from '../types';

interface TimerLayoutProps {
  timerTab: TimerTab;
  setTimerTab: (tab: TimerTab) => void;
  records: TimerRecord[];
  addRecord: (record: TimerRecord) => Promise<void>;
  liveElapsedMs: number;
  state: ReturnType<typeof usePersistedState>;
  accentColor: string;
  timerLabels: string[];
  /** The tag currently being timed — passed to stats/timeline for accent-color priority */
  activeTag?: string;
}

const NAV_ITEMS = [
  { tab: 'start'    as TimerTab, Icon: Play,     label: '开始计时' },
  { tab: 'timeline' as TimerTab, Icon: List,     label: '时间线' },
  { tab: 'stats'    as TimerTab, Icon: PieChart, label: '统计' },
] as const;

export function TimerLayout({
  timerTab,
  setTimerTab,
  records,
  addRecord,
  liveElapsedMs,
  state,
  accentColor,
  timerLabels,
  activeTag,
}: TimerLayoutProps) {
  const changeTab = (tab: TimerTab) => {
    if (timerTab === tab) return;
    playSound('click', state.isMuted);
    setTimerTab(tab);
  };

  return (
    <>
      <div className="content-area content-visible">
        <AnimatePresence mode="wait">
          {timerTab === 'start' && (
            <TimerStartPage
              key="start"
              state={state}
              timerLabels={timerLabels}
              accentColor={accentColor}
              onAddRecord={addRecord}
              liveElapsedMs={liveElapsedMs}
            />
          )}
          {timerTab === 'timeline' && (
            <TimerTimelinePage
              key="timeline"
              records={records}
              accentColor={accentColor}
              activeTag={activeTag}
            />
          )}
          {timerTab === 'stats' && (
            <TimerStatsPage
              key="stats"
              records={records}
              accentColor={accentColor}
              activeTag={activeTag}
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
            className={`nav-btn ${timerTab === tab ? 'nav-btn-active' : 'nav-btn-inactive'}`}
            style={timerTab === tab ? { color: accentColor } : undefined}
            aria-label={label}
          >
            <Icon className="nav-icon" strokeWidth={2} />
          </button>
        ))}
      </div>
    </>
  );
}
