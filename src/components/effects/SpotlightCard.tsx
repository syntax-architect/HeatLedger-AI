import React from 'react';

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: 'emerald' | 'amber' | 'blue';
  lift?: boolean;
}

/**
 * Quiet raised surface container using hairline contrast rather than radial spotlight glow.
 */
export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
  spotlightColor: _spotlightColor,
  lift: _lift,
  ...props
}) => {
  const hasCustomBg = /\bbg-/.test(className);
  const hasCustomBorder = /\bborder-(?!t-|b-|l-|r-|x-|y-)/.test(className);

  return (
    <div
      className={`relative rounded-xl border ${
        hasCustomBg ? '' : 'bg-[#FCFBF8]'
      } ${hasCustomBorder ? '' : 'border-[#18181A]/10 hover:border-[#18181A]/20'} transition-colors duration-150 ${className}`}
      {...props}
    >
      <div className="relative z-[2] h-full">{children}</div>
    </div>
  );
};
