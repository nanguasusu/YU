import { Volume2, Power } from 'lucide-react';
import { motion } from 'motion/react';
import type { CountdownStyle } from '../types';

interface SettingsTabProps {
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  widgetOpacity: number;
  setWidgetOpacity: (opacity: number) => void;
  countdownStyle: CountdownStyle;
  setCountdownStyle: (style: CountdownStyle) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  autostart: boolean;
  toggleAutostart: (enabled: boolean) => void;
  onSound: (type: 'click') => void;
}

const STYLE_OPTIONS: { value: CountdownStyle; label: string }[] = [
  { value: 'sans', label: '无衬线' },
  { value: 'serif', label: 'Playfair' },
  { value: 'mono', label: 'Special' },
];

export function SettingsTab({
  isMuted,
  setIsMuted,
  widgetOpacity,
  setWidgetOpacity,
  countdownStyle,
  setCountdownStyle,
  accentColor,
  setAccentColor,
  autostart,
  toggleAutostart,
  onSound,
}: SettingsTabProps) {
  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15, transition: { duration: 0.15 } }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
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
              onClick={() => {
                if (isMuted) onSound('click');
                setIsMuted(!isMuted);
              }}
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

          {/* 数字字体 */}
          <div className="settings-item-col">
            <span className="settings-mini-label">倒计时字体</span>
            <div className="style-segmented">
              {STYLE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { onSound('click'); setCountdownStyle(value); }}
                  className={`style-chip ${countdownStyle === value ? 'style-chip-active' : 'style-chip-inactive'}`}
                >
                  {label}
                </button>
              ))}
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

        </div>
      </div>
    </motion.div>
  );
}
