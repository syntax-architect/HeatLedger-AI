import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MOTION_DURATIONS,
  MOTION_EASINGS,
  SPRING_PRESETS,
  routeVariants,
  staggerItem,
  staggerContainer,
  tapFeedback,
  getDevicePerfTier,
  isReducedMotion,
  haptics,
} from '../lib/motion';

describe('Prompt D4: Motion System & GPU Performance', () => {
  const originalLocalStorage = window.localStorage;

  beforeEach(() => {
    let store: Record<string, string> = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (k: string) => store[k] || null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          store = {};
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  it('defines strict motion tokens matching the playbook', () => {
    expect(MOTION_DURATIONS.fast).toBe(0.12);
    expect(MOTION_DURATIONS.standard).toBe(0.2);
    expect(MOTION_DURATIONS.deliberate).toBe(0.32);

    expect(SPRING_PRESETS.snappy.stiffness).toBe(380);
    expect(SPRING_PRESETS.snappy.damping).toBe(30);
    expect(SPRING_PRESETS.gentle.stiffness).toBe(220);
    expect(SPRING_PRESETS.gentle.damping).toBe(26);

    expect(MOTION_EASINGS.standard).toEqual([0.2, 0, 0, 1]);
    expect(MOTION_EASINGS.emphasised).toEqual([0.05, 0.7, 0.1, 1.0]);
    expect(MOTION_EASINGS.decelerate).toEqual([0, 0, 0.2, 1]);
  });

  it('animates only transform (y) and opacity; drops transform in reduced-motion mode', () => {
    // Normal motion: fade + 8px rise
    const normalRoute = routeVariants.initial(false);
    expect(normalRoute.opacity).toBe(0);
    expect(normalRoute.y).toBe(8);

    // Reduced motion: only opacity, no vertical movement
    const reducedRoute = routeVariants.initial(true);
    expect(reducedRoute.opacity).toBe(0);
    expect(reducedRoute.y).toBe(0);

    // Stagger item behavior
    const normalItem = staggerItem.initial(false);
    expect(normalItem.y).toBe(6);
    const reducedItem = staggerItem.initial(true);
    expect(reducedItem.y).toBe(0);

    // Stagger step is 30ms (0.03s)
    expect(staggerContainer.animate.transition.staggerChildren).toBe(0.03);

    // Tap feedback is scale 0.97 spring
    expect(tapFeedback.scale).toBe(0.97);
    expect(tapFeedback.transition).toEqual(SPRING_PRESETS.snappy);
  });

  it('detects user reduced-motion preference and forces low tier', () => {
    localStorage.setItem('heatledger_reduce_motion', 'true');
    expect(isReducedMotion()).toBe(true);
    expect(getDevicePerfTier()).toBe('low');
  });

  it('executes subtle haptics pulses when vibrate API is available', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    haptics.tap();
    expect(vibrateMock).toHaveBeenCalledWith(8);

    haptics.success();
    expect(vibrateMock).toHaveBeenCalledWith([12, 40, 16]);

    haptics.error();
    expect(vibrateMock).toHaveBeenCalledWith([35, 50, 35]);
  });
});
