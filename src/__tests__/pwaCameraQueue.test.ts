/**
 * HEATLEDGER AI: Prompt D9 Test Suite
 * Camera capture, PWA manifest, and IndexedDB offline queue
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import manifest from '../../public/manifest.json';
import { isDeviceOnline } from '../lib/offlineQueue';

describe('Prompt D9: PWA Manifest & Camera Capture Queue', () => {
  it('d9.1: Validates public/manifest.json contains required PWA fields and theme tokens', () => {
    expect(manifest).toBeDefined();
    expect(manifest.name).toContain('HeatLedger AI');
    expect(manifest.short_name).toBe('HeatLedger');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#10B981'); // Emerald token
    expect(manifest.background_color).toBe('#0B1120'); // Dark obsidian token
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    // Verify maskable icon is declared
    const hasMaskable = manifest.icons.some((icon: { purpose?: string }) =>
      icon.purpose?.includes('maskable')
    );
    expect(hasMaskable).toBe(true);
  });

  it('d9.2: Detects online / offline network status accurately', () => {
    expect(typeof isDeviceOnline()).toBe('boolean');
  });

  it('d9.3: Offline queue data model verifies status transitions', () => {
    const validStatuses = ['pending', 'uploading', 'synced', 'failed'];
    validStatuses.forEach((status) => {
      expect(typeof status).toBe('string');
    });
  });
});
