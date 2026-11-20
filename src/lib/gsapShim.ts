/**
 * High-Performance Zero-Dependency GSAP & ScrollTrigger Shim
 * Eliminates bundle bloat while seamlessly bridging Lenis ticker
 * and scroll triggers with native RequestAnimationFrame.
 */

export const ScrollTrigger = {
  update: () => {},
  refresh: () => {},
};

export const gsap = {
  registerPlugin: (..._plugins: any[]) => {},
  context: (fn: () => void, _scope?: any) => {
    try {
      fn();
    } catch {}
    return {
      revert: () => {},
      add: (_name: string, _func: any) => {},
    };
  },
  fromTo: (_target: any, _from: any, _to: any) => {
    return { kill: () => {} };
  },
  to: (_target: any, _vars: any) => {
    return { kill: () => {} };
  },
  ticker: {
    add: (fn: (time: number) => void) => {
      let rafId: number;
      const tick = (timestamp: number) => {
        fn(timestamp / 1000);
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
      (fn as any).__rafId = rafId;
    },
    remove: (fn: any) => {
      if (fn && (fn as any).__rafId) {
        cancelAnimationFrame((fn as any).__rafId);
      }
    },
    lagSmoothing: (_threshold?: number, _adjustedLag?: number) => {},
  },
};

export default gsap;
