import React from 'react';
import { ShieldCheck, FileCheck, QrCode, ExternalLink, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SampleBuyerPackSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section
      id="sample-pack"
      className="py-20 lg:py-28 bg-[#121316] text-[#EAEAEA] border-b border-[#EAEAEA]/[0.08]"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <div className="text-xs font-mono text-[#10B981] mb-3">
            Consignment dossier format
          </div>
          <h2 className="text-3xl sm:text-4xl font-medium text-[#EAEAEA] tracking-[-0.025em] leading-[1.12]">
            The buyer pack your customs broker expects
          </h2>
          <p className="text-base text-[#9FA3AD] mt-4 leading-relaxed">
            Byte-identical original certificates paired with a one-page statutory summary and a QR
            link for instant online integrity checking.
          </p>
        </div>

        {/* Elevated Forged Graphite Pack Frame */}
        <div className="bg-[#181A1F] rounded-2xl border border-[#EAEAEA]/10 p-6 sm:p-8 text-[#EAEAEA]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#EAEAEA]/[0.08] gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
                <span className="font-medium text-base text-[#EAEAEA]">
                  Consignment pack · EXP-2026-0881
                </span>
              </div>
              <p className="text-xs text-[#9FA3AD] mt-1 font-mono tabular-nums">
                SHA-256: 9f82c4013e89a42d · Ed25519 inspector sealed
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[#10B981] text-xs font-medium shrink-0">
              <Check className="w-4 h-4" strokeWidth={1.5} />
              <span>Prepared for review</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6 border-b border-[#EAEAEA]/[0.08] text-xs">
            <div className="p-4 rounded-xl bg-[#121316] border border-[#EAEAEA]/[0.08] space-y-2">
              <span className="font-mono text-[#6F7480] text-xs block">
                Part 1 · Original certificate
              </span>
              <p className="font-medium text-sm text-[#EAEAEA]">SAIL Bokaro EN 10204 3.1</p>
              <p className="text-[#9FA3AD] leading-relaxed">
                Byte-identical preservation, unstamped and unmodified per EN 10204 Clause 6.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#121316] border border-[#EAEAEA]/[0.08] space-y-2">
              <span className="font-mono text-[#6F7480] text-xs block">
                Part 2 · Origin evidence
              </span>
              <p className="font-medium text-sm text-[#EAEAEA]">India melt and pour origin</p>
              <p className="text-[#9FA3AD] leading-relaxed">
                EU Reg 2026/1963 evidence table paired with the mass-balance tonnage ledger.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#121316] border border-[#EAEAEA]/[0.08] space-y-2">
              <span className="font-mono text-[#6F7480] text-xs block">
                Part 3 · Cryptographic seal
              </span>
              <p className="font-medium text-sm text-[#EAEAEA]">QA inspector TOTP signed</p>
              <p className="text-[#9FA3AD] leading-relaxed">
                Tamper-evident verification token with immediate revocation control.
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-[#EAEAEA] p-1.5 shrink-0 flex items-center justify-center">
                <QrCode className="w-9 h-9 text-[#121316]" strokeWidth={1.5} />
              </div>
              <div className="text-xs">
                <p className="font-medium text-[#EAEAEA]">Scan to verify pack integrity</p>
                <p className="text-[#9FA3AD] mt-0.5">Opens public tamper verifier without login</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate('/verify')}
                className="flex-1 sm:flex-initial h-10 px-4 rounded-lg bg-[#22252B] hover:bg-[#2A2E35] text-[#EAEAEA] text-xs font-medium border border-[#EAEAEA]/12 inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
                <span>Test verifier</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/check')}
                className="flex-1 sm:flex-initial h-10 px-4 rounded-lg bg-[#EAEAEA] hover:bg-white text-[#121316] text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-[0.98]"
              >
                <span>Check certificate free</span>
                <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
