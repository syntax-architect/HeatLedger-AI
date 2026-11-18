import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

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
  const lineRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isScanning) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          if (onComplete) onComplete();
        },
      });

      // Reset
      gsap.set([lineRef.current, glowRef.current], { y: 0, opacity: 1 });

      // Scan downward with laser phosphor beam
      tl.to([lineRef.current, glowRef.current], {
        y: '520px',
        duration: 1.6,
        ease: 'power1.inOut',
      }).to([lineRef.current, glowRef.current], {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.out',
      });
    });

    return () => ctx.revert();
  }, [isScanning, onComplete]);

  if (!isScanning) return null;

  return (
    <div className={`pointer-events-none absolute inset-x-0 top-0 z-30 ${className}`}>
      {/* Intense laser hairline */}
      <div
        ref={lineRef}
        className="h-[2px] w-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10B981]"
      />
      {/* Soft trailing phosphor glow */}
      <div
        ref={glowRef}
        className="h-10 w-full -translate-y-full bg-gradient-to-t from-emerald-500/20 to-transparent blur-sm"
      />
    </div>
  );
};
