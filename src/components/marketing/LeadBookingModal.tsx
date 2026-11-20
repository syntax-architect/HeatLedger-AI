import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  ArrowRight,
  Loader2,
  WifiOff,
} from 'lucide-react';
import { Button } from '../ui/Button';

export interface LeadBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeadBookingModal: React.FC<LeadBookingModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [monthlyContainers, setMonthlyContainers] = useState<number>(2);
  const [notes, setNotes] = useState('');

  // Honeypot spam trap (must remain empty for human submission)
  const [website, setWebsite] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isOfflineQueued, setIsOfflineQueued] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setIsSuccess(false);
      setErrorMsg('');
      setIsOfflineQueued(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim() || !email.trim() || !company.trim()) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    const payload = {
      name,
      email,
      company,
      phone,
      monthly_containers: monthlyContainers,
      notes,
      website,
    };

    if (!navigator.onLine) {
      try {
        const queued = JSON.parse(localStorage.getItem('hl_queued_leads') || '[]');
        queued.push({ ...payload, queued_at: new Date().toISOString() });
        localStorage.setItem('hl_queued_leads', JSON.stringify(queued));
        setIsOfflineQueued(true);
        setIsSuccess(true);
      } catch {
        setErrorMsg('Network offline. Please try again when reconnected.');
      }
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(
            'Too many requests. Please wait a few minutes before submitting another audit.'
          );
        }
        throw new Error(`Submission error: ${res.statusText}`);
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      try {
        const queued = JSON.parse(localStorage.getItem('hl_queued_leads') || '[]');
        queued.push({ ...payload, queued_at: new Date().toISOString() });
        localStorage.setItem('hl_queued_leads', JSON.stringify(queued));
        setIsOfflineQueued(true);
        setIsSuccess(true);
      } catch {
        const message = err instanceof Error ? err.message : 'Failed to submit request.';
        setErrorMsg(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0C10]/70 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        className="relative w-full max-w-lg bg-[#FFFFFF] text-[#09090B] border border-[#E4E4E7] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden text-left"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#FAFAFA] border-b border-[#E4E4E7] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] border border-emerald-200 flex items-center justify-center text-[#047857] shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 id="booking-modal-title" className="text-sm font-semibold text-[#09090B]">
                Book a Free Shipment Audit
              </h3>
              <p className="text-xs text-[#52525B]">
                Confidential review with Zero-Data-Retention processing.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#52525B] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {isSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#ECFDF5] border border-emerald-200 text-[#047857] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-[#09090B]">
                {isOfflineQueued ? 'Audit Request Saved Offline' : 'Audit Request Confirmed'}
              </h4>
              <p className="text-xs text-[#52525B] max-w-sm mx-auto leading-relaxed">
                {isOfflineQueued ? (
                  <>
                    <span className="inline-flex items-center justify-center gap-1 text-[#B45309] font-medium mb-1">
                      <WifiOff className="w-3.5 h-3.5" />
                      Saved locally in browser offline queue
                    </span>
                    <br />
                    Your request has been cached and will sync automatically once connectivity
                    returns.
                  </>
                ) : (
                  <>
                    A metallurgical compliance engineer will review your mill certificate and follow
                    up at <strong className="text-[#09090B] font-semibold">{email}</strong> within 4
                    business hours with a preliminary CBAM cost difference estimate.
                  </>
                )}
              </p>

              <div className="pt-2 flex justify-center">
                <Button variant="primary" size="md" onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Honeypot hidden input */}
              <div className="hidden" aria-hidden="true">
                <label>Do not fill this</label>
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="lead-name" className="text-[#09090B] font-medium block mb-1.5">
                    Your name <span className="text-[#047857]">*</span>
                  </label>
                  <input
                    id="lead-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Rahul Sharma"
                    className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-sm text-[#09090B] placeholder:text-[#52525B]/60 focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-emerald-600/15"
                  />
                </div>

                <div>
                  <label htmlFor="lead-company" className="text-[#09090B] font-medium block mb-1.5">
                    Company name <span className="text-[#047857]">*</span>
                  </label>
                  <input
                    id="lead-company"
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Apex Forgings Ltd"
                    className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-sm text-[#09090B] placeholder:text-[#52525B]/60 focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-emerald-600/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="lead-email" className="text-[#09090B] font-medium block mb-1.5">
                    Work email <span className="text-[#047857]">*</span>
                  </label>
                  <input
                    id="lead-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="r.sharma@apexforgings.com"
                    className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-sm text-[#09090B] placeholder:text-[#52525B]/60 focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-emerald-600/15"
                  />
                </div>

                <div>
                  <label htmlFor="lead-phone" className="text-[#09090B] font-medium block mb-1.5">
                    Phone / WhatsApp
                  </label>
                  <input
                    id="lead-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-sm text-[#09090B] placeholder:text-[#52525B]/60 focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-emerald-600/15"
                  />
                </div>
              </div>

              <div>
                <span className="text-[#09090B] font-medium block mb-1.5">
                  Monthly EU export containers (25t FCL)
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 5, 10, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMonthlyContainers(num)}
                      className={`py-2 rounded-lg border font-mono tabular-nums text-xs text-center transition-colors ${
                        monthlyContainers === num
                          ? 'bg-[#ECFDF5] border-[#059669] text-[#047857] font-semibold'
                          : 'bg-[#FFFFFF] border-[#E4E4E7] text-[#52525B] hover:text-[#09090B] hover:bg-[#FAFAFA]'
                      }`}
                    >
                      {num}
                      {num === 20 ? '+' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="lead-notes" className="text-[#09090B] font-medium block mb-1.5">
                  Primary CN codes or notes (optional)
                </label>
                <textarea
                  id="lead-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. 7307 9100 flanges using SAIL and Tata Steel raw material heats"
                  className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-sm text-[#09090B] placeholder:text-[#52525B]/60 focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-emerald-600/15 resize-none"
                />
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isLoading}
                  className="w-full justify-center min-h-[42px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Confidential Audit Request</span>
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs text-[#52525B] pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#047857] shrink-0" />
                <span>Zero-Data-Retention processing · Certificates never used for training</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
