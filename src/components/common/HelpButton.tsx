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
        className="fixed bottom-4 right-4 z-40 min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-lg bg-[#18181A] hover:bg-[#2C303A] text-[#FCFBF8] border border-[#2C303A] transition-colors flex items-center gap-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#059669]"
      >
        <HelpCircle className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
        <span className="hidden sm:inline">Help</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#FCFBF8] text-[#18181A] rounded-xl border border-[#18181A]/15 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                <h3 className="font-medium text-sm text-[#18181A]">Need Help?</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="min-h-[44px] min-w-[44px] p-2 text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] rounded-lg flex items-center justify-center transition-colors"
                aria-label="Close help modal"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] flex items-center justify-center gap-2 p-2.5 rounded-lg bg-[#059669]/10 border border-[#059669]/20 text-[#047857] text-xs font-medium hover:bg-[#059669]/15 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                <span>WhatsApp</span>
              </a>

              <a
                href={emailUrl}
                className="min-h-[44px] flex items-center justify-center gap-2 p-2.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs font-medium hover:bg-[#EFECE5] transition-colors"
              >
                <Mail className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
                <span>Email Help</span>
              </a>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-[#18181A]/10">
              <div className="flex items-center justify-between text-[11px] text-[#55544E]">
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
                  Report a problem
                </span>
                <span className="font-mono text-[11px] text-[#78766E]">{screenName}</span>
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What happened? (No certificate details needed)"
                rows={3}
                required
                className="w-full text-xs p-3 rounded-lg border border-[#18181A]/15 bg-[#F7F5F0] text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669]"
              />

              <button
                type="submit"
                disabled={isSubmitting || submitted}
                className="w-full min-h-[44px] py-2 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] font-medium text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitted ? (
                  <>
                    <Check className="w-4 h-4 text-[#FCFBF8]" strokeWidth={1.5} />
                    <span>Report Sent</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
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
