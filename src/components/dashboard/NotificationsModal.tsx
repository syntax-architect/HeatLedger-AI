import React, { useState, useEffect } from 'react';
import { ResponsiveSheet } from '../common/ResponsiveSheet';
import {
  Bell,
  Stamp,
  CheckCircle2,
  FileCheck2,
  ArrowRight,
  CheckCheck,
  Settings,
  Mail,
  MessageSquare,
  Moon,
  ShieldAlert,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, NotificationItem } from '../../services/api';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'alerts' | 'preferences'>('alerts');
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      event_type: 'shipment.blocked',
      title: '3 Shipments Awaiting Clause 6 Sign-Off',
      message:
        'Consignments for Rotterdam Port require authorized QA Inspector signature and Passkey step-up.',
      created_at: new Date(Date.now() - 12 * 60000).toISOString(),
      is_read: false,
      severity: 'WARN',
      deep_link: '/app/sign-off',
    },
    {
      id: 'notif-2',
      event_type: 'dossier.signed',
      title: 'CBAM Dossier Ready: Shipment #SHP-2026-0881',
      message:
        'XML datasheet successfully validated against EU CBAM Transitional Schema. Ready for customs clearance.',
      created_at: new Date(Date.now() - 45 * 60000).toISOString(),
      is_read: false,
      severity: 'INFO',
      deep_link: '/app/dossiers',
    },
  ]);
  const [unreadCount, setUnreadCount] = useState<number>(2);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // User preferences state
  const [preferences, setPreferences] = useState<{
    channel_in_app?: boolean;
    channel_email?: boolean;
    channel_whatsapp?: boolean;
    quiet_hours_enabled?: boolean;
    [key: string]: any;
  }>({
    channel_in_app: true,
    channel_email: true,
    channel_whatsapp: false,
    quiet_hours_enabled: false,
  });

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      loadPreferences();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
      onUnreadCountChange?.(data.unread_count);
    } catch {
      // Offline fallback
      setNotifications([
        {
          id: 'notif-1',
          event_type: 'shipment.blocked',
          title: '3 Shipments Awaiting Clause 6 Sign-Off',
          message:
            'Consignments for Rotterdam Port require authorized QA Inspector signature and Passkey step-up.',
          created_at: new Date(Date.now() - 12 * 60000).toISOString(),
          is_read: false,
          severity: 'WARN',
          deep_link: '/app/sign-off',
        },
        {
          id: 'notif-2',
          event_type: 'dossier.signed',
          title: 'CBAM Dossier Ready: Shipment #SHP-2026-0881',
          message:
            'XML datasheet successfully validated against EU CBAM Transitional Schema. Ready for customs clearance.',
          created_at: new Date(Date.now() - 45 * 60000).toISOString(),
          is_read: false,
          severity: 'INFO',
          deep_link: '/app/dossiers',
        },
      ]);
      setUnreadCount(2);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const prefs = await api.fetchNotificationPreferences();
      setPreferences(prefs);
    } catch {}
  };

  const handleSelectNotification = async (item: NotificationItem) => {
    try {
      await api.markNotificationRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
    onClose();
    navigate(item.deep_link || '/app/command');
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      onUnreadCountChange?.(0);
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  const handleTogglePref = async (key: string) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    try {
      await api.updateNotificationPreferences(updated);
    } catch {}
  };

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Notification Centre"
      description="Shop-floor compliance alerts, release gate notifications, and multi-channel preferences."
    >
      <div className="space-y-4">
        <div className="text-xs font-semibold text-[#52525B]">
          Factory QA & Compliance Alerts
        </div>

        {/* Navigation Tabs & Actions */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E7]">
          <div className="inline-flex items-center p-1 rounded-lg bg-[#F4F4F5] border border-[#E4E4E7]">
            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'alerts'
                  ? 'bg-[#FFFFFF] text-[#09090B] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                  : 'text-[#52525B] hover:text-[#09090B]'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-[#059669]" />
              <span>Inbox ({unreadCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preferences')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'preferences'
                  ? 'bg-[#FFFFFF] text-[#09090B] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                  : 'text-[#52525B] hover:text-[#09090B]'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Channels</span>
            </button>
          </div>

          {activeTab === 'alerts' && unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-[#059669] hover:text-[#047857] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Tab 1: Alerts Inbox */}
        {activeTab === 'alerts' && (
          <div className="space-y-2.5">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-[#52525B] text-xs">
                No notifications in your inbox.
              </div>
            ) : (
              notifications.map((item) => {
                let Icon = Bell;
                let iconClass = 'bg-[#F4F4F5] border-[#E4E4E7] text-[#52525B]';

                if (item.event_type?.includes('blocked') || item.severity === 'WARN') {
                  Icon = ShieldAlert;
                  iconClass = 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]';
                } else if (item.event_type?.includes('dossier') || item.event_type?.includes('cbam')) {
                  Icon = FileCheck2;
                  iconClass = 'bg-[#ECFDF5] border-emerald-200 text-[#059669]';
                } else if (item.event_type?.includes('heat')) {
                  Icon = CheckCircle2;
                  iconClass = 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]';
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectNotification(item)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-colors touch-target cursor-pointer flex items-start gap-3 ${
                      !item.is_read
                        ? 'bg-[#FAFAFA] hover:bg-[#F4F4F5] border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
                        : 'bg-[#FFFFFF] hover:bg-[#FAFAFA] border-[#E4E4E7]/60 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${iconClass}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-[#09090B] truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono text-[#52525B] shrink-0">
                          {new Date(item.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-[#52525B] mt-1 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-[#059669] font-medium mt-2">
                        <span>View Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>

                    {!item.is_read && (
                      <div className="w-2 h-2 rounded-full bg-[#059669] shrink-0 mt-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Channel Preferences */}
        {activeTab === 'preferences' && (
          <div className="space-y-4 text-xs">
            <p className="text-[#52525B] text-xs leading-relaxed">
              Configure alert dispatch channels to prevent notification fatigue. Enforces a maximum
              rate limit of 10 alerts/hour.
            </p>

            <div className="space-y-2.5">
              <label className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] flex items-center justify-between cursor-pointer hover:bg-[#F4F4F5] transition-colors">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-[#52525B]" />
                  <div>
                    <div className="font-semibold text-[#09090B]">In-App Alerts</div>
                    <div className="text-[11px] text-[#52525B]">
                      Unread badges and top bell tray notifications
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={!!preferences.channel_in_app}
                  onChange={() => handleTogglePref('channel_in_app')}
                  className="rounded border-[#D4D4D8] text-[#059669] focus:ring-[#059669] h-4 w-4 cursor-pointer"
                />
              </label>

              <label className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] flex items-center justify-between cursor-pointer hover:bg-[#F4F4F5] transition-colors">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#52525B]" />
                  <div>
                    <div className="font-semibold text-[#09090B]">Email Digest</div>
                    <div className="text-[11px] text-[#52525B]">
                      Daily summaries of blocked shipments and signed dossiers
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={!!preferences.channel_email}
                  onChange={() => handleTogglePref('channel_email')}
                  className="rounded border-[#D4D4D8] text-[#059669] focus:ring-[#059669] h-4 w-4 cursor-pointer"
                />
              </label>

              <label className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] flex items-center justify-between cursor-pointer hover:bg-[#F4F4F5] transition-colors">
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-[#059669]" />
                  <div>
                    <div className="font-semibold text-[#09090B]">WhatsApp Dispatch</div>
                    <div className="text-[11px] text-[#52525B]">
                      High-priority release gate blockers sent to QA Inspector
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={!!preferences.channel_whatsapp}
                  onChange={() => handleTogglePref('channel_whatsapp')}
                  className="rounded border-[#D4D4D8] text-[#059669] focus:ring-[#059669] h-4 w-4 cursor-pointer"
                />
              </label>

              <label className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] flex items-center justify-between cursor-pointer hover:bg-[#F4F4F5] transition-colors">
                <div className="flex items-center gap-2.5">
                  <Moon className="w-4 h-4 text-[#6366F1]" />
                  <div>
                    <div className="font-semibold text-[#09090B]">
                      Quiet Hours (22:00 – 07:00 IST)
                    </div>
                    <div className="text-[11px] text-[#52525B]">
                      Silence non-critical messages outside shop-floor shifts
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={!!preferences.quiet_hours_enabled}
                  onChange={() => handleTogglePref('quiet_hours_enabled')}
                  className="rounded border-[#D4D4D8] text-[#059669] focus:ring-[#059669] h-4 w-4 cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </ResponsiveSheet>
  );
};
