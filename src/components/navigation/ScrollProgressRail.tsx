import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Compass, X, ArrowRight } from 'lucide-react';
import { scrollToTarget, scrollToTop } from '../effects/LenisScroller';

export interface SectionAnchor {
  id: string;
  label: string;
}

const DEFAULT_SECTIONS: SectionAnchor[] = [
  { id: 'why-now', label: '2026 Timeline' },
  { id: 'problem', label: 'Audit Controls' },
  { id: 'how-it-works', label: '3-Step Pipeline' },
  { id: 'simulator', label: 'MTC Simulator' },
  { id: 'cn-checker', label: 'CN Scope Lookup' },
  { id: 'clause-6', label: 'Clause 6 Protocol' },
  { id: 'readiness-gate', label: 'Readiness Gate' },
  { id: 'roi-calculator', label: 'CBAM Cost Model' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
];

interface ScrollProgressRailProps {
  sections?: SectionAnchor[];
  onLaunchApp?: () => void;
}

export const ScrollProgressRail: React.FC<ScrollProgressRailProps> = ({
  sections = DEFAULT_SECTIONS,
  onLaunchApp,
}) => {
  const [progress, setProgress] = useState(0);
  const [showDock, setShowDock] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    let rafId = 0;

    const updateScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollY = window.scrollY;
      const nextProgress = docHeight > 0 ? Math.min(1, Math.max(0, scrollY / docHeight)) : 0;
      setProgress(nextProgress);
      setShowDock(scrollY > 360);

      // Determine active section in viewport
      let current = '';
      for (const sec of sections) {
        const el = document.getElementById(sec.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200) {
            current = sec.id;
          }
        }
      }
      setActiveId(current);
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
  }, [sections]);

  const activeLabel = sections.find((s) => s.id === activeId)?.label || 'Overview';

  return (
    <>
      {/* 2px Emerald Scroll Reading Progress Bar pinned under sticky 64px header */}
      <div
        aria-hidden="true"
        className="fixed top-16 inset-x-0 z-40 h-[2px] pointer-events-none bg-transparent"
      >
        <div
          className="h-full bg-[#059669] origin-left transition-transform duration-75 ease-out"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {/* Comfortable Floating Quick-Jump & Back-to-Top Dock (Desktop >= md) */}
      <AnimatePresence>
        {showDock && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="hidden md:flex flex-col items-end gap-2 fixed bottom-6 right-6 z-40"
          >
            {/* Expandable Section Quick-Jump Menu */}
            <AnimatePresence>
              {isMapOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  data-lenis-prevent
                  className="w-60 rounded-xl bg-[#0A0C10]/95 backdrop-blur-md border border-white/[0.12] shadow-2xl overflow-hidden text-[#F4F4F5]"
                >
                  <div className="px-3.5 py-2.5 border-b border-white/[0.08] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#F4F4F5]">Jump to section</span>
                    <button
                      type="button"
                      onClick={() => setIsMapOpen(false)}
                      className="p-1 rounded-md text-[#A1A1AA] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                      aria-label="Close section menu"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-1.5 max-h-72 overflow-y-auto space-y-0.5">
                    {sections.map((sec, idx) => {
                      const isCurrent = sec.id === activeId;
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => {
                            scrollToTarget(sec.id, { offset: -72 });
                            setIsMapOpen(false);
                          }}
                          className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-emerald-500/15 text-emerald-300 font-medium'
                              : 'text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/[0.06]'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span className="font-mono tabular-nums text-[#71717A]">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span className="truncate">{sec.label}</span>
                          </span>
                          {isCurrent && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {onLaunchApp && (
                    <div className="p-2 border-t border-white/[0.08] bg-[#111318]">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMapOpen(false);
                          onLaunchApp();
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Open QA Workbench</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Compact Dock Bar */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#0A0C10]/95 backdrop-blur-md border border-white/[0.12] shadow-xl text-[#F4F4F5]">
              <button
                type="button"
                onClick={() => setIsMapOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/[0.08] text-xs font-medium text-[#F4F4F5] transition-colors cursor-pointer"
                aria-expanded={isMapOpen}
                aria-label="Open quick section navigation"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="max-w-[120px] truncate">{activeLabel}</span>
                <span className="font-mono tabular-nums text-[#A1A1AA]">
                  {Math.round(progress * 100)}%
                </span>
              </button>

              <span className="h-4 w-px bg-white/[0.12]" aria-hidden="true" />

              <button
                type="button"
                onClick={() => scrollToTop(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/[0.08] text-[#A1A1AA] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Back to top"
                aria-label="Back to top"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
