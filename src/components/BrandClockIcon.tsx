import React from 'react';

interface BrandClockIconProps {
  accentColor: string;
  size?: number;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Accessible label — required when onClick is provided */
  ariaLabel?: string;
  /** Icon variant: 'timer' (default clock) or 'widget' (calendar/widget icon) */
  variant?: 'timer' | 'widget';
}

export function BrandClockIcon({
  accentColor,
  size = 32,
  className = 'brand-icon',
  onClick,
  onMouseDown,
  ariaLabel,
  variant = 'timer',
}: BrandClockIconProps) {
  const timerSvg = (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="16" fill={accentColor} opacity="0.10" />
      <circle cx="18" cy="18" r="11" fill={accentColor} opacity="0.15" />
      <circle cx="18" cy="18" r="8.5" fill="white" opacity="0.7" />
      <circle cx="18" cy="18" r="8.5" stroke={accentColor} strokeWidth="1.5" fill="none" opacity="0.6" />
      <line x1="18" y1="18" x2="18" y2="12.5" stroke={accentColor} strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
      <line x1="18" y1="18" x2="22" y2="18" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
      <circle cx="18" cy="18" r="1.2" fill={accentColor} opacity="0.9" />
      <g opacity="0.7" transform="translate(27, 8)">
        <line x1="0" y1="-2.5" x2="0" y2="2.5" stroke={accentColor} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="-2.5" y1="0" x2="2.5" y2="0" stroke={accentColor} strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  );

  // Widget mode icon: a soft calendar/widget shape
  // Rounded rect body + header bar + a bold number "1" + small dot grid
  const widgetSvg = (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer glow ring */}
      <rect x="4" y="5" width="28" height="27" rx="7" fill={accentColor} opacity="0.10" />
      {/* Card body */}
      <rect x="6" y="7" width="24" height="22" rx="5.5" fill="white" opacity="0.72" />
      <rect x="6" y="7" width="24" height="22" rx="5.5" stroke={accentColor} strokeWidth="1.4" opacity="0.55" />
      {/* Header bar */}
      <rect x="6" y="7" width="24" height="8" rx="5.5" fill={accentColor} opacity="0.18" />
      {/* Two ring tabs at top */}
      <rect x="12.5" y="5" width="2.5" height="5" rx="1.25" fill={accentColor} opacity="0.55" />
      <rect x="21" y="5" width="2.5" height="5" rx="1.25" fill={accentColor} opacity="0.55" />
      {/* Big day number */}
      <text
        x="18" y="24"
        textAnchor="middle"
        fontFamily="ui-rounded, system-ui, sans-serif"
        fontWeight="700"
        fontSize="11"
        fill={accentColor}
        opacity="0.85"
      >
        31
      </text>
      {/* Three small dots — task list hint */}
      <circle cx="12" cy="12" r="1.3" fill={accentColor} opacity="0.6" />
      <circle cx="18" cy="12" r="1.3" fill={accentColor} opacity="0.6" />
      <circle cx="24" cy="12" r="1.3" fill={accentColor} opacity="0.6" />
    </svg>
  );

  const svg = variant === 'widget' ? widgetSvg : timerSvg;

  if (onClick) {
    return (
      <button
        type="button"
        className={`${className} brand-icon-btn`}
        onClick={onClick}
        onMouseDown={onMouseDown}
        aria-label={ariaLabel ?? '模式切换'}
        title={ariaLabel ?? '模式切换'}
      >
        {svg}
      </button>
    );
  }

  return (
    <div className={className} aria-hidden="true">
      {svg}
    </div>
  );
}
