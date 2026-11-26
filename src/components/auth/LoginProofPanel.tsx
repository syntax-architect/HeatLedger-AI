import React from 'react';
import { motion } from 'framer-motion';
import { FileCheck2, Globe, Lock, ShieldCheck } from 'lucide-react';

export const LoginProofPanel: React.FC = () => (
  <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 bg-[#121316] text-[#EAEAEA] flex-col justify-between p-12 xl:p-16 border-l border-[#EAEAEA]/[0.08]">
    <div className="flex items-center justify-between">
      <div className="inline-flex items-center gap-2 text-xs font-mono text-[#9FA3AD]">
        <ShieldCheck className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
        <span>EN 10204:2004 · EU Reg 2026/1963</span>
      </div>
      <span className="font-mono tabular-nums text-xs text-[#10B981] px-2 py-0.5 rounded bg-[#181A1F] border border-[#EAEAEA]/[0.08]">
        #IN-WB-HOWRAH-01
      </span>
    </div>

    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-lg space-y-8 my-auto"
    >
      <div className="space-y-3">
        <h2 className="text-3xl font-medium tracking-[-0.025em] leading-[1.15] text-[#EAEAEA]">
          Cryptographic proof for every melt, heat, and customs dossier
        </h2>
        <p className="text-sm leading-relaxed text-[#9FA3AD]">
          Built for Indian metallurgical QA teams exporting under the EU Carbon Border Adjustment
          Mechanism definitive regime. Preserve upstream mill certificates byte-for-byte and seal
          every dispatch with verifiable Ed25519 signatures.
        </p>
      </div>

      <div className="rounded-xl bg-[#181A1F] border border-[#EAEAEA]/10 divide-y divide-[#EAEAEA]/[0.08]">
        <div className="p-4 flex items-start gap-4">
          <div className="w-8 h-8 rounded-lg bg-[#121316] border border-[#EAEAEA]/[0.08] flex items-center justify-center text-[#10B981] shrink-0 mt-0.5">
            <FileCheck2 className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-[#EAEAEA]">EN 10204 Clause 6 preservation</div>
            <p className="text-xs text-[#9FA3AD] leading-relaxed">
              Byte-identical original preservation of upstream mill Type 3.1 certificates bundled as
              Annex A alongside signed exporter covers.
            </p>
          </div>
        </div>

        <div className="p-4 flex items-start gap-4">
          <div className="w-8 h-8 rounded-lg bg-[#121316] border border-[#EAEAEA]/[0.08] flex items-center justify-center text-[#10B981] shrink-0 mt-0.5">
            <Lock className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-[#EAEAEA]">
              Ed25519 and tamper-evident SHA-256
            </div>
            <p className="text-xs text-[#9FA3AD] leading-relaxed">
              Every signed cover sheet and Annex A hash is sealed with 10-minute step-up QA
              Inspector PIN authorization.
            </p>
          </div>
        </div>

        <div className="p-4 flex items-start gap-4">
          <div className="w-8 h-8 rounded-lg bg-[#121316] border border-[#EAEAEA]/[0.08] flex items-center justify-center text-[#10B981] shrink-0 mt-0.5">
            <Globe className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-[#EAEAEA]">EU and UK CBAM customs readiness</div>
            <p className="text-xs text-[#9FA3AD] leading-relaxed">
              Automated CN-code scoping, Melt-and-Pour crude steel attribution, and structured XML
              communication templates for European importers.
            </p>
          </div>
        </div>
      </div>
    </motion.div>

    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#EAEAEA]/[0.08] text-xs">
      <div>
        <div className="text-[#6F7480]">Signature standard</div>
        <div className="font-mono text-[#EAEAEA] mt-1">Ed25519 / SHA-256</div>
      </div>
      <div>
        <div className="text-[#6F7480]">Traceability</div>
        <div className="font-mono text-[#EAEAEA] mt-1">Heat-to-Container</div>
      </div>
      <div>
        <div className="text-[#6F7480]">Customs export</div>
        <div className="font-mono text-[#EAEAEA] mt-1">EU CBAM XML + ZIP</div>
      </div>
    </div>
  </div>
);
