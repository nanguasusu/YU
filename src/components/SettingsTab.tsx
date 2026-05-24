import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Power, ChevronRight, ChevronLeft, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { MiniTimerFont } from '../types';

interface SettingsTabProps {
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  widgetOpacity: number;
  setWidgetOpacity: (opacity: number) => void;
  miniTimerFont: MiniTimerFont;
  setMiniTimerFont: (font: MiniTimerFont) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  autostart: boolean;
  toggleAutostart: (enabled: boolean) => void;
  timerLabels: string[];
  setTimerLabels: (labels: string[]) => void;
  onSound: (type: 'click') => void;
}

const MINI_FONT_OPTIONS: { value: MiniTimerFont; label: string; preview: string }[] = [
  { value: 'mono',    label: '等宽',   preview: '00:00' },
  { value: 'digital', label: '数码',   preview: '00:00' },
  { value: 'rounded', label: '圆润',   preview: '00:00' },
  { value: 'thin',    label: '纤细',   preview: '00:00' },
  { value: 'serif',   label: '衬线',   preview: '00:00' },
  { value: 'sans',    label: '黑体',   preview: '00:00' },
];

const MAX_LABEL_LENGTH = 10;
const MAX_LABELS = 20;

// ── Sub-page: Timer Labels ────────────────────────────────────────────────

function TimerLabelsPage({
  labels,
  setLabels,
  accentColor,
  onBack,
}: {
  key?: React.Key;
  labels: string[];
  setLabels: (labels: string[]) => void;
  accentColor: string;
  onBack: () => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleAdd = () => {
    const trimmed = inputValue.trim().slice(0, MAX_LABEL_LENGTH);
    if (!trimmed) return;
    if (labels.includes(trimmed)) {
      setError('标签已存在');
      return;
    }
    if (labels.length >= MAX_LABELS) {
      setError('最多 20 个标签');
      return;
    }
    setLabels([...labels, trimmed]);
    setInputValue('');
    setError('');
  };

  const handleDelete = (label: string) => {
    setLabels(labels.filter((l) => l !== label));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
    if (e.key === 'Escape') { setInputValue(''); setError(''); }
  };

  return (
    <motion.div
      key="labels-page"
      className="settings-motion"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* Sub-page top bar */}
      <div className="stl-topbar">
        <button
          type="button"
          className="stl-back-btn"
          onClick={onBack}
          aria-label="返回设置"
        >
          <ChevronLeft size={16} strokeWidth={2} />
          <span>返回</span>
        </button>
        <span className="stl-page-title">常用标签</span>
      </div>

      <div className="settings-scroll">
        {/* Label list */}
        <div className="stl-label-list">
          {labels.length === 0 && (
            <span className="stl-empty">暂无标签</span>
          )}
          {labels.map((label) => (
            <div key={label} className="stl-label-item">
              <span className="stl-label-name">{label}</span>
              <button
                type="button"
                className="stl-delete-btn"
                onClick={() => handleDelete(label)}
                aria-label={`删除标签 ${label}`}
              >
                <X size={13} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>

        {/* Add input */}
        {labels.length < MAX_LABELS && (
          <div className="stl-add-row">
            <input
              ref={inputRef}
              type="text"
              className="stl-add-input"
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value.slice(0, MAX_LABEL_LENGTH)); setError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="添加标签..."
              maxLength={MAX_LABEL_LENGTH}
              aria-label="新标签名称"
            />
            <button
              type="button"
              className="stl-add-btn"
              style={{ color: accentColor }}
              onClick={handleAdd}
              disabled={!inputValue.trim()}
              aria-label="添加"
            >
              <Plus size={16} strokeWidth={2} />
            </button>
          </div>
        )}
        {error && <span className="stl-error">{error}</span>}
      </div>
    </motion.div>
  );
}

// ── Main settings page ────────────────────────────────────────────────────

export function SettingsTab({
  isMuted,
  setIsMuted,
  widgetOpacity,
  setWidgetOpacity,
  miniTimerFont,
  setMiniTimerFont,
  accentColor,
  setAccentColor,
  autostart,
  toggleAutostart,
  timerLabels,
  setTimerLabels,
  onSound,
}: SettingsTabProps) {
  const [page, setPage] = useState<'main' | 'labels'>('main');

  return (
    <AnimatePresence mode="wait">
      {page === 'labels' ? (
        <TimerLabelsPage
          key="labels"
          labels={timerLabels}
          setLabels={setTimerLabels}
          accentColor={accentColor}
          onBack={() => setPage('main')}
        />
      ) : (
        <motion.div
          key="main"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="settings-motion"
        >
          <div className="settings-scroll">
            <div className="tab-header">应用设置</div>
            <div className="settings-list">

              {/* 静音 */}
              <div className="settings-item">
                <div className="settings-label">
                  <Volume2 className="settings-icon" />
                  <span className="settings-text">静音开关</span>
                </div>
                <button
                  type="button"
                  onClick={() => { if (isMuted) onSound('click'); setIsMuted(!isMuted); }}
                  className={`toggle-btn ${isMuted ? 'toggle-btn-on' : 'toggle-btn-off'}`}
                  aria-pressed={isMuted}
                  aria-label={isMuted ? '关闭静音' : '开启静音'}
                >
                  <div className={`toggle-knob ${isMuted ? 'toggle-knob-on' : 'toggle-knob-off'}`} />
                </button>
              </div>

              {/* 开机自启动 */}
              <div className="settings-item">
                <div className="settings-label">
                  <Power className="settings-icon" />
                  <span className="settings-text">开机自启动</span>
                </div>
                <button
                  type="button"
                  onClick={() => { onSound('click'); void toggleAutostart(!autostart); }}
                  className={`toggle-btn ${autostart ? 'toggle-btn-on' : 'toggle-btn-off'}`}
                  aria-pressed={autostart}
                  aria-label={autostart ? '关闭开机自启动' : '开启开机自启动'}
                >
                  <div className={`toggle-knob ${autostart ? 'toggle-knob-on' : 'toggle-knob-off'}`} />
                </button>
              </div>

              {/* 透明度 */}
              <div className="settings-item-col">
                <span className="settings-mini-label">透明度</span>
                <div className="settings-mini-row">
                  <input
                    type="range"
                    min={20}
                    max={100}
                    step={1}
                    value={widgetOpacity}
                    onChange={(e) => setWidgetOpacity(Number(e.target.value))}
                    className="opacity-slider"
                    aria-label="窗口透明度"
                  />
                  <span className="settings-mini-value">{widgetOpacity}%</span>
                </div>
              </div>

              {/* 全局色彩 */}
              <div className="settings-item">
                <div className="settings-label" style={{ marginBottom: 0 }}>
                  <svg className="settings-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <circle cx="8" cy="8" r="6.5" />
                    <path d="M8 1.5C8 1.5 11 4.5 11 7a3 3 0 0 1-6 0c0-2.5 3-5.5 3-5.5Z" fill="currentColor" stroke="none" opacity="0.5" />
                  </svg>
                  <span className="settings-text">全局色彩</span>
                </div>
                <label className="color-picker-wrap" aria-label="选择主题色">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="color-picker-input"
                  />
                  <span className="color-picker-swatch" style={{ background: accentColor }} />
                </label>
              </div>

              {/* ── 计时器分组 ── */}
              <div className="settings-section-divider" />

              <div className="settings-section-label">计时器</div>

              {/* 迷你计时器字体 */}
              <div className="settings-item-col">
                <span className="settings-mini-label">迷你时钟字体</span>
                <div className="mini-font-grid">
                  {MINI_FONT_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { onSound('click'); setMiniTimerFont(value); }}
                      className={`mini-font-chip ${miniTimerFont === value ? 'mini-font-chip-active' : 'mini-font-chip-inactive'}`}
                      style={miniTimerFont === value ? { borderColor: accentColor, color: accentColor } : undefined}
                    >
                      <span className={`mini-font-preview mini-time-font-${value}`}>
                        12:34
                      </span>
                      <span className="mini-font-label">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 常用标签 nav row */}
              <button
                type="button"
                className="settings-nav-row"
                onClick={() => setPage('labels')}
                aria-label="管理常用标签"
              >
                <span className="settings-nav-row-label">常用标签</span>
                <span className="settings-nav-row-meta">
                  {timerLabels.length} 个
                  <ChevronRight size={14} strokeWidth={2} className="settings-nav-row-chevron" />
                </span>
              </button>

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
