import React from 'react';
import { Settings, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { usePersistedState } from './hooks/usePersistedState';
import { playSound } from './lib/sound';
import { BrandClockIcon } from './components/BrandClockIcon';
import { SettingsTab } from './components/SettingsTab';
import './App.css';

export default function SettingsWindow() {
  const state = usePersistedState({ trackWindowWidth: false, persistMode: 'settings' });
  const isTauriWindow = '__TAURI_INTERNALS__' in window;

  const closeSettingsWindow = async () => {
    playSound('click', state.isMuted);
    if (!isTauriWindow) return; // browser preview — no IPC available
    try {
      await getCurrentWindow().close();
    } catch (err) {
      console.error('[settings] close failed', err);
    }
  };

  const startDragging = async () => {
    try {
      await getCurrentWindow().startDragging();
    } catch {
      // browser preview has no draggable shell
    }
  };

  return (
    <div className={`app-wrapper settings-window-wrapper ${isTauriWindow ? '' : 'settings-window-browser'}`}>
      <div
        className="settings-window-shell"
        style={{ backgroundColor: `rgba(255, 255, 255, ${Math.max(state.widgetOpacity, 92) / 100})` }}
      >
        <div className="settings-window-topbar">
          <div
            className={`settings-window-title ${isTauriWindow ? 'settings-window-dragzone' : ''}`}
            onMouseDown={(e) => {
              if (e.button !== 0 || !isTauriWindow) return;
              e.preventDefault();
              void startDragging();
            }}
          >
            <BrandClockIcon accentColor={state.accentColor} size={28} />
            <div className="settings-window-title-copy">
              <span className="settings-window-kicker">应用偏好</span>
              <span className="settings-window-heading">
                <Settings className="settings-window-heading-icon" strokeWidth={2} />
                设置
              </span>
            </div>
          </div>
          <button
            type="button"
            className="icon-button settings-window-close"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              void closeSettingsWindow();
            }}
            aria-label="关闭设置窗口"
          >
            <X className="action-icon" strokeWidth={2} />
          </button>
        </div>

        <div className="settings-window-content">
          <SettingsTab
            isMuted={state.isMuted}
            setIsMuted={state.setIsMuted}
            widgetOpacity={state.widgetOpacity}
            setWidgetOpacity={state.setWidgetOpacity}
            miniTimerFont={state.miniTimerFont}
            setMiniTimerFont={state.setMiniTimerFont}
            accentColor={state.accentColor}
            setAccentColor={state.setAccentColor}
            autostart={state.autostart}
            toggleAutostart={state.toggleAutostart}
            timerLabels={state.timerLabels}
            setTimerLabels={state.setTimerLabels}
            onSound={(type) => playSound(type, state.isMuted)}
          />
        </div>
      </div>
    </div>
  );
}
