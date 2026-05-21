import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { buildDateFromInput, formatDateInput, DEFAULT_TARGET_TITLE } from '../types';
import type { CountdownStyle } from '../types';

interface TimerTabProps {
  targetTitle: string;
  setTargetTitle: (title: string) => void;
  targetDate: Date;
  setTargetDate: (date: Date) => void;
  countdownStyle: CountdownStyle;
  accentColor: string;
}

export function TimerTab({
  targetTitle,
  setTargetTitle,
  targetDate,
  setTargetDate,
  countdownStyle,
  accentColor,
}: TimerTabProps) {
  const [isEditingTargetTitle, setIsEditingTargetTitle] = useState(false);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(formatDateInput(targetDate));
  const [dateError, setDateError] = useState('');
  // Own clock — only re-renders when the day count changes (at midnight).
  // No need for a 1-second interval in expanded mode since we only show days.
  const [now, setNow] = useState(new Date());
  const tickHandleRef = useRef<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const scheduleNextMidnight = () => {
      const n = new Date();
      const msUntilMidnight =
        new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1).getTime() - n.getTime();
      tickHandleRef.current = setTimeout(() => {
        setNow(new Date());
        // After first midnight hit, tick every 24 h
        tickHandleRef.current = setInterval(() => setNow(new Date()), 24 * 60 * 60 * 1000);
      }, msUntilMidnight);
    };
    scheduleNextMidnight();
    return () => {
      if (tickHandleRef.current !== null) {
        clearTimeout(tickHandleRef.current as ReturnType<typeof setTimeout>);
        clearInterval(tickHandleRef.current as ReturnType<typeof setInterval>);
      }
    };
  }, []);

  const diff = Math.max(0, targetDate.getTime() - now.getTime());
  const d = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const hasOverdueTarget = targetDate.getTime() < now.getTime();

  const saveTargetDate = () => {
    const nextDate = buildDateFromInput(tempTarget);
    if (Number.isNaN(nextDate.getTime())) {
      setDateError('请输入有效日期');
      return;
    }
    setTargetDate(nextDate);
    setDateError('');
    setIsEditingTarget(false);
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

  const titleInput = (
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
  );

  const titleButton = (
    <button
      type="button"
      className="target-title-inline-btn"
      onClick={() => setIsEditingTargetTitle(true)}
    >
      {targetTitle}
    </button>
  );

  return (
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
            {isEditingTargetTitle ? titleInput : titleButton}
            <span> 日期已到</span>
          </>
        ) : (
          <>
            <span>距离 </span>
            {isEditingTargetTitle ? titleInput : titleButton}
            <span> 还有</span>
          </>
        )}
      </div>

      <div className="timer-content">
        <div className={`timer-container timer-font-${countdownStyle}`}>
          <span
            className={`timer-number timer-number-${countdownStyle}`}
            style={{ color: accentColor }}
          >
            {d}
          </span>
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
                  onBlur={() => { if (!dateError) saveTargetDate(); }}
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
  );
}
