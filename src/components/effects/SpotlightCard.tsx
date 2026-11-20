import React, { useRef } from 'react';

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: 'emerald' | 'amber' | 'blue';
  lift?: boolean;
}

const SPOTLIGHT_MAP = {
  emerald: 'rgba(5, 150, 105, 0.09)',
  amber: 'rgba(217, 119, 6, 0.09)',
  blue: 'rgba(37, 99, 235, 0.09)',
};

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
  spotlightColor = 'emerald',
  lift = false,
  onMouseMove,
  style,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--hl-mx', `${e.clientX - rect.left}px`);
      el.style.setProperty('--hl-my', `${e.clientY - rect.top}px`);
    }
    onMouseMove?.(e);
  };

  const hasCustomBg = /\bbg-/.test(className);
  const hasCustomBorder = /\bborder-(?!t-|b-|l-|r-|x-|y-)/.test(className);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      style={
        {
          '--hl-spot-color': SPOTLIGHT_MAP[spotlightColor],
          ...style,
        } as React.CSSProperties
      }
      className={`hl-spotlight relative rounded-xl border ${
        hasCustomBg ? '' : 'bg-[#FFFFFF]'
      } ${hasCustomBorder ? '' : 'border-[#E4E4E7] hover:border-[#D4D4D8]'} shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors duration-200 ${
        lift ? 'hl-card-lift' : ''
      } ${className}`}
      {...props}
    >
      <div className="relative z-[2] h-full">{children}</div>
    </div>
  );
};
