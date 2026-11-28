import React, { useState, useEffect } from 'react';
import { Plus, Layers } from 'lucide-react';
import {
  ApiService,
  SupplierRequestItem,
  CreateSupplierRequestInput,
} from '../../../services/api';
import { useToast } from '../../ui/ToastContext';
import { CreateRequestModal } from './supplierRequestsTracker/CreateRequestModal';
import { ReviewRequestModal } from './supplierRequestsTracker/ReviewRequestModal';
import { ReminderNoticeModal, ReminderModalData } from './supplierRequestsTracker/ReminderNoticeModal';
import { RequestsPipelineBoard } from './supplierRequestsTracker/RequestsPipelineBoard';

interface SupplierDataRequestsTrackerProps {
  onRefreshParent?: () => void;
}

export const SupplierDataRequestsTracker: React.FC<SupplierDataRequestsTrackerProps> = ({
  onRefreshParent,
}) => {
  const toast = useToast();
  const [requests, setRequests] = useState<SupplierRequestItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({
    REQUESTED: 0,
    REMINDED: 0,
    RECEIVED: 0,
    IN_REVIEW: 0,
    ACCEPTED: 0,
    OVERDUE: 0,
    TOTAL: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [reviewModalRequest, setReviewModalRequest] = useState<SupplierRequestItem | null>(null);
  const [reminderModalData, setReminderModalData] = useState<ReminderModalData | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, [activeFilter]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await ApiService.listSupplierRequests(activeFilter);
      if (res) {
        setRequests(res.requests || []);
        if (res.counts) setCounts(res.counts);
      }
    } catch (err: any) {
      console.error('Failed to load supplier requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (payload: CreateSupplierRequestInput) => {
    const result = await ApiService.createSupplierRequest(payload);
    loadRequests();
    if (onRefreshParent) onRefreshParent();
    return result;
  };

  const handleSendReminder = async (requestId: string) => {
    try {
      const res = await ApiService.sendSupplierReminder(requestId, 'WHATSAPP');
      const req = requests.find((r) => r.id === requestId);
      setReminderModalData({
        requestId,
        supplierName: req?.supplier_name || 'Mill Partner',
        productName: req?.product_name || 'Precursor Material',
        deadline: req?.deadline || req?.due_date || 'Upcoming',
        token: req?.token || '',
        whatsappMsg: res?.whatsapp_message,
      });
      toast.success('Reminder Logged', 'WhatsApp reminder prepared for dispatch.');
      loadRequests();
    } catch (err: any) {
      toast.error('Reminder Failed', err?.message || 'Unable to send reminder.');
    }
  };

  const handleReviewSubmit = async ({
    action,
    comment,
    linkedHeats,
  }: {
    action: 'Accepted' | 'Returned';
    comment: string;
    linkedHeats: string[];
  }) => {
    if (!reviewModalRequest) return;
    try {
      await ApiService.reviewSupplierRequest(reviewModalRequest.id, {
        action,
        comment,
        linked_heats: action === 'Accepted' ? linkedHeats : undefined,
      });

      toast.success(
        action === 'Accepted' ? 'Precursor Accepted' : 'Returned to Supplier',
        action === 'Accepted'
          ? 'Precursor data accepted and linked to active heats.'
          : 'Submission returned to supplier with review notes.'
      );
      loadRequests();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      toast.error('Review Submission Failed', err?.message || 'Unable to record QA review.');
      throw err;
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    toast.success('Copied to Clipboard', 'Supplier link copied.');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-5 text-left text-[#18181A]">
      {/* Top Action & Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FCFBF8] p-5 rounded-xl border border-[#18181A]/10">
        <div>
          <h2 className="text-base font-medium text-[#18181A] flex items-center gap-2 tracking-[-0.015em]">
            <Layers className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
            <span>Supplier CBAM Precursor Tracker Board</span>
          </h2>
          <p className="text-xs text-[#55544E] mt-0.5">
            Collect, track, and verify actual precursor emissions declarations from primary mills via structured links.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="h-9 px-3.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] font-medium text-xs inline-flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          <span>New Supplier Request</span>
        </button>
      </div>

      {/* Main Pipeline Board */}
      <RequestsPipelineBoard
        requests={requests}
        counts={counts}
        loading={loading}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCopyLink={copyToClipboard}
        copiedToken={copiedToken}
        onRemind={handleSendReminder}
        onReview={(req) => setReviewModalRequest(req)}
      />

      {/* Create Modal */}
      <CreateRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmitCreate={handleCreateRequest}
      />

      {/* Review Modal */}
      {reviewModalRequest && (
        <ReviewRequestModal
          request={reviewModalRequest}
          onClose={() => setReviewModalRequest(null)}
          onSubmitReview={handleReviewSubmit}
        />
      )}

      {/* Reminder Notice Modal */}
      {reminderModalData && (
        <ReminderNoticeModal
          data={reminderModalData}
          onClose={() => setReminderModalData(null)}
        />
      )}
    </div>
  );
};

export default SupplierDataRequestsTracker;
