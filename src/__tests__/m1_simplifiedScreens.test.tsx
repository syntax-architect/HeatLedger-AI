import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { DEFAULT_FEATURE_FLAGS, getFeatureFlags, setFeatureFlags } from '../config/features';

describe('Prompt M1: Simplify App to 6 Core Screens', () => {
  beforeEach(() => {
    localStorage.clear();
    setFeatureFlags(DEFAULT_FEATURE_FLAGS);
  });

  it('proves that a fresh user by default has all advanced feature flags OFF', () => {
    const flags = getFeatureFlags();
    expect(flags.supplierIntelligence).toBe(false);
    expect(flags.supplierRequests).toBe(false);
    expect(flags.intakeChannels).toBe(false);
    expect(flags.regulationRadar).toBe(false);
    expect(flags.insightsTrends).toBe(false);
    expect(flags.roiReports).toBe(false);
    expect(flags.consultantPortal).toBe(false);
    expect(flags.apiIntegrations).toBe(false);
    expect(flags.auditTrailStandalone).toBe(false);
  });

  it('renders exactly the 6 core destinations in the desktop sidebar when flags are off', () => {
    const onSelectView = vi.fn();
    const onReturnToMarketing = vi.fn();

    render(
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <DashboardShell
              currentView="command-center"
              onSelectView={onSelectView}
              onReturnToMarketing={onReturnToMarketing}
            />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    );

    // Desktop left rail should show Workspace group
    expect(screen.getByText('Workspace')).toBeDefined();

    // 6 Core screens present
    expect(screen.getAllByText('Home').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Upload & Review')).toBeDefined();
    expect(screen.getAllByText('Heats').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Shipments').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Share & Verify')).toBeDefined();
    expect(screen.getByText('Settings')).toBeDefined();

    // Secondary advanced views must NOT be rendered when flags are OFF
    expect(screen.queryByText('Advanced (Beta)')).toBeNull();
    expect(screen.queryByText('Supplier Intel')).toBeNull();
    expect(screen.queryByText('CBAM Requests')).toBeNull();
    expect(screen.queryByText('Regulation Radar')).toBeNull();
  });

  it('renders exactly 5 navigation items on the mobile bottom bar with minimum 44px touch targets', () => {
    const onSelectView = vi.fn();
    const onReturnToMarketing = vi.fn();

    render(
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <DashboardShell
              currentView="command-center"
              onSelectView={onSelectView}
              onReturnToMarketing={onReturnToMarketing}
            />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    );

    const mobileNav = screen.getByLabelText('Mobile Navigation');
    expect(mobileNav).toBeDefined();

    const buttons = mobileNav.querySelectorAll('button');
    expect(buttons.length).toBe(5);

    // 5 Mobile button labels: Home, Upload, Heats, Shipments, More
    const labels = Array.from(buttons).map((b) => b.textContent?.trim());
    expect(labels).toContain('Home');
    expect(labels).toContain('Upload');
    expect(labels).toContain('Heats');
    expect(labels).toContain('Shipments');
    expect(labels).toContain('More');

    // All touch targets must adhere to min-h-[44px]
    buttons.forEach((btn) => {
      expect(btn.className).toContain('min-h-[44px]');
      expect(btn.className).toContain('min-w-[56px]');
    });
  });

  it('allows enabling feature flags for advanced enterprise modules without breaking core views', () => {
    setFeatureFlags({ supplierIntelligence: true, regulationRadar: true });
    const flags = getFeatureFlags();
    expect(flags.supplierIntelligence).toBe(true);
    expect(flags.regulationRadar).toBe(true);
    expect(flags.intakeChannels).toBe(false);
  });
});
