import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const MobileHeroMockup: React.FC = () => {
  return (
    <div className="w-full rounded-xl bg-[#111318] border border-white/[0.08] p-4 text-left">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] gap-2">
        <span className="font-mono tabular-nums text-xs font-semibold text-[#F4F4F5] truncate">
          MTC-IN-TSJ-26-9021
        </span>
        <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/25 whitespace-nowrap shrink-0">
          EN 10204 3.1
        </span>
      </div>

      <div className="my-3 p-3 rounded-lg bg-[#0A0C10] border border-white/[0.06] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-[#A1A1AA]">Tata Steel Jamshedpur</span>
          <span className="font-mono text-emerald-400 font-medium">Melt: India (IN) ✓</span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-md bg-[#111318] border border-white/[0.06]">
            <span className="text-xs text-[#A1A1AA] block">C</span>
            <span className="text-xs font-mono tabular-nums font-semibold text-[#F4F4F5]">0.22%</span>
          </div>
          <div className="p-2 rounded-md bg-[#111318] border border-white/[0.06]">
            <span className="text-xs text-[#A1A1AA] block">Mn</span>
            <span className="text-xs font-mono tabular-nums font-semibold text-[#F4F4F5]">0.88%</span>
          </div>
          <div className="p-2 rounded-md bg-[#111318] border border-white/[0.06]">
            <span className="text-xs text-[#A1A1AA] block">Si</span>
            <span className="text-xs font-mono tabular-nums font-semibold text-[#F4F4F5]">0.25%</span>
          </div>
          <div className="p-2 rounded-md bg-[#111318] border border-white/[0.06]">
            <span className="text-xs text-[#A1A1AA] block">CEV</span>
            <span className="text-xs font-mono tabular-nums font-semibold text-emerald-400">0.408</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[#A1A1AA] pt-2 border-t border-white/[0.06]">
          <span className="font-mono tabular-nums">#TSJ-26-9021</span>
          <span className="font-mono tabular-nums text-emerald-400">SHA-256 · 878a3b…</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs pt-1 text-[#A1A1AA]">
        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>Melt &amp; Pour Verified</span>
        </span>
        <span>Clause 6 Annex A</span>
      </div>
    </div>
  );
};
