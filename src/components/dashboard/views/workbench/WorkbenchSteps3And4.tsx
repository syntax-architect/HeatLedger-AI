import React from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Download, ShieldCheck } from 'lucide-react';

interface WorkbenchStep3AllocateProps {
  heatNumber: string;
  selectedShipment: string;
  onSelectedShipmentChange: (s: string) => void;
  allocatedTonnes: number;
  onAllocatedTonnesChange: (t: number) => void;
  onBack: () => void;
  onConfirmAllocate: () => void;
}

export const WorkbenchStep3Allocate: React.FC<WorkbenchStep3AllocateProps> = ({
  heatNumber,
  selectedShipment,
  onSelectedShipmentChange,
  allocatedTonnes,
  onAllocatedTonnesChange,
  onBack,
  onConfirmAllocate,
}) => (
  <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-6 space-y-6 max-w-2xl mx-auto">
    <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-4">
      <div>
        <h2 className="text-lg font-medium text-[#18181A] tracking-[-0.01em]">
          Step 3: Add to Export Shipment
        </h2>
        <p className="text-xs text-[#55544E] mt-1">
          Allocate approved Heat #{heatNumber} to an active export consignment.
        </p>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="text-xs text-[#55544E] hover:text-[#18181A] flex items-center gap-1 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Back to Review
      </button>
    </div>

    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[#18181A] mb-1">Target Shipment</label>
        <select
          value={selectedShipment}
          onChange={(e) => onSelectedShipmentChange(e.target.value)}
          className="w-full h-9 px-3 rounded-lg border border-[#18181A]/15 text-xs font-medium text-[#18181A] bg-[#FCFBF8] focus:outline-none focus:border-[#059669]"
        >
          <option value="SH-2026-0881">SH-2026-0881 · ThyssenKrupp AG (Antwerp, Belgium)</option>
          <option value="SH-2026-0879">SH-2026-0879 · ArcelorMittal Gent (Rotterdam)</option>
          <option value="NEW_SHIPMENT">+ Create New Consignment...</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#18181A] mb-1">
          Tonnage to Allocate (MT)
        </label>
        <div className="relative">
          <input
            type="number"
            value={allocatedTonnes}
            onChange={(e) => onAllocatedTonnesChange(parseFloat(e.target.value) || 0)}
            className="w-full h-9 px-3 pr-12 rounded-lg border border-[#18181A]/15 bg-[#FCFBF8] text-xs font-mono tabular-nums font-medium text-[#18181A] focus:outline-none focus:border-[#059669]"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#78766E]">MT</span>
        </div>
        <p className="text-xs text-[#55544E] mt-1">
          Remaining heat inventory: 95.50 MT after allocation
        </p>
      </div>

      <div className="rounded-lg border border-[#18181A]/10 bg-[#F7F5F0] p-4 space-y-2.5">
        <h4 className="text-xs font-medium text-[#18181A]">Statutory Readiness Checklist</h4>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[#047857]">
              <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
              <span>Melt &amp; Pour Origin Verified: India (EU Reg 2026/1963)</span>
            </span>
            <span className="text-xs font-mono text-[#047857] font-medium">OK</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[#047857]">
              <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
              <span>Product CN Code in Scope (7214.20)</span>
            </span>
            <span className="text-xs font-mono text-[#047857] font-medium">OK</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[#047857]">
              <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
              <span>Heat Mass-Balance Reconciled (No double allocation)</span>
            </span>
            <span className="text-xs font-mono text-[#047857] font-medium">OK</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onConfirmAllocate}
        className="w-full h-10 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors duration-150"
      >
        <span>Confirm &amp; Build Buyer Pack</span>
        <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </div>
  </div>
);

interface WorkbenchStep4DownloadProps {
  isSealed: boolean;
  inspectorTotp: string;
  onInspectorTotpChange: (v: string) => void;
  onApplySeal: () => void;
  onBack: () => void;
  onDownloadPdf: () => void;
  onDownloadZip: () => void;
  onResetFlow: () => void;
}

export const WorkbenchStep4Download: React.FC<WorkbenchStep4DownloadProps> = ({
  isSealed,
  inspectorTotp,
  onInspectorTotpChange,
  onApplySeal,
  onBack,
  onDownloadPdf,
  onDownloadZip,
  onResetFlow,
}) => (
  <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-6 space-y-6 max-w-2xl mx-auto">
    <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-4">
      <div>
        <h2 className="text-lg font-medium text-[#18181A] tracking-[-0.01em]">
          Step 4: Buyer Pack Ready for Download
        </h2>
        <p className="text-xs text-[#55544E] mt-1">
          Byte-identical certificates + 1-page compliance summary + QR verification seal.
        </p>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="text-xs text-[#55544E] hover:text-[#18181A] flex items-center gap-1 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Back
      </button>
    </div>

    <div className="rounded-xl border border-[#18181A]/10 bg-[#F7F5F0] p-4 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[#18181A]">Buyer Pack Contents</span>
        <span className="text-[#047857] font-medium flex items-center gap-1">
          <Check className="w-4 h-4" strokeWidth={1.5} /> 100% Complete
        </span>
      </div>
      <ul className="text-xs text-[#55544E] space-y-1.5 list-disc list-inside">
        <li>Original Mill Test Certificate (byte-identical, unmodified)</li>
        <li>1-Page Executive CBAM &amp; Melt-and-Pour Summary</li>
        <li>SHA-256 Manifest and Ed25519 Cryptographic Seal</li>
        <li>QR Link to Public Buyer Verification Portal</li>
      </ul>
    </div>

    <div className="rounded-xl border border-[#2C303A] bg-[#121316] p-4 text-[#EAEAEA] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
          <span className="text-xs font-medium">Inspector Seal (TOTP)</span>
        </div>
        {isSealed ? (
          <span className="text-xs text-[#10B981] font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
            SEALED &amp; TIMESTAMPED
          </span>
        ) : (
          <span className="text-xs text-[#FBBF24] font-medium">Pending 6-Digit TOTP</span>
        )}
      </div>
      {!isSealed ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Enter 6-digit TOTP"
            maxLength={6}
            value={inspectorTotp}
            onChange={(e) => onInspectorTotpChange(e.target.value.replace(/\D/g, ''))}
            className="h-9 px-3 rounded-lg bg-[#181A1F] border border-[#2C303A] text-xs font-mono tabular-nums tracking-[0.14em] text-[#EAEAEA] placeholder-[#6F7480] focus:outline-none focus:border-[#10B981] w-44"
          />
          <button
            type="button"
            onClick={onApplySeal}
            className="h-9 px-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-[#121316] text-xs font-medium cursor-pointer transition-colors duration-150"
          >
            Apply Inspector Seal
          </button>
        </div>
      ) : (
        <p className="text-xs text-[#9FA3AD]">
          Sealed by Authorized Plant Inspector (QA-4409) · Ed25519 signature verified.
        </p>
      )}
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
      <button
        type="button"
        onClick={onDownloadPdf}
        className="h-10 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors duration-150"
      >
        <Download className="w-4 h-4" strokeWidth={1.5} />
        <span>Download Buyer Pack (PDF)</span>
      </button>
      <button
        type="button"
        onClick={onDownloadZip}
        className="h-10 rounded-lg bg-[#FCFBF8] border border-[#18181A]/15 hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors duration-150"
      >
        <Download className="w-4 h-4" strokeWidth={1.5} />
        <span>Download ZIP (Manifest + Originals)</span>
      </button>
    </div>

    <div className="text-center pt-2 border-t border-[#18181A]/10">
      <button
        type="button"
        onClick={onResetFlow}
        className="text-xs text-[#047857] hover:underline font-medium cursor-pointer"
      >
        Upload Next Certificate →
      </button>
    </div>
  </div>
);
