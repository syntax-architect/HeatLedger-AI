import React from 'react';
import { CheckCircle2, Database, FileText, Link2, X, XCircle } from 'lucide-react';
import { SupplierRequestItem, VersionedPrecursorItem } from '../../../../services/api';

interface SupplierReviewModalProps {
  selectedRequest: SupplierRequestItem;
  reviewAction: 'Accepted' | 'Returned';
  onReviewActionChange: (action: 'Accepted' | 'Returned') => void;
  linkedHeatsInput: string;
  onLinkedHeatsInputChange: (v: string) => void;
  reviewComment: string;
  onReviewCommentChange: (v: string) => void;
  reviewSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export const SupplierReviewModal: React.FC<SupplierReviewModalProps> = ({
  selectedRequest,
  reviewAction,
  onReviewActionChange,
  linkedHeatsInput,
  onLinkedHeatsInputChange,
  reviewComment,
  onReviewCommentChange,
  reviewSubmitting,
  onClose,
  onSubmit,
}) => (
  <div className="fixed inset-0 z-50 bg-[#0D0E11]/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-[#FCFBF8] border border-[#18181A]/15 rounded-xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-4">
        <div>
          <h2 className="text-base font-medium text-[#18181A] tracking-[-0.01em]">
            Review Supplier CBAM Declaration
          </h2>
          <p className="text-xs text-[#55544E] mt-0.5">
            {selectedRequest.supplier_name} · {selectedRequest.product_name}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[#55544E] hover:text-[#18181A] p-1.5 rounded-lg hover:bg-[#EFECE5] cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#18181A]/10 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-[#55544E]">
            Respondent:{' '}
            <strong className="font-medium text-[#18181A]">
              {selectedRequest.submitter_name || 'QA Head'}
            </strong>
          </span>
          <span className="text-[#55544E] font-mono tabular-nums">
            Submitted:{' '}
            {selectedRequest.submitted_at
              ? new Date(selectedRequest.submitted_at).toLocaleDateString()
              : 'Recent'}
          </span>
        </div>

        {selectedRequest.evidence_file_name && (
          <div className="flex items-center justify-between gap-2 bg-[#FCFBF8] p-2.5 rounded-lg border border-[#18181A]/10 text-xs">
            <div className="flex items-center gap-2 text-[#18181A] min-w-0">
              <FileText className="w-4 h-4 text-[#059669] shrink-0" strokeWidth={1.5} />
              <span className="font-mono truncate">{selectedRequest.evidence_file_name}</span>
            </div>
            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-[#ECFDF5] text-[#047857] border border-emerald-200 shrink-0">
              Tamper-evident SHA-256
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10">
          <span className="text-xs text-[#55544E]">Production Route</span>
          <p className="text-xs font-medium text-[#18181A] mt-1">BF-BOF Primary</p>
        </div>
        <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10">
          <span className="text-xs text-[#55544E]">Specific SEE</span>
          <p className="text-xs font-mono tabular-nums font-medium text-[#047857] mt-1">
            {selectedRequest.precursor_emissions_tco2_per_t
              ? `${selectedRequest.precursor_emissions_tco2_per_t.toFixed(2)} tCO₂e/t`
              : 'Pending'}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10">
          <span className="text-xs text-[#55544E]">Data Origin</span>
          <p className="text-xs font-medium text-[#B45309] mt-1">Supplier-Reported</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#18181A]">Decision Action</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onReviewActionChange('Accepted')}
              className={`h-9 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border transition-colors duration-150 cursor-pointer ${
                reviewAction === 'Accepted'
                  ? 'bg-[#059669] text-white border-[#059669]'
                  : 'bg-[#FCFBF8] text-[#55544E] border-[#18181A]/12 hover:text-[#18181A]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
              Accept &amp; Version Precursor
            </button>
            <button
              type="button"
              onClick={() => onReviewActionChange('Returned')}
              className={`h-9 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border transition-colors duration-150 cursor-pointer ${
                reviewAction === 'Returned'
                  ? 'bg-[#DC2626] text-white border-[#DC2626]'
                  : 'bg-[#FCFBF8] text-[#55544E] border-[#18181A]/12 hover:text-[#18181A]'
              }`}
            >
              <XCircle className="w-4 h-4" strokeWidth={1.5} />
              Return with Comments
            </button>
          </div>
        </div>

        {reviewAction === 'Accepted' && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#18181A]">
              Link to Heat Numbers{' '}
              <span className="text-[#55544E] font-normal">(Comma separated)</span>
            </label>
            <input
              type="text"
              value={linkedHeatsInput}
              onChange={(e) => onLinkedHeatsInputChange(e.target.value)}
              placeholder="e.g. TSJ-26-9021, TSJ-26-9022"
              className="w-full h-9 bg-[#F7F5F0] border border-[#18181A]/12 rounded-lg px-3 text-xs text-[#18181A] font-mono tabular-nums focus:outline-none focus:border-[#059669]"
            />
            <span className="text-xs text-[#55544E] block">
              Shipments consuming these heats will automatically reference this versioned precursor
              record.
            </span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#18181A]">
            Review Notes &amp; Verification Rationale
          </label>
          <textarea
            value={reviewComment}
            onChange={(e) => onReviewCommentChange(e.target.value)}
            rows={3}
            className="w-full bg-[#F7F5F0] border border-[#18181A]/12 rounded-lg p-3 text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
            placeholder="Explain why this data is accepted or returned..."
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#18181A]/10">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3.5 rounded-lg text-xs font-medium text-[#55544E] hover:text-[#18181A] border border-[#18181A]/12 bg-[#FCFBF8] hover:bg-[#EFECE5] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={reviewSubmitting}
            className="h-9 px-4 rounded-lg text-xs font-medium bg-[#059669] hover:bg-[#047857] text-white transition-colors duration-150 disabled:opacity-50 cursor-pointer"
          >
            {reviewSubmitting ? 'Recording Decision...' : 'Confirm Decision'}
          </button>
        </div>
      </div>
    </div>
  </div>
);

interface PrecursorLedgerModalProps {
  precursors: VersionedPrecursorItem[];
  onClose: () => void;
}

export const PrecursorLedgerModal: React.FC<PrecursorLedgerModalProps> = ({
  precursors,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 bg-[#0D0E11]/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-[#FCFBF8] border border-[#18181A]/15 rounded-xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-4">
        <div className="flex items-center gap-2.5">
          <Database className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          <div>
            <h2 className="text-base font-medium text-[#18181A] tracking-[-0.01em]">
              Versioned Precursor Records
            </h2>
            <p className="text-xs text-[#55544E] mt-0.5">
              Accepted supplier precursor emissions records linked to active heats.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[#55544E] hover:text-[#18181A] p-1.5 rounded-lg hover:bg-[#EFECE5] cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="space-y-3">
        {precursors.length === 0 ? (
          <div className="p-8 text-center text-[#55544E] text-xs">
            No precursor records generated yet.
          </div>
        ) : (
          precursors.map((p, idx) => (
            <div
              key={p.id || idx}
              className="p-4 rounded-xl bg-[#F7F5F0] border border-[#18181A]/10 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm font-medium text-[#18181A]">
                    {p.supplier_name}
                  </strong>
                  <span className="px-2 py-0.5 rounded-md text-xs font-mono tabular-nums bg-[#ECFDF5] text-[#047857] border border-emerald-200">
                    v{p.version}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-xs font-mono tabular-nums bg-[#FCFBF8] text-[#55544E] border border-[#18181A]/10">
                    {p.reporting_period}
                  </span>
                </div>
                <span className="text-xs font-medium font-mono tabular-nums text-[#047857]">
                  {p.precursor_see_tco2_per_t.toFixed(2)} tCO₂e/t
                </span>
              </div>

              <div className="text-xs text-[#55544E] flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  Product: <strong className="font-medium text-[#18181A]">{p.product_name}</strong>
                </span>
                <span className="font-mono tabular-nums">CN {p.cn_code}</span>
                <span>
                  Route: <span className="text-[#18181A]">{p.production_route}</span>
                </span>
              </div>

              <div className="pt-2 border-t border-[#18181A]/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-[#55544E]">
                  <Link2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                  <span>Linked Heats:</span>
                  <span className="font-mono tabular-nums text-[#18181A] font-medium">
                    {(p.linked_heats || []).join(', ')}
                  </span>
                </div>
                <span className="text-xs font-mono tabular-nums text-[#55544E]">
                  SHA-256: {p.evidence_sha256 ? `${p.evidence_sha256.slice(0, 12)}…` : 'N/A'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-end pt-3 border-t border-[#18181A]/10">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-4 rounded-lg text-xs font-medium bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);
