import React, { useEffect } from 'react';
import { isReducedMotion } from '../../lib/motion';

interface LaserScanBeamProps {
  isScanning: boolean;
  onComplete?: () => void;
  className?: string;
}

export const LaserScanBeam: React.FC<LaserScanBeamProps> = ({
  isScanning,
  onComplete,
  className = '',
}) => {
  useEffect(() => {
    if (!isScanning || !onComplete) return;

    const durationMs = isReducedMotion() ? 300 : 1400;
    const timer = setTimeout(() => {
      onComplete();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [isScanning, onComplete]);

  if (!isScanning) return null;

  return (
    <div
      role="progressbar"
      aria-label="Document scan in progress"
      aria-busy="true"
      className={`pointer-events-none absolute inset-x-0 top-0 z-30 h-[2px] overflow-hidden bg-emerald-600/15 dark:bg-emerald-500/15 ${className}`}
    >
      <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-emerald-600 dark:via-emerald-500 to-transparent animate-shimmer" />
    </div>
  );
};
