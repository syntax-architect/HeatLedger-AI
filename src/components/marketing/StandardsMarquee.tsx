import React from 'react';
import { ShieldCheck, FileCheck2, Landmark, Layers, Lock, Globe } from 'lucide-react';

interface MarqueeItem {
  code: string;
  label: string;
  icon: React.FC<{ className?: string }>;
}

const COVERAGE_ITEMS: MarqueeItem[] = [
  { code: 'MILL', label: 'Tata Steel Jamshedpur 3.1', icon: Layers },
  { code: 'STATUTE', label: 'EN 10204:2004 Clause 6', icon: FileCheck2 },
  { code: 'MILL', label: 'SAIL Bokaro & Rourkela', icon: Layers },
  { code: 'EU CBAM', label: 'Reg. (EU) 2023/956 Annex IV', icon: Globe },
  { code: 'MILL', label: 'JSW Steel Vijayanagar', icon: Layers },
  { code: 'ORIGIN', label: 'EU Reg. 2026/1963 Melt & Pour', icon: ShieldCheck },
  { code: 'MILL', label: 'Jindal Stainless & JSPL', icon: Layers },
  { code: 'MARKUP', label: 'EU Reg. 2025/2621 Default Defense', icon: Landmark },
  { code: 'MILL', label: 'AM/NS India Hazira', icon: Layers },
  { code: 'CRYPTO', label: 'Ed25519 + Tamper-Evident SHA-256', icon: Lock },
  { code: 'UK', label: 'UK Customs CDS & UK CBAM 2027', icon: Globe },
];

export const StandardsMarquee: React.FC = () => {
  const doubled = [...COVERAGE_ITEMS, ...COVERAGE_ITEMS];

  return (
    <section
      aria-label="Supported mill formats and statutory compliance frameworks"
      className="bg-[#0D0F14] border-b border-white/[0.08] py-4 overflow-hidden select-none"
    >
      <div className="relative max-w-[1600px] mx-auto hl-marquee-container">
        {/* Soft horizontal edge masks */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-[#0D0F14] to-transparent z-10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-[#0D0F14] to-transparent z-10"
        />

        <div className="hl-marquee-track items-center">
          {doubled.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={`${item.label}-${idx}`}
                className="flex items-center gap-2.5 px-5 py-1.5 mx-2 rounded-lg bg-[#111318] border border-white/[0.07] text-xs whitespace-nowrap shrink-0 hover:border-emerald-500/35 transition-colors"
              >
                <Icon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-mono text-xs text-[#A1A1AA]">{item.code}</span>
                <span className="text-white/20" aria-hidden="true">
                  /
                </span>
                <span className="font-medium text-[#F4F4F5]">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
