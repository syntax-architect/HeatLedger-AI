import React from 'react';
import { Cpu } from 'lucide-react';
import type { LearnedTemplate } from './types';

interface TemplatesTabProps {
  templates: LearnedTemplate[];
}

export const TemplatesTab: React.FC<TemplatesTabProps> = ({ templates }) => {
  return (
    <div className="space-y-4">
      <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 space-y-1.5">
        <div className="flex items-center gap-2 text-sm font-medium text-[#18181A]">
          <Cpu className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          <span>Deterministic Layout Fingerprints &amp; OCR Field Maps</span>
        </div>
        <p className="text-xs text-[#55544E] leading-relaxed">
          When an uploaded certificate matches a known mill layout fingerprint, parsing routes directly to calibrated bounding-box maps—reducing review time on repeat mills.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-8 text-center space-y-2">
          <Cpu className="w-6 h-6 text-[#78766E] mx-auto" strokeWidth={1.5} />
          <p className="text-sm font-medium text-[#18181A]">No learned templates yet</p>
          <p className="text-xs text-[#55544E]">
            Calibrated mill layout fingerprints will appear here once certificates are reviewed and sealed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.fingerprint}
              className="p-5 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-3.5 hover:border-[#18181A]/25 transition-colors duration-150"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-[#18181A]">{tpl.mill_name}</h3>
                  <div className="inline-block mt-1 px-2 py-0.5 rounded bg-[#F7F5F0] border border-[#18181A]/12 text-xs font-mono text-[#18181A]">
                    {tpl.fingerprint}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md text-xs font-mono tabular-nums font-medium bg-[#ECFDF5] text-[#047857] border border-emerald-200 shrink-0">
                  {tpl.confidence_score}% match
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 space-y-1.5">
                  <span className="text-xs font-medium text-[#55544E] block">
                    Header Match Tokens
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {tpl.header_labels.map((lbl, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-[#FCFBF8] text-[#18181A] text-xs font-mono border border-[#18181A]/10"
                      >
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 space-y-1">
                  <span className="text-xs font-medium text-[#55544E] block">
                    Melt-and-Pour Origin Marker
                  </span>
                  <div className="text-xs font-mono text-[#047857] font-medium truncate" title={tpl.melt_origin_marker}>
                    {tpl.melt_origin_marker}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-[#55544E]">Estimated Review Reduction</span>
                  <span className="text-xs font-mono tabular-nums font-medium text-[#047857]">
                    -{tpl.review_time_reduction_pct}% review time
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
