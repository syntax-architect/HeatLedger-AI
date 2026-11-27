import React from 'react';
import {
  AlertTriangle,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Flag,
  Info,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { BulletinItem, RegulationItem } from '../../../../types';

interface RadarBulletinsStripProps {
  bulletins: BulletinItem[];
}

export const RadarBulletinsStrip: React.FC<RadarBulletinsStripProps> = ({ bulletins }) => {
  if (bulletins.length === 0) return null;

  return (
    <div className="bg-[#121316] text-[#EAEAEA] rounded-xl p-5 space-y-3 border border-[#2C303A]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-[#10B981] font-medium">
          <ShieldCheck className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
          <span>Verified &quot;What Changed&quot; Statutory Bulletins:</span>
        </div>
        <span className="text-xs font-mono text-[#9FA3AD]">
          Verified against EUR-Lex &amp; Gov.UK
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {bulletins.map((b) => (
          <div
            key={b.id}
            className="p-3.5 rounded-lg bg-[#181A1F] border border-[#2C303A] transition-colors duration-150 text-xs space-y-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-[#EAEAEA] leading-snug">{b.title}</span>
              <span className="px-2 py-0.5 rounded bg-[#22252B] text-[#EAEAEA] border border-[#2C303A] font-mono text-xs shrink-0">
                {b.jurisdiction}
              </span>
            </div>
            <p className="text-[#9FA3AD] text-xs leading-relaxed">{b.summary}</p>
            <div className="flex items-center justify-between pt-1.5 border-t border-[#2C303A] text-xs font-mono text-[#9FA3AD]">
              <span>By {b.published_by}</span>
              <a
                href={b.source_url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-[#10B981] hover:underline"
              >
                <span>Read Gazette Source</span>
                <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface RadarTimelineListProps {
  isLoading: boolean;
  displayedRegulations: RegulationItem[];
  onDownloadIcs: (reg: RegulationItem) => void;
  onOpenReportModal: (reg: RegulationItem) => void;
}

export const RadarTimelineList: React.FC<RadarTimelineListProps> = ({
  isLoading,
  displayedRegulations,
  onDownloadIcs,
  onOpenReportModal,
}) => {
  if (isLoading) {
    return (
      <div className="p-12 text-center bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#059669] mx-auto" strokeWidth={1.5} />
        <p className="text-xs font-mono text-[#55544E]">
          Querying verified regulatory timelines and countdowns...
        </p>
      </div>
    );
  }

  if (displayedRegulations.length === 0) {
    return (
      <div className="p-12 text-center bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 space-y-2">
        <Info className="w-6 h-6 text-[#78766E] mx-auto" strokeWidth={1.5} />
        <h3 className="font-medium text-[#18181A] text-sm">
          No regulatory milestones match criteria
        </h3>
        <p className="text-xs text-[#55544E]">
          Try adjusting the jurisdiction or plant relevance filter.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayedRegulations.map((reg) => (
        <div
          key={reg.id}
          className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 sm:p-6 hover:border-[#18181A]/25 transition-colors duration-150 space-y-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[#F7F5F0] text-[#18181A] font-mono text-xs font-medium border border-[#18181A]/12">
                  {reg.jurisdiction === 'EU' ? '🇪🇺 European Union' : '🇬🇧 United Kingdom'}
                </span>

                {reg.status === 'IN_FORCE' && (
                  <span className="px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#047857] font-mono text-xs font-medium border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
                    In Force
                  </span>
                )}

                {reg.status === 'PROPOSED' && (
                  <span className="px-2 py-0.5 rounded-md bg-[#FFFBEB] text-[#B45309] font-mono text-xs font-medium border border-[#FDE68A] flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" strokeWidth={1.5} />
                    Proposed (Not Law)
                  </span>
                )}

                <span className="text-xs font-mono tabular-nums text-[#78766E]">
                  Last Verified: {reg.last_verified}
                </span>
              </div>

              <h3 className="text-base font-medium text-[#18181A] tracking-[-0.01em]">
                {reg.title}
              </h3>
            </div>

            <div className="text-left sm:text-right font-mono shrink-0">
              {reg.is_past ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EFECE5] text-[#55544E] border border-[#18181A]/12 font-medium text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#55544E]" strokeWidth={1.5} />
                  Active / Operational
                </span>
              ) : reg.is_imminent ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] font-medium text-xs tabular-nums">
                  <Clock className="w-3.5 h-3.5 text-[#DC2626]" strokeWidth={1.5} />
                  {reg.days_remaining} Days Remaining (Imminent)
                </span>
              ) : reg.is_urgent ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] font-medium text-xs tabular-nums">
                  <Clock className="w-3.5 h-3.5 text-[#D97706]" strokeWidth={1.5} />
                  {reg.days_remaining} Days Remaining
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F7F5F0] text-[#18181A] border border-[#18181A]/12 font-medium text-xs tabular-nums">
                  <Calendar className="w-3.5 h-3.5 text-[#55544E]" strokeWidth={1.5} />
                  {reg.days_remaining} Days Remaining
                </span>
              )}
              <span className="block text-xs tabular-nums text-[#55544E] mt-1">
                Effective: <strong className="font-medium text-[#18181A]">{reg.effective_date}</strong>
                {reg.deadline_date && (
                  <span>
                    {' '}
                    · Deadline:{' '}
                    <strong className="font-medium text-[#18181A]">{reg.deadline_date}</strong>
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <p className="text-[#55544E] leading-relaxed font-normal">{reg.summary}</p>
            <div className="text-[#55544E] font-mono text-xs pt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                Legal Basis: <strong className="font-medium text-[#18181A]">{reg.legal_act}</strong>
              </span>
              <a
                href={reg.source_url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-[#047857] hover:underline font-medium"
              >
                <span>Official Gazette URL</span>
                <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
              </a>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0 flex-1">
              <span className="font-medium text-[#18181A] block text-xs">
                What To Do Next: Plant Action Guidance
              </span>
              <p className="text-[#55544E] text-xs">{reg.action_guidance}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onDownloadIcs(reg)}
                className="h-8 px-2.5 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] text-xs font-mono font-medium flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
                title="Download .ics calendar event"
              >
                <Download className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
                <span>.ics</span>
              </button>

              <a
                href={reg.google_calendar_url}
                target="_blank"
                rel="noreferrer noopener"
                className="h-8 px-2.5 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] text-xs font-mono font-medium flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
                title="Add directly to Google Calendar"
              >
                <CalendarCheck className="w-3.5 h-3.5 text-[#55544E]" strokeWidth={1.5} />
                <span>Google Cal</span>
              </a>

              <button
                type="button"
                onClick={() => onOpenReportModal(reg)}
                className="h-8 px-2.5 rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] text-xs font-mono flex items-center gap-1 transition-colors duration-150 cursor-pointer"
                title="Report discrepancy or statutory update"
              >
                <Flag className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Report</span>
              </button>
            </div>
          </div>

          <div className="text-xs font-mono text-[#78766E] border-t border-[#18181A]/10 pt-2.5 flex flex-wrap items-center justify-between gap-2">
            <span>{reg.disclaimer}</span>
            <span>
              CN Codes: {reg.applies_to_cn.slice(0, 5).join(', ')}
              {reg.applies_to_cn.length > 5 ? '...' : ''}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
