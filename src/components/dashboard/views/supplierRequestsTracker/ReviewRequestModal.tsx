import React, { useState } from 'react';
import { CheckCircle2, RefreshCw, X } from 'lucide-react';
import { SupplierRequestItem } from '../../../../services/api';

interface ReviewRequestModalProps {
  request: SupplierRequestItem;
  onClose: () => void;
  onSubmitReview: (data: {
    action: 'Accepted' | 'Returned';
    comment: string;
    linkedHeats: string[];
  }) => Promise<void>;
}

export const ReviewRequestModal: React.FC<ReviewRequestModalProps> = ({
  request,
  onClose,
  onSubmitReview,
}) => {
  const [reviewAction, setReviewAction] = useState<'Accepted' | 'Returned'>('Accepted');
  const [reviewComment, setReviewComment] = useState<string>('Precursor verified against third-party mill statement.');
  const [linkedHeatsText, setLinkedHeatsText] = useState<string>('TSJ-26-9021, TSJ-26-9022');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const heats = linkedHeatsText
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean);

      await onSubmitReview({
        action: reviewAction,
        comment:
          reviewComment ||
          (reviewAction === 'Accepted' ? 'Precursor verified by QA.' : 'Returned for revision.'),
        linkedHeats: reviewAction === 'Accepted' ? heats : [],
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0D0E11]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FCFBF8] border border-[#18181A]/15 rounded-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3.5">
          <h3 className="text-base font-medium text-[#18181A] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
            <span>Review Precursor Data Submission</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#55544E] hover:text-[#18181A] h-8 w-8 rounded-lg hover:bg-[#EFECE5] flex items-center justify-center transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#18181A]/10 text-xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#55544E]">Supplier</span>
            <span className="text-[#18181A] font-medium">{request.supplier_name}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#55544E]">Product &amp; CN</span>
            <span className="text-[#18181A] font-mono">
              {request.product_name} ({request.cn_code})
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#55544E]">Reported SEE</span>
            <span className="text-[#047857] font-mono tabular-nums font-medium">
              {request.precursor_emissions_tco2_per_t || 1.825} tCO₂e / t
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#55544E]">Data Origin</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
              Supplier-Reported (Unverified until Accepted)
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#55544E] mb-1.5">
              QA Verification Action *
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setReviewAction('Accepted')}
                className={`h-9 px-3 rounded-lg border text-xs font-medium transition-colors ${
                  reviewAction === 'Accepted'
                    ? 'bg-[#059669] border-[#059669] text-[#FCFBF8]'
                    : 'bg-[#FCFBF8] border-[#18181A]/15 text-[#55544E] hover:text-[#18181A]'
                }`}
              >
                ✓ Accept &amp; Link to Heats
              </button>
              <button
                type="button"
                onClick={() => setReviewAction('Returned')}
                className={`h-9 px-3 rounded-lg border text-xs font-medium transition-colors ${
                  reviewAction === 'Returned'
                    ? 'bg-rose-700 border-rose-700 text-[#FCFBF8]'
                    : 'bg-[#FCFBF8] border-[#18181A]/15 text-[#55544E] hover:text-[#18181A]'
                }`}
              >
                Return with Comments
              </button>
            </div>
          </div>

          {reviewAction === 'Accepted' && (
            <div>
              <label className="block text-xs font-medium text-[#55544E] mb-1.5">
                Link to Heat Numbers (Comma-separated)
              </label>
              <input
                type="text"
                value={linkedHeatsText}
                onChange={(e) => setLinkedHeatsText(e.target.value)}
                placeholder="e.g. TSJ-26-9021, TSJ-26-9022"
                className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs font-mono focus:outline-none focus:border-[#059669]"
              />
              <span className="text-xs text-[#78766E] mt-1 block">
                Precursor record will be versioned and linked to these active heats in the traceability ledger.
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#55544E] mb-1.5">
              Reviewer Audit Note *
            </label>
            <textarea
              rows={3}
              required
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder={
                reviewAction === 'Accepted'
                  ? 'Verified against mill ISO 14064 statement.'
                  : 'Please provide third-party electricity verification statement.'
              }
              className="w-full px-3 py-2 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs placeholder:text-[#78766E] focus:outline-none focus:border-[#059669]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#18181A]/10">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3.5 rounded-lg text-xs font-medium text-[#55544E] hover:text-[#18181A] border border-[#18181A]/15 bg-[#FCFBF8] hover:bg-[#EFECE5] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`h-9 px-4 rounded-lg font-medium text-xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
                reviewAction === 'Accepted'
                  ? 'bg-[#059669] hover:bg-[#047857] text-[#FCFBF8]'
                  : 'bg-rose-700 hover:bg-rose-800 text-[#FCFBF8]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{reviewAction === 'Accepted' ? 'Confirm Acceptance' : 'Return to Supplier'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
