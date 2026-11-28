import React from 'react';
import {
  Search,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  FileSpreadsheet,
  Layers,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { SupplierRequestItem } from '../../../../services/api';

interface RequestsPipelineBoardProps {
  requests: SupplierRequestItem[];
  counts: Record<string, number>;
  loading: boolean;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCopyLink: (link: string, id: string) => void;
  copiedToken: string | null;
  onRemind: (requestId: string) => void;
  onReview: (req: SupplierRequestItem) => void;
}

export const RequestsPipelineBoard: React.FC<RequestsPipelineBoardProps> = ({
  requests,
  counts,
  loading,
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onCopyLink,
  copiedToken,
  onRemind,
  onReview,
}) => {
  const filteredRequests = requests.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.supplier_name.toLowerCase().includes(q) ||
      r.product_name.toLowerCase().includes(q) ||
      r.cn_code.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#059669]/10 text-[#047857] border border-[#059669]/20">
            ACCEPTED · LINKED
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#EFECE5] text-[#18181A] border border-[#18181A]/15">
            IN REVIEW
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#EFECE5] text-[#18181A] border border-[#18181A]/15">
            RECEIVED
          </span>
        );
      case 'REMINDED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
            REMINDED
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            OVERDUE
          </span>
        );
      case 'RETURNED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            Returned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#F7F5F0] text-[#55544E] border border-[#18181A]/10">
            Requested
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Pipeline Status Summary Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { key: 'ALL', label: 'All Requests', count: counts.TOTAL || 0, color: 'text-[#18181A]' },
          { key: 'REQUESTED', label: 'Requested', count: counts.REQUESTED || 0, color: 'text-[#55544E]' },
          { key: 'REMINDED', label: 'Reminded', count: counts.REMINDED || 0, color: 'text-amber-700' },
          { key: 'RECEIVED', label: 'Received', count: counts.RECEIVED || 0, color: 'text-[#18181A]' },
          { key: 'IN_REVIEW', label: 'In Review', count: counts.IN_REVIEW || 0, color: 'text-[#18181A]' },
          { key: 'ACCEPTED', label: 'Accepted', count: counts.ACCEPTED || 0, color: 'text-[#047857]' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onFilterChange(tab.key)}
            className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
              activeFilter === tab.key
                ? 'bg-[#EFECE5] border-[#059669]'
                : 'bg-[#FCFBF8] border-[#18181A]/10 hover:border-[#18181A]/25'
            }`}
          >
            <div className="text-xs font-medium text-[#55544E]">{tab.label}</div>
            <div className={`text-xl font-medium font-mono tabular-nums mt-0.5 ${tab.color}`}>
              {tab.count}
            </div>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#78766E] absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by mill (Tata, SAIL, JSW), product, or CN code..."
            className="w-full h-9 pl-9 pr-3.5 rounded-lg bg-[#FCFBF8] border border-[#18181A]/15 text-[#18181A] text-xs placeholder:text-[#78766E] focus:outline-none focus:border-[#059669]"
          />
        </div>

        <div className="text-xs text-[#55544E] font-mono tabular-nums self-start sm:self-center">
          Showing {filteredRequests.length} active requests
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {loading && (
          <div className="py-12 text-center bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 text-[#55544E] text-xs">
            <RefreshCw className="w-5 h-5 mx-auto animate-spin text-[#059669] mb-2" strokeWidth={1.5} />
            Loading precursor request pipeline...
          </div>
        )}

        {!loading && filteredRequests.length === 0 && (
          <div className="py-12 text-center bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 space-y-2">
            <Layers className="w-6 h-6 mx-auto text-[#78766E]" strokeWidth={1.5} />
            <p className="text-xs text-[#55544E]">No supplier data requests found in this category.</p>
          </div>
        )}

        {!loading &&
          filteredRequests.map((req) => (
            <div
              key={req.id}
              className="p-4 sm:p-5 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 hover:border-[#18181A]/20 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              {/* Left Info */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-medium text-[#18181A] text-sm">{req.supplier_name}</span>
                  {getStatusBadge(req.status)}
                  <span className="text-xs text-[#55544E]">
                    Period:{' '}
                    <span className="font-mono tabular-nums font-medium text-[#18181A]">
                      {req.reporting_period}
                    </span>
                  </span>
                </div>

                <div className="text-xs text-[#55544E] flex items-center gap-2 flex-wrap">
                  <span className="text-[#18181A] font-medium">{req.product_name}</span>
                  <span className="text-[#78766E]">·</span>
                  <span className="font-mono tabular-nums">CN {req.cn_code}</span>
                  <span className="text-[#78766E]">·</span>
                  <span>
                    Due:{' '}
                    <span className="font-mono tabular-nums font-medium text-[#18181A]">
                      {req.due_date || req.deadline}
                    </span>
                  </span>
                </div>

                {/* Submitter & Evidence pill if received */}
                {req.precursor_emissions_tco2_per_t != null && (
                  <div className="pt-1 flex items-center gap-3 text-xs flex-wrap">
                    <span className="px-2 py-0.5 rounded-md font-mono tabular-nums bg-[#059669]/10 text-[#047857] border border-[#059669]/20">
                      SEE: <span className="font-medium">{req.precursor_emissions_tco2_per_t} tCO₂e/t</span>
                    </span>
                    <span className="text-[#55544E]">
                      Submitted by: {req.submitter_name || 'Mill Respondent'}
                    </span>
                    {req.evidence_file_name && (
                      <span className="text-[#18181A] font-mono inline-flex items-center gap-1">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
                        <span>{req.evidence_file_name}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    onCopyLink(
                      `${window.location.origin}/supplier-request/${req.token}`,
                      req.id
                    )
                  }
                  className="h-8 px-3 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium border border-[#18181A]/15 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  title="Copy supplier direct form link"
                >
                  {copiedToken === req.id ? (
                    <Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#55544E]" strokeWidth={1.5} />
                  )}
                  <span>{copiedToken === req.id ? 'Copied' : 'Copy Link'}</span>
                </button>

                <a
                  href={`/supplier-request/${req.token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="h-8 w-8 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#55544E] hover:text-[#18181A] transition-colors border border-[#18181A]/15 flex items-center justify-center"
                  title="Open Mobile Supplier Form"
                  aria-label="Open mobile supplier form"
                >
                  <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                </a>

                <button
                  type="button"
                  onClick={() => onRemind(req.id)}
                  className="h-8 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium border border-amber-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Remind</span>
                </button>

                {['RECEIVED', 'IN_REVIEW'].includes(req.status.toUpperCase()) && (
                  <button
                    type="button"
                    onClick={() => onReview(req)}
                    className="h-8 px-3 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Review</span>
                  </button>
                )}

                {req.status.toUpperCase() === 'ACCEPTED' && (
                  <span className="text-xs font-medium text-[#047857] inline-flex items-center gap-1 px-2">
                    <ShieldCheck className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                    <span>Verified</span>
                  </span>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
