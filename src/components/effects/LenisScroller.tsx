import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

declare global {
  interface Window {
    __heatledgerLenis?: Lenis | null;
  }
}

export interface ScrollToOptions {
  offset?: number;
  immediate?: boolean;
  duration?: number;
}

/**
 * Smoothly scroll to a DOM element, CSS selector, or Y position using the active
 * Lenis instance when available, falling back gracefully to native scrolling.
 */
export function scrollToTarget(
  target: string | number | HTMLElement,
  options: ScrollToOptions = {}
): void {
  if (typeof window === 'undefined') return;

  const { offset = -72, immediate = false, duration = 1.15 } = options;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lenis = window.__heatledgerLenis;

  if (lenis) {
    lenis.scrollTo(target, {
      offset: typeof target === 'number' ? 0 : offset,
      immediate: immediate || prefersReduced,
      duration: immediate || prefersReduced ? 0 : duration,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    return;
  }

  if (typeof target === 'number') {
    window.scrollTo({
      top: target,
      behavior: immediate || prefersReduced ? 'auto' : 'smooth',
    });
    return;
  }

  const el =
    typeof target === 'string'
      ? document.getElementById(target.replace(/^#/, '')) || document.querySelector(target)
      : target;

  if (el instanceof HTMLElement) {
    const top = el.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: immediate || prefersReduced ? 'auto' : 'smooth',
    });
  }
}

export function scrollToTop(immediate = false): void {
  scrollToTarget(0, { immediate, duration: 1.0 });
}

export const LenisScroller = () => {
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

    if (prefersReduced || isCoarsePointer) {
      window.__heatledgerLenis = null;
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.92,
      touchMultiplier: 1.4,
      infinite: false,
      prevent: (node) => {
        return Boolean(
          node.closest('[data-lenis-prevent]') ||
            node.closest('[role="dialog"]') ||
            node.closest('[data-vaul-drawer]')
        );
      },
    });

    window.__heatledgerLenis = lenis;

    // Synchronize Lenis with GSAP ScrollTrigger for zero-drift scroll choreography
    lenis.on('scroll', ScrollTrigger.update);

    const onTick = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    // Refresh ScrollTrigger after fonts and layout settle
    const refreshTimer = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);

    return () => {
      window.clearTimeout(refreshTimer);
      gsap.ticker.remove(onTick);
      lenis.off('scroll', ScrollTrigger.update);
      lenis.destroy();
      if (window.__heatledgerLenis === lenis) {
        window.__heatledgerLenis = null;
      }
    };
  }, []);

  return null;
};
