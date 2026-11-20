import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotificationsModal } from '../components/dashboard/NotificationsModal';
import { api } from '../services/api';

describe('Prompt P14: Notification Centre Modal & Channels', () => {
  window.matchMedia =
    window.matchMedia ||
    function () {
      return {
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    };

  beforeEach(() => {
    vi.spyOn(api, 'fetchNotifications').mockResolvedValue({
      organization_id: 'org_howrah_01',
      unread_count: 1,
      notifications: [
        {
          id: 'notif_rel_01',
          event_type: 'shipment.blocked',
          title: 'Release Gate Blocker on Shipment EXP-2026-109',
          message: 'Missing QA Inspector digital signature before export dispatch.',
          deep_link: '/app/command?shipment=EXP-2026-109',
          severity: 'WARN',
          read_at: null,
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ],
    });

    vi.spyOn(api, 'fetchNotificationPreferences').mockResolvedValue({
      channel_in_app: true,
      channel_email: true,
      channel_whatsapp: false,
      quiet_hours_enabled: false,
    });

    vi.spyOn(api, 'markNotificationRead').mockResolvedValue({ success: true });
    vi.spyOn(api, 'markAllNotificationsRead').mockResolvedValue({ marked_read_count: 1 });
  });

  it('renders Notification Centre title and unread alerts', async () => {
    render(
      <BrowserRouter>
        <NotificationsModal isOpen={true} onClose={() => {}} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Notification Centre')).toBeDefined();
      expect(screen.getByText(/Release Gate Blocker on Shipment EXP-2026-109/i)).toBeDefined();
    });
  });

  it('switches to Channels preferences tab and toggles WhatsApp dispatch', async () => {
    render(
      <BrowserRouter>
        <NotificationsModal isOpen={true} onClose={() => {}} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Channels/i })).toBeDefined();
    });

    const channelsTab = screen.getByRole('button', { name: /Channels/i });
    fireEvent.click(channelsTab);

    await waitFor(() => {
      expect(screen.getByText(/In-App Alerts/i)).toBeDefined();
      expect(screen.getByText(/Email Digest/i)).toBeDefined();
      expect(screen.getByText(/WhatsApp Dispatch/i)).toBeDefined();
      expect(screen.getByText(/Quiet Hours/i)).toBeDefined();
    });
  });
});
