import React, { useState } from 'react';
import {
  Plus,
  CheckCircle2,
  X,
  MessageSquare,
  Send,
  RefreshCw,
} from 'lucide-react';
import { CreateSupplierRequestInput } from '../../../../services/api';
import { SUPPLIER_PRESETS } from './types';
import { useToast } from '../../../ui/ToastContext';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitCreate: (payload: CreateSupplierRequestInput) => Promise<any>;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmitCreate,
}) => {
  const toast = useToast();
  const [createdResult, setCreatedResult] = useState<any | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState<string>('sup_tata_01');
  const [supplierName, setSupplierName] = useState<string>('Tata Steel Limited (Jamshedpur)');
  const [productName, setProductName] = useState<string>('Continuously Cast Billets (150x150 mm)');
  const [cnCode, setCnCode] = useState<string>('7207 11 00');
  const [reportingPeriod, setReportingPeriod] = useState<string>('2026-Q1');
  const [dueDate, setDueDate] = useState<string>('2026-12-15');
  const [supplierEmail, setSupplierEmail] = useState<string>('cbam.desk@tatasteel.com');
  const [supplierPhone, setSupplierPhone] = useState<string>('+919830112233');
  const [customNote, setCustomNote] = useState<string>('Required for EU CBAM export batch EXP-2026-109');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSupplierSelect = (id: string) => {
    const s = SUPPLIER_PRESETS.find((p) => p.id === id);
    if (s) {
      setSupplierId(s.id);
      setSupplierName(s.name);
      setSupplierEmail(s.email);
      setSupplierPhone(s.phone);
      setProductName(s.defaultProduct);
      setCnCode(s.defaultCn);
    }
  };

  const handleCopyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken('modal');
    toast.success('Copied to Clipboard', 'Supplier link copied.');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: CreateSupplierRequestInput = {
        supplier_id: supplierId,
        supplier_name: supplierName,
        product_name: productName,
        cn_code: cnCode,
        reporting_period: reportingPeriod,
        due_date: dueDate,
        data_needed: [
          'production_route',
          'direct_fuel_consumption',
          'electricity_consumption',
          'electricity_source',
          'scrap_content_pct',
          'precursor_emissions_tco2_per_t',
          'evidence_doc',
        ],
        supplier_email: supplierEmail || undefined,
        supplier_phone: supplierPhone || undefined,
        custom_note: customNote || undefined,
      };

      const result = await onSubmitCreate(payload);
      setCreatedResult(result);
      toast.success('Request Created', 'No-login supplier portal link generated.');
    } catch (err: any) {
      toast.error('Request Creation Failed', err?.message || 'Unable to create supplier request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0D0E11]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FCFBF8] border border-[#18181A]/15 rounded-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3.5">
          <h3 className="text-base font-medium text-[#18181A] flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
            <span>New Supplier CBAM Data Request</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#55544E] hover:text-[#18181A] h-8 w-8 rounded-lg hover:bg-[#EFECE5] flex items-center justify-center transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {createdResult ? (
          <div className="py-4 text-center space-y-4">
            <div className="w-11 h-11 mx-auto rounded-xl bg-[#059669]/10 border border-[#059669]/20 text-[#059669] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h4 className="text-base font-medium text-[#18181A]">
              Secure Request Link Generated
            </h4>
            <p className="text-xs text-[#55544E] leading-relaxed max-w-md mx-auto">
              The request for <span className="font-medium text-[#18181A]">{createdResult.product_name}</span> is live. Share this mobile link with your supplier&apos;s QA or sustainability desk:
            </p>

            <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 flex items-center justify-between gap-3 text-left">
              <span className="text-xs font-mono text-[#047857] truncate">
                {window.location.origin}/supplier-request/{createdResult.token}
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopyLink(
                    `${window.location.origin}/supplier-request/${createdResult.token}`
                  )
                }
                className="h-8 px-3 rounded-md bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] text-xs font-medium shrink-0 transition-colors"
              >
                {copiedToken === 'modal' ? 'Copied' : 'Copy Link'}
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#18181A]/10 text-left text-xs text-[#18181A] space-y-2">
              <div className="font-medium flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                <span>WhatsApp Invitation Preview</span>
              </div>
              <pre className="text-xs font-mono text-[#55544E] whitespace-pre-wrap bg-[#FCFBF8] p-3 rounded-lg border border-[#18181A]/10">
                {createdResult.whatsapp_invitation}
              </pre>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg bg-[#18181A] hover:bg-[#2C303A] text-[#FCFBF8] text-xs font-medium transition-colors"
            >
              Done &amp; Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#55544E] mb-1.5">
                Select Upstream Steel Mill *
              </label>
              <select
                value={supplierId}
                onChange={(e) => handleSupplierSelect(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
              >
                {SUPPLIER_PRESETS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#55544E] mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#55544E] mb-1.5">
                  CN Code (Combined Nomenclature) *
                </label>
                <input
                  type="text"
                  required
                  value={cnCode}
                  onChange={(e) => setCnCode(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs font-mono focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#55544E] mb-1.5">
                  Reporting Period *
                </label>
                <select
                  value={reportingPeriod}
                  onChange={(e) => setReportingPeriod(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
                >
                  <option value="2026-Q1">2026-Q1 (Jan – Mar 2026)</option>
                  <option value="2026-Q2">2026-Q2 (Apr – Jun 2026)</option>
                  <option value="2025-Annual">2025-Annual (Full Year)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#55544E] mb-1.5">
                  Target Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs font-mono focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#55544E] mb-1.5">
                  Supplier Contact Email
                </label>
                <input
                  type="email"
                  value={supplierEmail}
                  onChange={(e) => setSupplierEmail(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#55544E] mb-1.5">
                  Supplier Contact Phone (WhatsApp)
                </label>
                <input
                  type="tel"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs font-mono focus:outline-none focus:border-[#059669]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#55544E] mb-1.5">
                Custom Note / Batch Context
              </label>
              <textarea
                rows={2}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. Precursor billets for export batch EXP-2026-109."
                className="w-full px-3 py-2 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs placeholder:text-[#78766E] focus:outline-none focus:border-[#059669]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#18181A]/10">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-3.5 rounded-lg text-xs font-medium text-[#55544E] hover:text-[#18181A] border border-[#18181A]/15 bg-[#FCFBF8] hover:bg-[#EFECE5] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] font-medium text-xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                    <span>Generating Link...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Create &amp; Generate Link</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
