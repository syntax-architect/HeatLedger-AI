import React from 'react';
import { ShieldCheck, FileCheck, QrCode, Download, ExternalLink, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SampleBuyerPackSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="sample-pack" className="py-20 bg-[#FFFFFF] border-y border-[#E4E4E7]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            Standard Output
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#09090B] tracking-tight mt-3">
            The Buyer Pack Your Customs Broker Expects
          </h2>
          <p className="text-sm text-[#52525B] mt-2">
            Byte-identical original certificates, a one-page statutory summary, and a QR link for instant online verification.
          </p>
        </div>

        {/* Interactive Mockup Container */}
        <div className="bg-[#0B0F17] rounded-2xl border border-white/[0.08] p-6 sm:p-8 text-white shadow-xl max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/[0.08] gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold text-base">Consignment Pack: EXP-2026-0881</span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-1 font-mono">
                SHA-256: 9f82c4013e89a42d · Ed25519 Inspector Sealed
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> 100% Prepared for Review
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-white/[0.08] text-xs">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
              <span className="text-[#71717A] uppercase tracking-wider text-[10px] font-semibold">1. Original Certificate</span>
              <p className="font-medium text-white">SAIL Bokaro EN 10204 3.1</p>
              <p className="text-[#A1A1AA] text-[11px]">Byte-identical preservation. Unstamped and unmodified per Clause 6.</p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
              <span className="text-[#71717A] uppercase tracking-wider text-[10px] font-semibold">2. Statutory Summary</span>
              <p className="font-medium text-white">India Melt &amp; Pour Verified</p>
              <p className="text-[#A1A1AA] text-[11px]">EU Reg 2026/1963 evidence with mass-balance tonnage ledger.</p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
              <span className="text-[#71717A] uppercase tracking-wider text-[10px] font-semibold">3. Cryptographic Seal</span>
              <p className="font-medium text-white">QA Inspector TOTP Signed</p>
              <p className="text-[#A1A1AA] text-[11px]">Tamper-evident verification token with instant revocation control.</p>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white p-1 shrink-0 flex items-center justify-center">
                <QrCode className="w-10 h-10 text-[#09090B]" />
              </div>
              <div className="text-xs">
                <p className="font-medium text-white">Scan to verify pack integrity</p>
                <p className="text-[#71717A] text-[11px]">Opens public tamper verifier without login</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate('/verify')}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-medium border border-white/[0.1] flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Test Verifier</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/check')}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm"
              >
                <span>Check Your Certificate Free</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
