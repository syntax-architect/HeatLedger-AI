import React, { useState } from 'react';
import { HelpCircle, MessageSquare, Mail, AlertCircle, X, Send, Check } from 'lucide-react';

interface HelpButtonProps {
  screenName?: string;
  organizationId?: string;
  lastRequestId?: string;
}

export const HelpButton: React.FC<HelpButtonProps> = ({
  screenName = 'Workbench',
  organizationId = 'demo-org',
  lastRequestId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const cleanPhone = '919876543210';
  const waText = encodeURIComponent(`Hi HeatLedger Support, Org: ${organizationId}, Screen: ${screenName}`);
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${waText}`;

  const mailSubject = encodeURIComponent(`Support Request - Org ${organizationId}`);
  const mailBody = encodeURIComponent(`Screen: ${screenName}\nRequest ID: ${lastRequestId || 'N/A'}\n\nDescribe the issue:\n`);
  const emailUrl = `mailto:support@heatledger.ai?subject=${mailSubject}&body=${mailBody}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screen_name: screenName,
          message: message.trim(),
          request_id: lastRequestId || null,
        }),
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setMessage('');
        setIsOpen(false);
      }, 1500);
    } catch {
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setMessage('');
        setIsOpen(false);
      }, 1500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Help and Support"
        className="fixed bottom-4 right-4 z-40 min-h-[44px] min-w-[44px] px-3 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
      >
        <HelpCircle className="w-5 h-5 text-indigo-400 dark:text-indigo-600" />
        <span className="hidden sm:inline">Help</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-500" />
                <h3 className="font-bold text-sm">Need Help?</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="min-h-[44px] min-w-[44px] p-2 text-slate-400 hover:text-slate-600 rounded-lg flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp</span>
              </a>

              <a
                href={emailUrl}
                className="min-h-[44px] flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                <Mail className="w-4 h-4 text-slate-600" />
                <span>Email Help</span>
              </a>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-indigo-500" />
                  Report a problem
                </span>
                <span className="font-mono text-[10px]">{screenName}</span>
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What happened? (No certificate details needed)"
                rows={3}
                required
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />

              <button
                type="submit"
                disabled={isSubmitting || submitted}
                className="w-full min-h-[44px] py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitted ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Report Sent</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Sending...' : 'Send Problem Report'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
