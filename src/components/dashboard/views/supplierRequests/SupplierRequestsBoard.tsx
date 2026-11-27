import React from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  MessageSquare,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { SupplierRequestItem } from '../../../../services/api';

export const SupplierRequestStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status.toUpperCase();
  if (s === 'ACCEPTED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-[#ECFDF5] text-[#047857] border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
        Accepted
      </span>
    );
  }
  if (s === 'RECEIVED' || s === 'IN_REVIEW') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-[#EFECE5] text-[#18181A] border border-[#18181A]/15">
        <Clock className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
        {s === 'RECEIVED' ? 'Received · Review Pending' : 'In Review'}
      </span>
    );
  }
  if (s === 'REMINDED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
        <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
        Reminded
      </span>
    );
  }
  if (s === 'OVERDUE') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
        <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} />
        Overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-[#F7F5F0] text-[#55544E] border border-[#18181A]/10">
      <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
      Requested
    </span>
  );
};

interface SupplierRequestsKpisProps {
  total: number;
  pendingReviewCount: number;
  acceptedCount: number;
  overdueCount: number;
}

export const SupplierRequestsKpis: React.FC<SupplierRequestsKpisProps> = ({
  total,
  pendingReviewCount,
  acceptedCount,
  overdueCount,
}) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
    <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10">
      <span className="text-xs font-medium text-[#55544E]">Active Requests</span>
      <div className="text-2xl sm:text-[28px] leading-tight font-medium font-mono tabular-nums text-[#18181A] mt-1">
        {total}
      </div>
      <span className="text-xs text-[#55544E] mt-0.5 block">Across upstream mills</span>
    </div>
    <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10">
      <span className="text-xs font-medium text-[#55544E]">Pending QA Review</span>
      <div className="text-2xl sm:text-[28px] leading-tight font-medium font-mono tabular-nums text-[#18181A] mt-1">
        {pendingReviewCount}
      </div>
      <span className="text-xs text-[#55544E] mt-0.5 block">Evidence attached</span>
    </div>
    <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10">
      <span className="text-xs font-medium text-[#047857]">Accepted Precursors</span>
      <div className="text-2xl sm:text-[28px] leading-tight font-medium font-mono tabular-nums text-[#047857] mt-1">
        {acceptedCount}
      </div>
      <span className="text-xs text-[#55544E] mt-0.5 block">Linked to heat ledger</span>
    </div>
    <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10">
      <span className="text-xs font-medium text-[#DC2626]">Overdue Requests</span>
      <div className="text-2xl sm:text-[28px] leading-tight font-medium font-mono tabular-nums text-[#DC2626] mt-1">
        {overdueCount}
      </div>
      <span className="text-xs text-[#55544E] mt-0.5 block">Past submission deadline</span>
    </div>
  </div>
);

interface SupplierRequestsBoardProps {
  loading: boolean;
  filteredRequests: SupplierRequestItem[];
  copiedToken: string | null;
  onCopyLink: (token: string) => void;
  onSendReminder: (req: SupplierRequestItem) => void;
  onOpenReview: (req: SupplierRequestItem) => void;
}

export const SupplierRequestsBoard: React.FC<SupplierRequestsBoardProps> = ({
  loading,
  filteredRequests,
  copiedToken,
  onCopyLink,
  onSendReminder,
  onOpenReview,
}) => (
  <div className="space-y-3">
    {loading ? (
      <div className="p-12 text-center bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 text-[#55544E] text-xs">
        Loading supplier data requests...
      </div>
    ) : filteredRequests.length === 0 ? (
      <div className="p-12 text-center bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 text-[#55544E]">
        <FileText className="w-6 h-6 text-[#78766E] mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-sm font-medium text-[#18181A]">
          No supplier requests found for this filter.
        </p>
        <p className="text-xs text-[#55544E] mt-1">
          Create a new request to invite upstream mills to submit precursor emissions data.
        </p>
      </div>
    ) : (
      filteredRequests.map((req) => (
        <div
          key={req.id}
          className="p-5 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 hover:border-[#18181A]/25 transition-colors duration-150 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-sm sm:text-base font-medium text-[#18181A] tracking-[-0.01em]">
                {req.supplier_name}
              </h3>
              <SupplierRequestStatusBadge status={req.status} />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#55544E]">
              <span>
                Product: <strong className="font-medium text-[#18181A]">{req.product_name}</strong>
              </span>
              <span className="font-mono tabular-nums text-[#55544E]">CN {req.cn_code}</span>
              <span className="font-mono tabular-nums text-[#55544E]">{req.reporting_period}</span>
              <span className="inline-flex items-center gap-1 text-[#55544E]">
                <Clock className="w-3.5 h-3.5 text-[#78766E]" strokeWidth={1.5} />
                Due <span className="font-mono tabular-nums text-[#18181A]">{req.due_date}</span>
              </span>
            </div>

            {req.precursor_emissions_tco2_per_t && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="px-2 py-0.5 rounded-md text-xs font-mono tabular-nums bg-[#ECFDF5] text-[#047857] border border-emerald-200">
                  Reported SEE:{' '}
                  <strong className="font-medium">
                    {req.precursor_emissions_tco2_per_t.toFixed(2)} tCO₂e/t
                  </strong>
                </span>
                <span className="text-xs text-[#55544E]">
                  Origin tag: Supplier-Reported (pending accredited verifier audit)
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t border-[#18181A]/10 lg:border-t-0 shrink-0">
            <button
              type="button"
              onClick={() => onCopyLink(req.token)}
              className="h-9 px-3 rounded-lg text-xs font-medium bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] border border-[#18181A]/12 inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
              title="Copy direct no-login mobile link for mill"
            >
              {copiedToken === req.token ? (
                <Check className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
              ) : (
                <Copy className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
              )}
              {copiedToken === req.token ? 'Copied' : 'Copy Link'}
            </button>

            <a
              href={`/supplier-request/${req.token}`}
              target="_blank"
              rel="noreferrer"
              className="h-9 px-3 rounded-lg text-xs font-medium bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] border border-[#18181A]/12 inline-flex items-center gap-1.5 transition-colors duration-150"
              title="Preview mobile supplier form"
            >
              <ExternalLink className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
              Preview Form
            </a>

            {['requested', 'reminded', 'overdue'].includes(req.status.toLowerCase()) && (
              <button
                type="button"
                onClick={() => onSendReminder(req)}
                className="h-9 px-3 rounded-lg text-xs font-medium bg-[#FFFBEB] hover:bg-amber-100/70 text-[#B45309] border border-[#FDE68A] inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                Send Reminder
              </button>
            )}

            {['received', 'in_review', 'accepted'].includes(req.status.toLowerCase()) && (
              <button
                type="button"
                onClick={() => onOpenReview(req)}
                className="h-9 px-3 rounded-lg text-xs font-medium bg-[#059669] hover:bg-[#047857] text-white inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
                {req.status.toLowerCase() === 'accepted' ? 'View Precursor' : 'Review & Accept'}
              </button>
            )}
          </div>
        </div>
      ))
    )}
  </div>
);
