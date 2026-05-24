import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { TimerRecord, formatTimeRange, formatDuration } from '../types';
import { buildTagColorMapFromRecords } from '../lib/tag-colors';

interface TimerTimelinePageProps {
  key?: React.Key;
  records: TimerRecord[];
  accentColor: string;
  /** The tag currently being timed, so it always gets the accent color */
  activeTag?: string;
}

export default function TimerTimelinePage({
  records,
  accentColor,
  activeTag,
}: TimerTimelinePageProps) {
  const sorted = [...records].sort((a, b) => b.startTime - a.startTime);

  // Build a stable tag → color map shared across all items in this render
  const colorMap = buildTagColorMapFromRecords(records, accentColor, activeTag);

  // ── Custom scrollbar state ──────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // thumbTop: 0–1 (fraction of track), thumbHeight: 0–1 (fraction of track)
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
    const thumbH = Math.max(clientHeight / scrollHeight, 0.08); // min 8% height
    const thumbT = (scrollTop / (scrollHeight - clientHeight)) * (1 - thumbH);
    setThumb({ top: thumbT, height: thumbH });
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

  // Recalculate on records change or resize
  useEffect(() => {
    updateScrollbar();
  }, [records, updateScrollbar]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updateScrollbar());
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScrollbar]);

  // Cleanup fade timer on unmount
  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
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
      {/* Header */}
      <div className="tl-header">
        <span className="tl-title">今日时间线</span>
        {records.length > 0 && (
          <span className="tl-count">{records.length} 条</span>
        )}
      </div>

      {/* Scrollable list + custom scrollbar wrapper */}
      <div
        className="tl-scroll-wrap"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Top fade mask — visible when content above */}
        <div
          className="tl-fade-top"
          style={{ opacity: canScrollUp ? 1 : 0 }}
          aria-hidden="true"
        />

        {/* Scrollable content */}
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
                // Don't show tag sub-label when it's identical to the title
                const showTag = record.tag && record.tag !== record.title;
                const isLast = index === sorted.length - 1;
                const tagKey = record.tag ?? '未分类';
                const dotColor = colorMap.get(tagKey) ?? accentColor;

                return (
                  <div key={record.id} className="tl-item">
                    {/* Left spine: dot + connector line */}
                    <div className="tl-spine">
                      <span
                        className="tl-dot"
                        style={{ backgroundColor: dotColor }}
                      />
                      {!isLast && <span className="tl-line" />}
                    </div>

                    {/* Content */}
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

        {/* Bottom fade mask — visible when content below */}
        <div
          className="tl-fade-bottom"
          style={{ opacity: canScrollDown ? 1 : 0 }}
          aria-hidden="true"
        />

        {/* Custom scrollbar track + thumb */}
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
