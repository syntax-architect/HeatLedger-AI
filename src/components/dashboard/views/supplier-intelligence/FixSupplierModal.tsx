import React, { useMemo, useState } from 'react';
import { Send, MessageSquare, Mail, Copy, Check, X } from 'lucide-react';
import { useToast } from '../../../ui/ToastContext';
import { haptics } from '../../../../lib/motion';
import type { SupplierItem } from './types';

interface FixSupplierModalProps {
  supplier: SupplierItem;
  certNumber: string;
  heatNumber: string;
  organizationName?: string;
  onCertNumberChange: (val: string) => void;
  onHeatNumberChange: (val: string) => void;
  onClose: () => void;
}

export const FixSupplierModal: React.FC<FixSupplierModalProps> = ({
  supplier,
  certNumber,
  heatNumber,
  organizationName = 'Export Compliance Team',
  onCertNumberChange,
  onHeatNumberChange,
  onClose,
}) => {
  const toast = useToast();
  const [fixDefectType, setFixDefectType] = useState('MISSING_MELT_COUNTRY');
  const [copiedType, setCopiedType] = useState<'whatsapp' | 'email' | null>(null);

  const defectExplanation = useMemo(() => {
    switch (fixDefectType) {
      case 'MISSING_MELT_COUNTRY':
        return 'Missing ISO 3166 Melt-and-Pour Country of Origin attestation. Per EU Regulation 2026/1963 and UK CBAM rules, customs clearance cannot proceed without checked crude steel melt location.';
      case 'BLURRY_DOT_MATRIX_OCR':
        return 'Faint or clipped dot-matrix printed chemistry table. Carbon (C) and Manganese (Mn) ladle analysis values are illegible for automated customs checks.';
      case 'OFF_SPEC_CHEMISTRY':
        return 'Silicon or Phosphorus levels appear outside ASTM ordered standard thresholds.';
      case 'PO_QTY_MISMATCH':
        return 'Net delivered coil tonnage on invoice deviates from purchase order weight limits by more than allowable rolling tolerance.';
      default:
        return 'Documentation exception requires immediate technical correction.';
    }
  }, [fixDefectType]);

  const generatedWhatsAppMsg = useMemo(() => {
    return (
      `URGENT: Mill Test Certificate Correction Request\n\n` +
      `Dear ${supplier.contact_person} (${supplier.name}),\n\n` +
      `Our export compliance inspection gate flagged an exception with the certificate for export shipment:\n` +
      `- MTC Number: ${certNumber}\n` +
      `- Heat Number: ${heatNumber}\n` +
      `- Exception: ${defectExplanation}\n\n` +
      `EU customs clearance is currently held. Please upload an amended EN 10204 3.1 MTC via our intake portal:\n` +
      `https://heatledger.ai/upload?cert=${certNumber}&heat=${heatNumber}\n\n` +
      `Thank you,\n` +
      `Quality Assurance & Export Compliance,\n` +
      `${organizationName}`
    );
  }, [supplier, certNumber, heatNumber, defectExplanation, organizationName]);

  const generatedEmailBody = useMemo(() => {
    return (
      `Dear ${supplier.contact_person},\n\n` +
      `We are writing to request an urgent amendment to Mill Test Certificate ${certNumber} (Heat #${heatNumber}) ` +
      `supplied to ${organizationName}.\n\n` +
      `During pre-shipment CBAM definitive regime checks under Regulation (EU) 2026/1963, ` +
      `our inspection gate identified the following issue:\n\n` +
      `EXCEPTION DETAILS:\n` +
      `--------------------------------------------------\n` +
      `${defectExplanation}\n` +
      `--------------------------------------------------\n\n` +
      `To avoid port detention at Rotterdam/Hamburg, please issue an amended EN 10204 3.1 ` +
      `certificate containing the authenticated Melt-and-Pour declaration.\n\n` +
      `Submit the corrected document directly via our vendor intake portal:\n` +
      `https://heatledger.ai/upload?cert=${certNumber}&heat=${heatNumber}\n\n` +
      `Sincerely,\n` +
      `Head of Metallurgy & Quality Assurance\n` +
      `${organizationName}`
    );
  }, [supplier, certNumber, heatNumber, defectExplanation, organizationName]);

  const handleCopyText = (text: string, type: 'whatsapp' | 'email') => {
    haptics.tap();
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    toast.success(
      'Copied to Clipboard',
      `Correction ${type === 'whatsapp' ? 'WhatsApp message' : 'formal email'} copied.`
    );
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
      <div className="bg-[#FCFBF8] border border-[#18181A]/15 rounded-xl max-w-lg w-full p-6 space-y-4 text-left max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#18181A]/10">
          <div className="flex items-center gap-2 min-w-0">
            <Send className="w-4 h-4 text-[#B45309] shrink-0" strokeWidth={1.5} />
            <h3 className="text-sm font-medium text-[#18181A] truncate">
              Ask Supplier to Fix: {supplier.name}
            </h3>
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

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="text-xs font-medium text-[#18181A] block mb-1.5">
              Exception Category
            </label>
            <select
              value={fixDefectType}
              onChange={(e) => setFixDefectType(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
            >
              <option value="MISSING_MELT_COUNTRY">Missing ISO 3166 Melt-and-Pour Country of Origin</option>
              <option value="BLURRY_DOT_MATRIX_OCR">Faint / Illegible Dot-Matrix Ladle Analysis</option>
              <option value="OFF_SPEC_CHEMISTRY">Out-of-Spec Chemistry (Silicon / Phosphorus)</option>
              <option value="PO_QTY_MISMATCH">Delivered Weight Exceeds PO Tolerance</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#18181A] block mb-1.5">
                MTC Reference
              </label>
              <input
                type="text"
                value={certNumber}
                onChange={(e) => onCertNumberChange(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono text-xs focus:outline-none focus:border-[#059669]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#18181A] block mb-1.5">
                Heat Number
              </label>
              <input
                type="text"
                value={heatNumber}
                onChange={(e) => onHeatNumberChange(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono text-xs focus:outline-none focus:border-[#059669]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-medium text-[#047857] flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                WhatsApp Direct Notice:
              </span>
              <button
                type="button"
                onClick={() => handleCopyText(generatedWhatsAppMsg, 'whatsapp')}
                className="text-xs font-medium text-[#55544E] hover:text-[#18181A] inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedType === 'whatsapp' ? (
                  <Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
                ) : (
                  <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                )}
                <span>{copiedType === 'whatsapp' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <textarea
              readOnly
              rows={4}
              value={generatedWhatsAppMsg}
              className="w-full p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 font-mono text-xs text-[#18181A] leading-relaxed focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-medium text-[#18181A] flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
                Formal Email Template:
              </span>
              <button
                type="button"
                onClick={() => handleCopyText(generatedEmailBody, 'email')}
                className="text-xs font-medium text-[#55544E] hover:text-[#18181A] inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedType === 'email' ? (
                  <Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
                ) : (
                  <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                )}
                <span>{copiedType === 'email' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <textarea
              readOnly
              rows={5}
              value={generatedEmailBody}
              className="w-full p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 font-mono text-xs text-[#18181A] leading-relaxed focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#18181A]/10">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-[#18181A]/12 bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium transition-colors duration-150 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
