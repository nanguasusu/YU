import React from 'react';
import { motion } from 'motion/react';
import { formatTotalHours, formatDuration, TimerRecord } from '../types';
import { buildTagColorMapFromRecords } from '../lib/tag-colors';

interface TimerStatsPageProps {
  key?: React.Key;
  records: TimerRecord[];
  accentColor: string;
  /** The tag currently being timed, so it always gets the accent color */
  activeTag?: string;
}

type TagStat = {
  tag: string;
  totalMs: number;
  /** 显示用百分比字符串，如 "34%"、"<1%" */
  percentageLabel: string;
  /** 进度条宽度（0–100），使用精确值避免 <1% 时进度条消失 */
  barWidth: number;
  color: string;
};

function computeTagStats(
  records: TimerRecord[],
  accentColor: string,
  activeTag?: string,
): TagStat[] {
  const totalMs = records.reduce((sum, r) => sum + r.duration, 0);
  if (totalMs === 0) return [];

  const tagMap = new Map<string, number>();
  for (const record of records) {
    const key = record.tag ?? '未分类';
    tagMap.set(key, (tagMap.get(key) ?? 0) + record.duration);
  }

  const sorted = [...tagMap.entries()].sort((a, b) => b[1] - a[1]);
  const colorMap = buildTagColorMapFromRecords(records, accentColor, activeTag);

  return sorted.map(([tag, ms]) => {
    const exact = (ms / totalMs) * 100;
    const rounded = Math.round(exact);
    const percentageLabel = rounded === 0 ? '<1%' : `${rounded}%`;
    return {
      tag,
      totalMs: ms,
      percentageLabel,
      barWidth: exact,
      color: colorMap.get(tag) ?? accentColor,
    };
  });
}

export default function TimerStatsPage({
  records,
  accentColor,
  activeTag,
}: TimerStatsPageProps) {
  const stats = computeTagStats(records, accentColor, activeTag);
  const totalMs = records.reduce((sum, r) => sum + r.duration, 0);

  return (
    <motion.div
      className="ts-page"
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15, transition: { duration: 0.15 } }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="ts-header">
        <span className="ts-title">今日统计</span>
        {totalMs > 0 && (
          <span className="ts-total">{formatTotalHours(totalMs)}</span>
        )}
      </div>

      {records.length === 0 ? (
        <div className="ts-empty">
          <span>今天还没有记录</span>
        </div>
      ) : (
        <div className="ts-list">
          {stats.map((s) => (
            <div key={s.tag} className="ts-item">
              <div className="ts-item-row">
                <span
                  className="ts-dot"
                  style={{ backgroundColor: s.color }}
                />
                <span className="ts-tag">{s.tag}</span>
                <span className="ts-time">
                  {formatDuration(s.totalMs)}
                  <span className="ts-pct"> · {s.percentageLabel}</span>
                </span>
              </div>
              <div className="ts-bar-bg">
                <div
                  className="ts-bar-fill"
                  style={{ width: `${s.barWidth}%`, backgroundColor: s.color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
