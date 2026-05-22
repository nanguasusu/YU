import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import type { AppMode } from '../types';

interface ModeMenuProps {
  appMode: AppMode;
  accentColor: string;
  onSwitch: (mode: AppMode) => void;
  onClose: () => void;
  availableModes: AppMode[];
}

const MODE_LABELS: Record<AppMode, string> = {
  widget: '桌面挂件',
  timer: '计时钟',
};

export function ModeMenu({ appMode, accentColor, onSwitch, onClose, availableModes }: ModeMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <motion.div
      className="mode-menu"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      ref={menuRef}
      role="menu"
      aria-label="模式切换"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Current mode indicator */}
      <div className="mode-menu-current">
        <span className="mode-menu-dot" style={{ backgroundColor: accentColor }} />
        <span className="mode-menu-current-label">{MODE_LABELS[appMode]}</span>
        <span className="mode-menu-badge">当前</span>
      </div>

      <div className="mode-menu-divider" />

      {/* Switch buttons — dynamically rendered from availableModes */}
      {availableModes.map((mode) => (
        <button
          key={mode}
          type="button"
          className="mode-menu-switch"
          role="menuitem"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => {
            onSwitch(mode);
            onClose();
          }}
        >
          切换到{MODE_LABELS[mode]}
        </button>
      ))}
    </motion.div>
  );
}
