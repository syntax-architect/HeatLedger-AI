import React, { useEffect, useState } from 'react';

export interface SectionAnchor {
  id: string;
  label: string;
}

interface ScrollProgressRailProps {
  sections?: SectionAnchor[];
  onLaunchApp?: () => void;
}

/**
 * Restrained 2px reading progress hairline pinned directly under the sticky navbar.
 * Floating bottom-right dock removed to keep chrome quiet.
 */
export const ScrollProgressRail: React.FC<ScrollProgressRailProps> = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let rafId = 0;

    const updateScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollY = window.scrollY;
      const nextProgress = docHeight > 0 ? Math.min(1, Math.max(0, scrollY / docHeight)) : 0;
      setProgress(nextProgress);
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateScroll);
    };

    updateScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed top-16 inset-x-0 z-40 h-[2px] pointer-events-none bg-transparent"
    >
      <div
        className="h-full bg-[#10B981] origin-left transition-transform duration-75 ease-out"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
};
