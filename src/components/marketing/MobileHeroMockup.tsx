import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const MobileHeroMockup: React.FC = () => {
  return (
    <div className="w-full rounded-xl bg-[#181A1F] border border-[#EAEAEA]/10 p-4 text-left">
      <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA]/[0.08] gap-2">
        <span className="font-mono tabular-nums text-xs font-medium text-[#EAEAEA] truncate">
          MTC-IN-TSJ-26-9021
        </span>
        <span className="text-xs font-mono text-[#10B981] bg-[#22252B] px-2 py-0.5 rounded border border-[#EAEAEA]/[0.08] whitespace-nowrap shrink-0">
          EN 10204 3.1
        </span>
      </div>

      <div className="my-3 p-3 rounded-lg bg-[#121316] border border-[#EAEAEA]/[0.08] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-[#9FA3AD]">Tata Steel Jamshedpur</span>
          <span className="font-mono text-[#10B981]">Melt: India (IN) ✓</span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded bg-[#181A1F] border border-[#EAEAEA]/[0.08]">
            <span className="text-xs text-[#6F7480] block">C</span>
            <span className="text-xs font-mono tabular-nums font-medium text-[#EAEAEA]">0.22%</span>
          </div>
          <div className="p-2 rounded bg-[#181A1F] border border-[#EAEAEA]/[0.08]">
            <span className="text-xs text-[#6F7480] block">Mn</span>
            <span className="text-xs font-mono tabular-nums font-medium text-[#EAEAEA]">0.88%</span>
          </div>
          <div className="p-2 rounded bg-[#181A1F] border border-[#EAEAEA]/[0.08]">
            <span className="text-xs text-[#6F7480] block">Si</span>
            <span className="text-xs font-mono tabular-nums font-medium text-[#EAEAEA]">0.25%</span>
          </div>
          <div className="p-2 rounded bg-[#181A1F] border border-[#EAEAEA]/[0.08]">
            <span className="text-xs text-[#6F7480] block">CEV</span>
            <span className="text-xs font-mono tabular-nums font-medium text-[#10B981]">0.408</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[#9FA3AD] pt-2 border-t border-[#EAEAEA]/[0.08]">
          <span className="font-mono tabular-nums">#TSJ-26-9021</span>
          <span className="font-mono tabular-nums text-[#10B981]">SHA-256 · 878a3b</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs pt-1 text-[#9FA3AD]">
        <span className="inline-flex items-center gap-1.5 text-[#10B981] font-medium">
          <ShieldCheck className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          <span>Melt &amp; Pour Verified</span>
        </span>
        <span>Clause 6 Annex A</span>
      </div>
    </div>
  );
};
