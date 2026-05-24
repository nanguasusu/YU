import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { TimerRecord, formatTimeRange, formatDuration } from '../types';
import { buildTagColorMapFromRecords } from '../lib/tag-colors';

interface TimerTimelinePageProps {
  key?: React.Key;
  records: TimerRecord[];
  accentColor: string;
  activeTag?: string;
}

export default function TimerTimelinePage({
  records,
  accentColor,
  activeTag,
}: TimerTimelinePageProps) {
  const sorted = useMemo(
    () => [...records].sort((a, b) => b.startTime - a.startTime),
    [records],
  );
  const colorMap = useMemo(
    () => buildTagColorMapFromRecords(records, accentColor, activeTag),
    [records, accentColor, activeTag],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [thumb, setThumb] = useState({ top: 0, height: 1 });
  const [visible, setVisible] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const updateScrollbar = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const scrollable = scrollHeight > clientHeight;
    if (!scrollable) {
      setThumb({ top: 0, height: 1 });
      setCanScrollUp(false);
      setCanScrollDown(false);
      return;
    }

    const thumbHeight = Math.max(clientHeight / scrollHeight, 0.08);
    const thumbTop = (scrollTop / (scrollHeight - clientHeight)) * (1 - thumbHeight);
    setThumb({ top: thumbTop, height: thumbHeight });
    setCanScrollUp(scrollTop > 2);
    setCanScrollDown(scrollTop < scrollHeight - clientHeight - 2);
  }, []);

  const showScrollbar = useCallback(() => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setVisible(true);
    fadeTimerRef.current = setTimeout(() => setVisible(false), 1200);
  }, []);

  const handleScroll = useCallback(() => {
    updateScrollbar();
    showScrollbar();
  }, [updateScrollbar, showScrollbar]);

  useEffect(() => {
    updateScrollbar();
  }, [sorted, updateScrollbar]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => updateScrollbar());
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateScrollbar]);

  useEffect(() => () => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    updateScrollbar();
    setVisible(true);
  }, [updateScrollbar]);

  const handleMouseLeave = useCallback(() => {
    fadeTimerRef.current = setTimeout(() => setVisible(false), 600);
  }, []);

  return (
    <motion.div
      className="tl-page"
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15, transition: { duration: 0.15 } }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="tl-header">
        <span className="tl-title">今日时间线</span>
        {records.length > 0 && (
          <span className="tl-count">{records.length} 条</span>
        )}
      </div>

      <div
        className="tl-scroll-wrap"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="tl-fade-top"
          style={{ opacity: canScrollUp ? 1 : 0 }}
          aria-hidden="true"
        />

        <div
          ref={scrollRef}
          className="tl-scroll"
          onScroll={handleScroll}
        >
          {sorted.length === 0 ? (
            <div className="tl-empty">
              <span>今天还没有记录</span>
            </div>
          ) : (
            <div className="tl-list">
              {sorted.map((record, index) => {
                const showTag = record.tag && record.tag !== record.title;
                const isLast = index === sorted.length - 1;
                const tagKey = record.tag ?? '未分类';
                const dotColor = colorMap.get(tagKey) ?? accentColor;

                return (
                  <div key={record.id} className="tl-item">
                    <div className="tl-spine">
                      <span
                        className="tl-dot"
                        style={{ backgroundColor: dotColor }}
                      />
                      {!isLast && <span className="tl-line" />}
                    </div>

                    <div className="tl-content">
                      <div className="tl-meta">
                        <span className="tl-time-range">
                          {formatTimeRange(record.startTime, record.endTime)}
                        </span>
                        <span className="tl-duration">
                          {formatDuration(record.duration)}
                        </span>
                      </div>
                      <span className="tl-item-title">{record.title}</span>
                      {showTag && (
                        <span className="tl-item-tag">{record.tag}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="tl-fade-bottom"
          style={{ opacity: canScrollDown ? 1 : 0 }}
          aria-hidden="true"
        />

        <div className="tl-scrollbar-track" aria-hidden="true">
          <div
            className="tl-scrollbar-thumb"
            style={{
              top: `${thumb.top * 100}%`,
              height: `${thumb.height * 100}%`,
              opacity: visible ? 1 : 0,
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}
