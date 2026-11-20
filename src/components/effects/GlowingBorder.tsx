import React from 'react';

interface GlowingBorderProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'emerald' | 'amber' | 'multi';
  active?: boolean;
}

export const GlowingBorder: React.FC<GlowingBorderProps> = ({
  children,
  className = '',
  glowColor = 'emerald',
  active = true,
}) => {
  if (!active) {
    return <div className={className}>{children}</div>;
  }

  const hoverBorderMap = {
    emerald: 'hover:border-emerald-600/40 dark:hover:border-emerald-500/35',
    amber: 'hover:border-amber-600/40 dark:hover:border-amber-500/35',
    multi: 'hover:border-zinc-300 dark:hover:border-white/20',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-border bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors duration-150 ${hoverBorderMap[glowColor]} ${className}`}
    >
      {children}
    </div>
  );
};
