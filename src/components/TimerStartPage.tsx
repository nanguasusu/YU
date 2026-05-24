import React from 'react';
import { RotateCcw, Square } from 'lucide-react';
import { motion } from 'motion/react';
import { TagPicker } from './TagPicker';
import { formatElapsedTime } from '../types';
import type { TimerRecord } from '../types';
import type { usePersistedState } from '../hooks/usePersistedState';

interface TimerStartPageProps {
  state: ReturnType<typeof usePersistedState>;
  timerLabels: string[];
  accentColor: string;
  onAddRecord: (record: TimerRecord) => Promise<void>;
  liveElapsedMs: number;
}

export const TimerStartPage: React.FC<TimerStartPageProps> = ({
  state,
  timerLabels,
  accentColor,
  onAddRecord,
  liveElapsedMs,
}) => {
  const handleStopAndRecord = async () => {
    const now = Date.now();
    const totalElapsed =
      state.elapsedMs +
      (state.timerStatus === 'running' && state.lastStartedAt !== null
        ? Math.max(0, now - state.lastStartedAt)
        : 0);

    if (totalElapsed < 1000) {
      state.resetTimer();
      return;
    }

    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const record: TimerRecord = {
      id,
      title: state.activityTag || '未命名',
      tag: state.activityTag || undefined,
      startTime: now - totalElapsed,
      endTime: now,
      duration: totalElapsed,
      note: '',
    };

    await onAddRecord(record);
    state.resetTimer();
  };

  const isRunning = state.timerStatus === 'running';
  const isPaused = state.timerStatus === 'paused';
  const isIdle = state.timerStatus === 'idle';

  const statusLabel = isRunning ? '进行中' : isPaused ? '已暂停' : '待开始';
  const hasTime = !isIdle || state.elapsedMs > 0;

  return (
    <motion.div
      className="tsp-page"
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15, transition: { duration: 0.15 } }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* ── Tag picker — always the top entry point ── */}
      <div className="tsp-tag-row">
        <TagPicker
          currentTag={state.activityTag}
          onSelectTag={state.selectActivityTag}
          accentColor={accentColor}
          labels={timerLabels}
        />
      </div>

      {/* ── Central time display — no card, just the number ── */}
      <div className="tsp-time-block">
        <span
          className={`tsp-time mini-time-font-${state.miniTimerFont}`}
          style={{ color: accentColor }}
        >
          {formatElapsedTime(liveElapsedMs)}
        </span>
        <span className="tsp-status">
          <span
            className="tsp-status-dot"
            style={{
              backgroundColor: isRunning
                ? accentColor
                : isPaused
                  ? '#9ca3af'
                  : '#d1d5db',
            }}
          />
          {statusLabel}
        </span>
      </div>

      {/* ── Action row ── */}
      <div className="tsp-actions">
        <button
          type="button"
          className="tsp-btn-ghost"
          onClick={() => state.resetTimer()}
          aria-label="重置计时器"
          disabled={!hasTime}
        >
          <RotateCcw size={15} strokeWidth={2} />
          <span>重置</span>
        </button>

        {isIdle ? (
          <button
            type="button"
            className="tsp-btn-primary"
            style={{ backgroundColor: accentColor }}
            onClick={() => state.startOrResumeTimer()}
            disabled={!state.activityTag.trim()}
            aria-label="开始计时"
          >
            开始
          </button>
        ) : isRunning ? (
          <button
            type="button"
            className="tsp-btn-primary"
            style={{ backgroundColor: accentColor }}
            onClick={() => state.pauseTimer()}
            aria-label="暂停计时"
          >
            暂停
          </button>
        ) : (
          <button
            type="button"
            className="tsp-btn-primary"
            style={{ backgroundColor: accentColor }}
            onClick={() => state.startOrResumeTimer()}
            aria-label="继续计时"
          >
            继续
          </button>
        )}

        <button
          type="button"
          className="tsp-btn-ghost"
          onClick={() => void handleStopAndRecord()}
          aria-label="结束并记录"
          disabled={!hasTime}
        >
          <Square size={15} strokeWidth={2} />
          <span>结束</span>
        </button>
      </div>
    </motion.div>
  );
};
