import React from 'react';
import { Check, CheckCircle2, X } from 'lucide-react';

interface SupplierNewRequestModalProps {
  createdResult: any;
  newSupplier: string;
  onNewSupplierChange: (supplier: string, supplierId: string) => void;
  newProduct: string;
  onNewProductChange: (v: string) => void;
  newCnCode: string;
  onNewCnCodeChange: (v: string) => void;
  newPeriod: string;
  onNewPeriodChange: (v: string) => void;
  newDeadline: string;
  onNewDeadlineChange: (v: string) => void;
  newPhone: string;
  onNewPhoneChange: (v: string) => void;
  newEmail: string;
  onNewEmailChange: (v: string) => void;
  onCopyLink: (token: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const SupplierNewRequestModal: React.FC<SupplierNewRequestModalProps> = ({
  createdResult,
  newSupplier,
  onNewSupplierChange,
  newProduct,
  onNewProductChange,
  newCnCode,
  onNewCnCodeChange,
  newPeriod,
  onNewPeriodChange,
  newDeadline,
  onNewDeadlineChange,
  newPhone,
  onNewPhoneChange,
  newEmail,
  onNewEmailChange,
  onCopyLink,
  onClose,
  onSubmit,
}) => (
  <div className="fixed inset-0 z-50 bg-[#0D0E11]/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-[#FCFBF8] border border-[#18181A]/15 rounded-xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-4">
        <div>
          <h2 className="text-base font-medium text-[#18181A] tracking-[-0.01em]">
            Create CBAM Data Request
          </h2>
          <p className="text-xs text-[#55544E] mt-0.5">
            Generate a secure no-login mobile link for upstream mills and traders.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[#55544E] hover:text-[#18181A] p-1.5 rounded-lg hover:bg-[#EFECE5] transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {createdResult ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#ECFDF5] border border-emerald-200 text-xs space-y-2.5">
            <div className="flex items-center gap-2 font-medium text-sm text-[#047857]">
              <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
              Request Link Generated
            </div>
            <p className="text-[#047857]">
              Send this link to the mill quality or dispatch officer. No account or password is
              required.
            </p>
            <div className="flex items-center gap-2 bg-[#FCFBF8] p-2.5 rounded-lg border border-emerald-200 font-mono text-xs break-all text-[#18181A]">
              <span className="flex-1">
                {window.location.origin}
                {createdResult.form_url || createdResult.public_url}
              </span>
              <button
                type="button"
                onClick={() => onCopyLink(createdResult.secure_token || createdResult.token)}
                className="h-8 px-2.5 bg-[#059669] hover:bg-[#047857] text-white rounded-md text-xs font-sans font-medium shrink-0 cursor-pointer"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-[#18181A]">WhatsApp Invitation Template</span>
            <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-xs font-mono text-[#18181A] whitespace-pre-wrap">
              {createdResult.whatsapp_invitation}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-[#18181A]/10">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg text-xs font-medium bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#18181A]">Upstream Mill / Supplier</label>
            <select
              value={newSupplier}
              onChange={(e) => {
                const val = e.target.value;
                const supId = val.includes('Tata')
                  ? 'sup_tata_steel'
                  : val.includes('SAIL')
                    ? 'sup_sail_bokaro'
                    : val.includes('JSW')
                      ? 'sup_jsw_steel'
                      : 'sup_custom_mill';
                onNewSupplierChange(val, supId);
              }}
              className="w-full h-9 bg-[#F7F5F0] border border-[#18181A]/12 rounded-lg px-3 text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
            >
              <option value="Tata Steel Limited">
                Tata Steel Limited (Jamshedpur / Kalinganagar)
              </option>
              <option value="Steel Authority of India Limited (SAIL)">
                SAIL (Bokaro / Rourkela)
              </option>
              <option value="JSW Steel Limited">JSW Steel Limited (Vijayanagar Works)</option>
              <option value="Jindal Steel & Power Ltd.">
                Jindal Steel &amp; Power Ltd. (Raigarh)
              </option>
              <option value="Kalyani Steels Limited">Kalyani Steels Limited (Ginigera)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#18181A]">Product / Precursor Name</label>
              <input
                type="text"
                value={newProduct}
                onChange={(e) => onNewProductChange(e.target.value)}
                className="w-full h-9 bg-[#F7F5F0] border border-[#18181A]/12 rounded-lg px-3 text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#18181A]">Combined CN Code</label>
              <input
                type="text"
                value={newCnCode}
                onChange={(e) => onNewCnCodeChange(e.target.value)}
                className="w-full h-9 bg-[#F7F5F0] border border-[#18181A]/12 rounded-lg px-3 text-xs text-[#18181A] font-mono tabular-nums focus:outline-none focus:border-[#059669]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#18181A]">Reporting Period</label>
              <select
                value={newPeriod}
                onChange={(e) => onNewPeriodChange(e.target.value)}
                className="w-full h-9 bg-[#F7F5F0] border border-[#18181A]/12 rounded-lg px-3 text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
              >
                <option value="2026-Q1">2026-Q1 (Jan – Mar 2026)</option>
                <option value="2026-Q2">2026-Q2 (Apr – Jun 2026)</option>
                <option value="2025-Q4">2025-Q4 (Oct – Dec 2025)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#18181A]">Submission Due Date</label>
              <input
                type="date"
                value={newDeadline}
                onChange={(e) => onNewDeadlineChange(e.target.value)}
                className="w-full h-9 bg-[#F7F5F0] border border-[#18181A]/12 rounded-lg px-3 text-xs text-[#18181A] font-mono tabular-nums focus:outline-none focus:border-[#059669]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#18181A]">WhatsApp Mobile (+91)</label>
              <input
                type="text"
                value={newPhone}
                onChange={(e) => onNewPhoneChange(e.target.value)}
                className="w-full h-9 bg-[#F7F5F0] border border-[#18181A]/12 rounded-lg px-3 text-xs text-[#18181A] font-mono tabular-nums focus:outline-none focus:border-[#059669]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#18181A]">QA Contact Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => onNewEmailChange(e.target.value)}
                className="w-full h-9 bg-[#F7F5F0] border border-[#18181A]/12 rounded-lg px-3 text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#18181A]">Data Fields Included</label>
            <div className="grid grid-cols-2 gap-2 text-xs text-[#55544E] bg-[#F7F5F0] p-3 rounded-lg border border-[#18181A]/10">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} /> Production Route
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} /> Direct Fuel
                Consumption
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} /> Electricity &amp;
                Grid Factor
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} /> Scrap Input
                Content (%)
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} /> Precursors
                Consumed
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} /> Evidence PDF /
                Excel
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#18181A]/10">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3.5 rounded-lg text-xs font-medium text-[#55544E] hover:text-[#18181A] border border-[#18181A]/12 bg-[#FCFBF8] hover:bg-[#EFECE5] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-4 rounded-lg text-xs font-medium bg-[#059669] hover:bg-[#047857] text-white transition-colors duration-150 cursor-pointer"
            >
              Generate Secure Link &amp; Templates
            </button>
          </div>
        </form>
      )}
    </div>
  </div>
);
