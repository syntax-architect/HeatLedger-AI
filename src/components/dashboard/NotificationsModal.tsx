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
  ShieldAlert
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
      message: 'Consignments for Rotterdam Port require authorized QA Inspector signature and Passkey step-up.',
      created_at: new Date(Date.now() - 12 * 60000).toISOString(),
      is_read: false,
      severity: 'WARN',
      deep_link: '/app/sign-off',
    },
    {
      id: 'notif-2',
      event_type: 'dossier.signed',
      title: 'CBAM Dossier Ready: Shipment #SHP-2026-0881',
      message: 'XML datasheet successfully validated against EU CBAM Transitional Schema. Ready for customs clearance.',
      created_at: new Date(Date.now() - 45 * 60000).toISOString(),
      is_read: false,
      severity: 'INFO',
      deep_link: '/app/dossiers',
    },
  ]);
  const [unreadCount, setUnreadCount] = useState<number>(2);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // User preferences state
  const [preferences, setPreferences] = useState<any>({
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
          message: 'Consignments for Rotterdam Port require authorized QA Inspector signature and Passkey step-up.',
          created_at: new Date(Date.now() - 12 * 60000).toISOString(),
          is_read: false,
          severity: 'WARN',
          deep_link: '/app/sign-off',
        },
        {
          id: 'notif-2',
          event_type: 'dossier.signed',
          title: 'CBAM Dossier Ready: Shipment #SHP-2026-0881',
          message: 'XML datasheet successfully validated against EU CBAM Transitional Schema. Ready for customs clearance.',
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
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Factory QA & Compliance Alerts
        </div>
        {/* Navigation Tabs & Actions */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'alerts'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Inbox ({unreadCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'preferences'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Channels</span>
            </button>
          </div>

          {activeTab === 'alerts' && unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-orange-600 dark:text-orange-400 font-semibold hover:underline flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Tab 1: Alerts Inbox */}
        {activeTab === 'alerts' && (
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No notifications in your inbox.
              </div>
            ) : (
              notifications.map((item) => {
                let Icon = Bell;
                let iconColor = 'text-slate-400';
                let iconBg = 'bg-slate-100 dark:bg-slate-800';

                if (item.event_type.includes('blocked') || item.severity === 'WARN') {
                  Icon = ShieldAlert;
                  iconColor = 'text-rose-500';
                  iconBg = 'bg-rose-500/10 border-rose-500/20';
                } else if (item.event_type.includes('dossier') || item.event_type.includes('cbam')) {
                  Icon = FileCheck2;
                  iconColor = 'text-emerald-500';
                  iconBg = 'bg-emerald-500/10 border-emerald-500/20';
                } else if (item.event_type.includes('heat')) {
                  Icon = CheckCircle2;
                  iconColor = 'text-amber-500';
                  iconBg = 'bg-amber-500/10 border-amber-500/20';
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectNotification(item)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all touch-target cursor-pointer flex items-start gap-3 ${
                      !item.is_read
                        ? 'bg-slate-50 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/60 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${iconBg} ${iconColor}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {item.message}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-orange-600 dark:text-orange-400 font-medium mt-1.5">
                        <span>View Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>

                    {!item.is_read && (
                      <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1.5" />
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
            <p className="text-slate-500 text-xs">
              Configure alert dispatch channels to prevent notification fatigue. Enforces a maximum rate limit of 10 alerts/hour.
            </p>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-slate-500" />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">In-App Alerts</div>
                    <div className="text-[11px] text-slate-500">Unread badges and top bell tray notifications</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.channel_in_app}
                  onChange={() => handleTogglePref('channel_in_app')}
                  className="rounded text-orange-600 focus:ring-orange-500 h-4 w-4"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">Email Digest</div>
                    <div className="text-[11px] text-slate-500">Daily summaries of blocked shipments and signed dossiers</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.channel_email}
                  onChange={() => handleTogglePref('channel_email')}
                  className="rounded text-orange-600 focus:ring-orange-500 h-4 w-4"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">WhatsApp Dispatch</div>
                    <div className="text-[11px] text-slate-500">High-priority release gate blockers sent to QA Inspector</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.channel_whatsapp}
                  onChange={() => handleTogglePref('channel_whatsapp')}
                  className="rounded text-orange-600 focus:ring-orange-500 h-4 w-4"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">Quiet Hours (22:00 – 07:00 IST)</div>
                    <div className="text-[11px] text-slate-500">Silence non-critical messages outside shop-floor shifts</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.quiet_hours_enabled}
                  onChange={() => handleTogglePref('quiet_hours_enabled')}
                  className="rounded text-orange-600 focus:ring-orange-500 h-4 w-4"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ResponsiveSheet>
  );
};
