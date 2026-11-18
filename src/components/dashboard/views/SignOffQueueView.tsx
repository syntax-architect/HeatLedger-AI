import React, { useState } from 'react';
import { 
  Stamp, 
  FileCheck2, 
  ShieldCheck, 
  CheckSquare, 
  Square, 
  Lock, 
  ArrowRight, 
  AlertCircle,
  Clock,
  UserCheck,
  Check,
  FileText,
  Building
} from 'lucide-react';

export const SignOffQueueView: React.FC = () => {
  const [complianceMode, setComplianceMode] = useState<'TRANSFORMED_3_1' | 'CLAUSE_6_PASSTHROUGH'>('TRANSFORMED_3_1');
  const [attestationChecked, setAttestationChecked] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [signTimestamp, setSignTimestamp] = useState<string | null>(null);

  const handleApplySignature = () => {
    if (!attestationChecked) return;
    setIsSigned(true);
    setSignTimestamp(new Date().toUTCString());
  };

  return (
    <div className="space-y-6">
      
      {/* View Header */}
      <div className="bg-white rounded-xl border border-border-crisp p-5 shadow-card-light space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Stamp className="w-5 h-5 text-emerald-600" />
              <span>EN 10204:2004 Clause 6 &amp; Authorised QA Sign-Off Queue</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Legal digital stamping workflow for the factory's Authorised Inspection Representative, legally binding under European standard EN 10204.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs font-mono text-emerald-800">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Authenticated Inspector: R. K. Chatterjee (#QA-04)</span>
          </div>
        </div>
      </div>

      {/* Mode Selection Tabs (Mode A vs Mode B) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Mode A: Transformed Product */}
        <div
          onClick={() => setComplianceMode('TRANSFORMED_3_1')}
          className={`p-5 rounded-xl cursor-pointer transition-all border ${
            complianceMode === 'TRANSFORMED_3_1'
              ? 'bg-white border-emerald-500 shadow-md ring-1 ring-emerald-500'
              : 'bg-slate-50 border-slate-200 hover:bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-badge text-emerald-darkText border border-emerald-300">
              MODE A · TRANSFORMED GOODS
            </span>
            {complianceMode === 'TRANSFORMED_3_1' && <Check className="w-4 h-4 text-emerald-600" />}
          </div>
          <h3 className="font-extrabold text-sm text-slate-900 mb-1">
            Issue Factory 3.1 + Lock Upstream Mill 3.1 as Annex A
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            For forged flanges (<span className="font-mono font-semibold text-slate-700">CN 7307</span>), heat-treated fasteners (<span className="font-mono font-semibold text-slate-700">CN 7318</span>), or welded tubes (<span className="font-mono font-semibold text-slate-700">CN 7306</span>) where mechanical properties were modified during manufacturing.
          </p>
        </div>

        {/* Mode B: Clause 6 Intermediary Pass-Through */}
        <div
          onClick={() => setComplianceMode('CLAUSE_6_PASSTHROUGH')}
          className={`p-5 rounded-xl cursor-pointer transition-all border ${
            complianceMode === 'CLAUSE_6_PASSTHROUGH'
              ? 'bg-white border-cobalt-blueprint shadow-md ring-1 ring-cobalt-blueprint'
              : 'bg-slate-50 border-slate-200 hover:bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-300">
              MODE B · CLAUSE 6 PASS-THROUGH
            </span>
            {complianceMode === 'CLAUSE_6_PASSTHROUGH' && <Check className="w-4 h-4 text-cobalt-blueprint" />}
          </div>
          <h3 className="font-extrabold text-sm text-slate-900 mb-1">
            Clause 6 Compliance Declaration + Packing List
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            For machined or cut bar stock where original raw material properties were unaltered. Generates the legal Clause 6 packing dossier alongside the pristine upstream mill certificate.
          </p>
        </div>

      </div>

      {/* Main Certificate Compiler & Sign-Off Canvas */}
      <div className="bg-white rounded-xl border border-border-crisp p-6 shadow-card-light space-y-6">
        
        {/* Certificate Pre-fill Metadata */}
        <div className="border-b border-border-crisp pb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono uppercase text-slate-400">Target Export Invoice</div>
            <div className="text-base font-bold font-mono text-slate-900">
              EXP-2026-109 · Forged Flanges ASTM A105 to Bremen, Germany
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-500">Allocated Heat:</span>
            <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
              #TSJ-26-9021 (Tata Steel)
            </span>
          </div>
        </div>

        {/* Certificate Content Review */}
        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4 font-mono text-xs">
          
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-800 uppercase">
              {complianceMode === 'TRANSFORMED_3_1' ? 'Factory Transformed 3.1 Cover Certificate' : 'Clause 6 Declaration of Compliance'}
            </span>
            <span className="text-emerald-700 font-semibold">Ready for Authorized Stamp</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
            <div>
              <span className="text-slate-500 text-[10px] block">MANUFACTURER:</span>
              <span className="font-bold">Howrah Precision Forgings Pvt. Ltd.</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">EU INSTALLATION ID:</span>
              <span className="font-bold">IN-WB-4409</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">ORIGIN OF MELT &amp; POUR:</span>
              <span className="font-bold text-emerald-800">INDIA (ISO IN)</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">UPSTREAM ANNEX:</span>
              <span className="font-bold text-cobalt-blueprint">Locked 3.1 PDF Annexed</span>
            </div>
          </div>

          {/* Verification Checklist */}
          <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Spectrometer Ladle Check Passed</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tensile &amp; Hardness Verified</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mass-Balance Quota Deducted</span>
            </div>
          </div>

        </div>

        {/* Authorised Inspection Representative Sign-Off Box */}
        <div className="p-6 rounded-xl bg-slate-900 text-white space-y-5 border border-slate-800">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stamp className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-extrabold uppercase font-mono tracking-wider text-slate-100">
                Authorised Inspection Representative Sign-Off Box
              </h4>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              European Standard EN 10204:2004 Clause 4 &amp; Clause 6
            </span>
          </div>

          {/* Inspector ID Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px] block">AUTHORIZED REPRESENTATIVE</span>
              <span className="font-bold text-slate-200">R. K. Chatterjee</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">DESIGNATION &amp; ROLE</span>
              <span className="font-bold text-slate-200">Head of Metallurgy &amp; QA (#QA-04)</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">INDEPENDENCE STATUS</span>
              <span className="font-bold text-emerald-400">Independent of Production Works</span>
            </div>
          </div>

          {/* Mandatory Legal Attestation Checkbox */}
          <div 
            onClick={() => !isSigned && setAttestationChecked(!attestationChecked)}
            className={`p-3.5 rounded-lg border transition-colors cursor-pointer flex items-start gap-3 ${
              attestationChecked ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-slate-950 border-slate-800'
            }`}
          >
            <div className="mt-0.5">
              {attestationChecked ? (
                <CheckSquare className="w-4 h-4 text-emerald-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              <strong className="text-white">Mandatory Legal Attestation:</strong> I hereby certify under European Standard EN 10204:2004 that the delivered products comply with the specifications in the purchase order and relevant ASTM/EN standards. I confirm that Country of Melt &amp; Pour is India, and that the upstream mill test certificate attached as Annex A is pristine and unaltered.
            </p>
          </div>

          {/* Sign & Stamp Button or Stamped Result */}
          {!isSigned ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Requires active QA Manager credentials to sign</span>
              </div>
              <button
                onClick={handleApplySignature}
                disabled={!attestationChecked}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-obsidian-900 font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-glow-emerald"
              >
                <Stamp className="w-4 h-4" />
                <span>Apply Timestamped Digital Signature &amp; Factory Stamp</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/60 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg border-2 border-dashed border-emerald-400 flex flex-col items-center justify-center text-emerald-400 p-1">
                  <span className="text-[9px] font-black font-mono">SEALED</span>
                  <span className="text-[7px] font-mono">QA-04</span>
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-emerald-300">
                    DIGITALLY SIGNED &amp; SEALED BY R. K. CHATTERJEE
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Timestamp: {signTimestamp} · SHA-256 Validated
                  </div>
                </div>
              </div>

              <span className="px-3 py-1 rounded bg-emerald-500 text-obsidian-900 font-mono font-bold text-xs uppercase">
                Container Dossier Ready
              </span>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
