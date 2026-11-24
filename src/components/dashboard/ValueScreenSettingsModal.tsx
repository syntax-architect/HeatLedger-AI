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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden text-left flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Value Screen & Money-at-Risk Formula</h3>
              <p className="text-xs text-slate-500">Every calculation traces to visible, editable plant inputs.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* Transparent Formula Banner */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong>Owner Transparency Invariant (Prompt C6):</strong> HeatLedger AI never displays a protected money total that is not built from inputs you can see and adjust. Every metric is labeled as <em>your estimate</em>.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Demurrage */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Port Demurrage (₹ / day per TEU)
              </label>
              <input
                type="number"
                value={params.demurrage_per_day_inr}
                onChange={(e) => setParams({ ...params, demurrage_per_day_inr: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400">Rotterdam / Antwerp standard detention fee</span>
            </div>

            {/* Estimated Hold Days */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Default Port Hold Duration (Days)
              </label>
              <input
                type="number"
                value={params.default_hold_days}
                onChange={(e) => setParams({ ...params, default_hold_days: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400">Estimated query turnaround without sealed dossier</span>
            </div>

            {/* Out of Quota Safeguard Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Safeguard Quota Duty Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={params.quota_safeguard_rate * 100}
                onChange={(e) => setParams({ ...params, quota_safeguard_rate: (parseFloat(e.target.value) || 0) / 100 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400">Standard EU steel safeguard tariff: 25%</span>
            </div>

            {/* CBAM Default Markup */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                CBAM Default Penalty Markup (%)
              </label>
              <input
                type="number"
                step="1"
                value={params.cbam_default_markup_rate * 100}
                onChange={(e) => setParams({ ...params, cbam_default_markup_rate: (parseFloat(e.target.value) || 0) / 100 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400">10% for 2026, 20% for 2027 under EU CBAM</span>
            </div>

            {/* Re-shipping contingency */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Re-shipping / Contingency Allowance (%)
              </label>
              <input
                type="number"
                step="1"
                value={params.reshipping_rejection_pct * 100}
                onChange={(e) => setParams({ ...params, reshipping_rejection_pct: (parseFloat(e.target.value) || 0) / 100 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400">Warehouse return cost if customs clearance is denied</span>
            </div>

            {/* Time Saved Minutes per Shipment */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Engineering Minutes Saved / Shipment
              </label>
              <input
                type="number"
                value={params.minutes_per_shipment}
                onChange={(e) => setParams({ ...params, minutes_per_shipment: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400">Manual paperwork time replaced by AI validation</span>
            </div>
          </div>

          {/* Test Weekly Owner Email */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-600" />
                <span className="font-semibold text-xs text-slate-900">Monday Weekly Executive Email Briefing</span>
              </div>
              <a
                href="/api/value-screen/director-pdf"
                download="HeatLedger_Executive_Report.pdf"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                1-Page Board PDF
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@yourplant.in"
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={emailStatus === 'sending'}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
              >
                {emailStatus === 'sending' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : emailStatus === 'sent' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Mail className="w-3.5 h-3.5" />
                )}
                {emailStatus === 'sent' ? 'Sent!' : 'Send Test Briefing'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Prepares documents for review. Not legal advice.</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              {isSaving ? 'Saving...' : 'Save Parameters'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
