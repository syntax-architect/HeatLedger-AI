import React from 'react';

interface LogoProps {
  className?: string;
  isLight?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const HexagonalIngotIcon: React.FC<{ size?: number; className?: string }> = ({ 
  size = 32, 
  className = '' 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-md ${className}`}
    >
      <defs>
        {/* Molten Amber to Emerald Linear Gradient */}
        <linearGradient id="ingotGradient" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="45%" stopColor="#EA580C" />
          <stop offset="85%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        <linearGradient id="facetHighlight" x1="50" y1="5" x2="50" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#10B981" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#065F46" stopOpacity="0.9" />
        </linearGradient>

        <radialGradient id="ingotCoreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#EA580C" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#090D16" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Hexagonal Outer Frame (Steel Billet Ingot cross-section) */}
      <polygon 
        points="50,6 88,28 88,72 50,94 12,72 12,28" 
        fill="#090D16" 
        stroke="url(#ingotGradient)" 
        strokeWidth="4" 
        strokeLinejoin="round"
      />

      {/* Isometric Ingot Core Glow */}
      <circle cx="50" cy="50" r="32" fill="url(#ingotCoreGlow)" />

      {/* Top Facet (Molten Amber Forge) */}
      <polygon 
        points="50,14 80,31 50,50 20,31" 
        fill="#F59E0B" 
        fillOpacity="0.85" 
      />

      {/* Left Facet (Tempered Alloy) */}
      <polygon 
        points="20,31 50,50 50,86 20,67" 
        fill="#EA580C" 
        fillOpacity="0.75" 
      />

      {/* Right Facet (Electric Emerald Compliance Pass) */}
      <polygon 
        points="50,50 80,31 80,67 50,86" 
        fill="#10B981" 
        fillOpacity="0.85" 
      />

      {/* Center Precision Ridge Line */}
      <line x1="50" y1="14" x2="50" y2="86" stroke="#FEF3C7" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      <line x1="20" y1="31" x2="80" y2="31" stroke="#FEF3C7" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />
      
      {/* Precision Micro-dot for Certified Origin */}
      <circle cx="50" cy="50" r="3" fill="#FFFFFF" />
    </svg>
  );
};

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  isLight = false, 
  size = 'md' 
}) => {
  const iconSizes = {
    sm: 26,
    md: 34,
    lg: 44,
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2.5 font-sans select-none tracking-tight ${className}`}>
      <div className="relative group">
        <HexagonalIngotIcon size={iconSizes[size]} />
        <div className="absolute inset-0 bg-emerald-500/20 blur-md rounded-full pointer-events-none group-hover:bg-amber-500/30 transition-all duration-300" />
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`font-extrabold ${textSizes[size]} ${isLight ? 'text-slate-900' : 'text-slate-50'}`}>
            HeatLedger
          </span>
          <span className="bg-gradient-to-r from-amber-500 to-emerald-400 bg-clip-text text-transparent font-black tracking-wider text-xs px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-950/40 uppercase">
            AI
          </span>
        </div>
        <span className="text-[9px] font-mono tracking-widest uppercase text-slate-400 -mt-1 hidden sm:block">
          Melt-and-Pour · EN 10204 · CBAM
        </span>
      </div>
    </div>
  );
};
