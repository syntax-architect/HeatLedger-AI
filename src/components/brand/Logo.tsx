import React from 'react';

interface LogoProps {
  className?: string;
  isLight?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const HexagonalIngotIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 28,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {/* Precision Machined Hexagonal Ingot Mark */}
      <polygon
        points="50,6 88,28 88,72 50,94 12,72 12,28"
        fill="#0A0C10"
        stroke="#27272A"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Top Crown Facet (Brushed Steel) */}
      <polygon points="50,15 80,32.5 50,50 20,32.5" fill="#27272A" />
      {/* Left Structural Facet (Deep Carbon) */}
      <polygon points="20,32.5 50,50 50,85 20,67.5" fill="#181B22" />
      {/* Right Semantic Facet (Deep Forest Emerald) */}
      <polygon points="50,50 80,32.5 80,67.5 50,85" fill="#059669" />
      {/* Precision Ridge Hairlines */}
      <path
        d="M50 15V50M50 50V85M20 32.5L50 50L80 32.5"
        stroke="#FAFAFA"
        strokeOpacity="0.24"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const Logo: React.FC<LogoProps> = ({ className = '', isLight = false, size = 'md' }) => {
  const iconSizes = {
    sm: 22,
    md: 26,
    lg: 34,
  };

  const textSizes = {
    sm: 'text-sm font-semibold',
    md: 'text-base font-semibold',
    lg: 'text-xl font-semibold',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 font-sans select-none whitespace-nowrap shrink-0 ${className}`}
    >
      <HexagonalIngotIcon size={iconSizes[size]} />
      <span
        className={`tracking-[-0.025em] leading-none ${textSizes[size]} ${
          isLight ? 'text-[#09090B]' : 'text-[#F4F4F5]'
        }`}
      >
        HeatLedger
        <span className="ml-1 font-medium text-[#059669] dark:text-[#10B981]">AI</span>
      </span>
    </div>
  );
};
