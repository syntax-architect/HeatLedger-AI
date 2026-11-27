import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Clock, Calculator, Download, Mail, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface RiskParameters {
  demurrage_per_day_inr: number;
  default_hold_days: number;
  quota_safeguard_rate: number;
  cbam_default_markup_rate: number;
  cbam_price_eur_per_tonne: number;
  eur_to_inr_exchange_rate: number;
  reshipping_rejection_pct: number;
  minutes_per_shipment: number;
  label: string;
}

interface ValueScreenSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParametersUpdated?: () => void;
}

export const ValueScreenSettingsModal: React.FC<ValueScreenSettingsModalProps> = ({
  isOpen,
  onClose,
  onParametersUpdated,
}) => {
  const [params, setParams] = useState<RiskParameters>({
    demurrage_per_day_inr: 15000,
    default_hold_days: 5,
    quota_safeguard_rate: 0.25,
    cbam_default_markup_rate: 0.10,
    cbam_price_eur_per_tonne: 75.36,
    eur_to_inr_exchange_rate: 90.0,
    reshipping_rejection_pct: 0.08,
    minutes_per_shipment: 45,
    label: 'your estimate'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState('owner@howrahsteel.in');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/value-screen/parameters')
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data) setParams(data);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/value-screen/parameters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        onParametersUpdated?.();
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    setEmailStatus('sending');
    try {
      const res = await fetch('/api/value-screen/trigger-weekly-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_email: ownerEmail,
          owner_name: 'Managing Director',
          test_mode: true
        }),
      });
      if (res.ok) {
        setEmailStatus('sent');
        setTimeout(() => setEmailStatus(null), 3000);
      } else {
        setEmailStatus('error');
      }
    } catch {
      setEmailStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
      <div className="bg-[#FCFBF8] rounded-xl max-w-2xl w-full border border-[#18181A]/15 overflow-hidden text-left flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#18181A]/10 flex items-center justify-between bg-[#F7F5F0]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#059669]/10 text-[#059669] border border-[#059669]/20 rounded-lg">
              <Calculator className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-medium text-[#18181A] text-base">Value Screen &amp; Money-at-Risk Formula</h3>
              <p className="text-xs text-[#55544E]">Every calculation traces to visible, editable plant inputs.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 text-[#55544E] hover:text-[#18181A] rounded-lg hover:bg-[#EFECE5] flex items-center justify-center transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-[#18181A]">
          {/* Transparent Formula Banner */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-medium">Owner Transparency Invariant (Prompt C6):</span> HeatLedger AI never displays a protected money total that is not built from inputs you can see and adjust. Every metric is labeled as <em>your estimate</em>.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Demurrage */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#18181A] block">
                Port Demurrage (₹ / day per TEU)
              </label>
              <input
                type="number"
                value={params.demurrage_per_day_inr}
                onChange={(e) => setParams({ ...params, demurrage_per_day_inr: parseFloat(e.target.value) || 0 })}
                className="w-full h-9 px-3 bg-[#F7F5F0] border border-[#18181A]/15 rounded-lg text-[#18181A] font-mono text-sm focus:outline-none focus:border-[#059669]"
              />
              <span className="text-[11px] text-[#78766E]">Rotterdam / Antwerp standard detention fee</span>
            </div>

            {/* Estimated Hold Days */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#18181A] block">
                Default Port Hold Duration (Days)
              </label>
              <input
                type="number"
                value={params.default_hold_days}
                onChange={(e) => setParams({ ...params, default_hold_days: parseInt(e.target.value) || 1 })}
                className="w-full h-9 px-3 bg-[#F7F5F0] border border-[#18181A]/15 rounded-lg text-[#18181A] font-mono text-sm focus:outline-none focus:border-[#059669]"
              />
              <span className="text-[11px] text-[#78766E]">Estimated query turnaround without sealed dossier</span>
            </div>

            {/* Out of Quota Safeguard Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#18181A] block">
                Safeguard Quota Duty Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={params.quota_safeguard_rate * 100}
                onChange={(e) => setParams({ ...params, quota_safeguard_rate: (parseFloat(e.target.value) || 0) / 100 })}
                className="w-full h-9 px-3 bg-[#F7F5F0] border border-[#18181A]/15 rounded-lg text-[#18181A] font-mono text-sm focus:outline-none focus:border-[#059669]"
              />
              <span className="text-[11px] text-[#78766E]">Standard EU steel safeguard tariff: 25%</span>
            </div>

            {/* CBAM Default Markup */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#18181A] block">
                CBAM Default Penalty Markup (%)
              </label>
              <input
                type="number"
                step="1"
                value={params.cbam_default_markup_rate * 100}
                onChange={(e) => setParams({ ...params, cbam_default_markup_rate: (parseFloat(e.target.value) || 0) / 100 })}
                className="w-full h-9 px-3 bg-[#F7F5F0] border border-[#18181A]/15 rounded-lg text-[#18181A] font-mono text-sm focus:outline-none focus:border-[#059669]"
              />
              <span className="text-[11px] text-[#78766E]">10% for 2026, 20% for 2027 under EU CBAM</span>
            </div>

            {/* Re-shipping contingency */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#18181A] block">
                Re-shipping / Contingency Allowance (%)
              </label>
              <input
                type="number"
                step="1"
                value={params.reshipping_rejection_pct * 100}
                onChange={(e) => setParams({ ...params, reshipping_rejection_pct: (parseFloat(e.target.value) || 0) / 100 })}
                className="w-full h-9 px-3 bg-[#F7F5F0] border border-[#18181A]/15 rounded-lg text-[#18181A] font-mono text-sm focus:outline-none focus:border-[#059669]"
              />
              <span className="text-[11px] text-[#78766E]">Warehouse return cost if customs clearance is denied</span>
            </div>

            {/* Time Saved Minutes per Shipment */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#18181A] block">
                Engineering Minutes Saved / Shipment
              </label>
              <input
                type="number"
                value={params.minutes_per_shipment}
                onChange={(e) => setParams({ ...params, minutes_per_shipment: parseInt(e.target.value) || 0 })}
                className="w-full h-9 px-3 bg-[#F7F5F0] border border-[#18181A]/15 rounded-lg text-[#18181A] font-mono text-sm focus:outline-none focus:border-[#059669]"
              />
              <span className="text-[11px] text-[#78766E]">Manual paperwork time replaced by AI validation</span>
            </div>
          </div>

          {/* Test Weekly Owner Email */}
          <div className="p-4 bg-[#F7F5F0] border border-[#18181A]/10 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
                <span className="font-medium text-xs text-[#18181A]">Monday Weekly Executive Email Briefing</span>
              </div>
              <a
                href="/api/value-screen/director-pdf"
                download="HeatLedger_Executive_Report.pdf"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#047857] hover:underline bg-[#059669]/10 border border-[#059669]/20 px-2.5 py-1 rounded-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                1-Page Board PDF
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@yourplant.in"
                className="flex-1 h-9 px-3 bg-[#FCFBF8] border border-[#18181A]/15 rounded-lg text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
              />
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={emailStatus === 'sending'}
                className="h-9 px-3 bg-[#18181A] hover:bg-[#2C303A] text-[#FCFBF8] text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
              >
                {emailStatus === 'sending' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                ) : emailStatus === 'sent' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" strokeWidth={1.5} />
                ) : (
                  <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
                )}
                {emailStatus === 'sent' ? 'Sent!' : 'Send Test Briefing'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#18181A]/10 bg-[#F7F5F0] flex items-center justify-between">
          <span className="text-[11px] text-[#78766E]">Prepares documents for review. Not legal advice.</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 border border-[#18181A]/15 bg-[#FCFBF8] text-[#18181A] hover:bg-[#EFECE5] rounded-lg text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-9 px-4 bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              {isSaving ? 'Saving...' : 'Save Parameters'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
