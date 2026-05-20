interface BrandClockIconProps {
  accentColor: string;
  size?: number;
  className?: string;
}

export function BrandClockIcon({ accentColor, size = 32, className = 'brand-icon' }: BrandClockIconProps) {
  return (
    <div className={className} aria-hidden="true">
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
    </div>
  );
}
