import React, { useState, useEffect, useCallback } from 'react';
import { Database, Plus, Search } from 'lucide-react';
import { api, SupplierRequestItem, VersionedPrecursorItem } from '../../../services/api';
import { useToast } from '../../ui/ToastContext';
import {
  SupplierRequestsBoard,
  SupplierRequestsKpis,
} from './supplierRequests/SupplierRequestsBoard';
import { SupplierNewRequestModal } from './supplierRequests/SupplierNewRequestModal';
import {
  PrecursorLedgerModal,
  SupplierReviewModal,
} from './supplierRequests/SupplierReviewAndLedgerModals';

export const SupplierRequestsView: React.FC = () => {
  const { addToast } = useToast();
  const [requests, setRequests] = useState<SupplierRequestItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [isPrecursorLedgerOpen, setIsPrecursorLedgerOpen] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<SupplierRequestItem | null>(null);
  const [precursors, setPrecursors] = useState<VersionedPrecursorItem[]>([]);

  const [newSupplier, setNewSupplier] = useState('Tata Steel Limited');
  const [newSupplierId, setNewSupplierId] = useState('sup_tata_steel');
  const [newProduct, setNewProduct] = useState('Steel Billets Grade SAE 1018');
  const [newCnCode, setNewCnCode] = useState('7207 11 16');
  const [newPeriod, setNewPeriod] = useState('2026-Q1');
  const [newDeadline, setNewDeadline] = useState('2026-04-15');
  const [newPhone, setNewPhone] = useState('+91 657 664 4000');
  const [newEmail, setNewEmail] = useState('tc.dispatch@tatasteel.com');
  const [createdResult, setCreatedResult] = useState<any>(null);

  const [reviewAction, setReviewAction] = useState<'Accepted' | 'Returned'>('Accepted');
  const [reviewComment, setReviewComment] = useState('');
  const [linkedHeatsInput, setLinkedHeatsInput] = useState('TSJ-26-9021, TSJ-26-9022');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.listSupplierRequests();
      setRequests(res.requests || []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleCopyLink = (token: string) => {
    const fullUrl = `${window.location.origin}/supplier-request/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(token);
    addToast('Direct supplier form link copied to clipboard.', 'success');
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleSendReminder = async (req: SupplierRequestItem) => {
    try {
      await api.sendSupplierReminder(req.id, 'WHATSAPP');
      addToast(`WhatsApp reminder sent to ${req.supplier_name} contact.`, 'success');
      fetchRequests();
    } catch (e: any) {
      addToast(e.message || 'Failed to dispatch reminder', 'error');
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createSupplierRequest({
        supplier_id: newSupplierId,
        supplier_name: newSupplier,
        product_name: newProduct,
        cn_code: newCnCode,
        reporting_period: newPeriod,
        data_needed: [
          'production_route',
          'direct_fuel',
          'electricity_source',
          'precursor_inputs',
          'scrap_content',
        ],
        due_date: newDeadline,
        supplier_phone: newPhone,
        supplier_email: newEmail,
      });
      setCreatedResult(res);
      addToast('Supplier CBAM data request created.', 'success');
      fetchRequests();
    } catch (e: any) {
      addToast(e.message || 'Failed to create request', 'error');
    }
  };

  const handleOpenReview = (req: SupplierRequestItem) => {
    setSelectedRequest(req);
    setReviewAction('Accepted');
    setReviewComment(
      'Actual production evidence verified against melt log. Approved for CBAM declaration.'
    );
    setLinkedHeatsInput('TSJ-26-9021, TSJ-26-9022');
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedRequest) return;
    try {
      setReviewSubmitting(true);
      const heats = linkedHeatsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await api.reviewSupplierRequest(selectedRequest.id, {
        action: reviewAction,
        comment: reviewComment,
        linked_heats: heats,
      });
      addToast(
        reviewAction === 'Accepted'
          ? 'Supplier precursor data accepted and versioned into emissions ledger.'
          : 'Data returned to supplier with review notes.',
        'success'
      );
      setIsReviewModalOpen(false);
      fetchRequests();
    } catch (e: any) {
      addToast(e.message || 'Failed to submit review', 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleOpenPrecursorLedger = async () => {
    try {
      const res = await api.listVersionedPrecursors();
      setPrecursors(res.precursors || []);
    } catch {
      setPrecursors([]);
    }
    setIsPrecursorLedgerOpen(true);
  };

  const filteredRequests = requests.filter((r) => {
    const matchSearch =
      r.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.cn_code.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;
    if (activeTab === 'all') return true;
    return (
      r.status.toLowerCase().replace(/[^a-z]/g, '') ===
      activeTab.toLowerCase().replace(/[^a-z]/g, '')
    );
  });

  const pendingReviewCount = requests.filter((r) =>
    ['received', 'in_review'].includes(r.status.toLowerCase())
  ).length;
  const acceptedCount = requests.filter((r) => r.status.toLowerCase() === 'accepted').length;
  const overdueCount = requests.filter((r) => r.status.toLowerCase() === 'overdue').length;

  return (
    <div className="space-y-6 text-left text-[#18181A] font-sans">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-[#FCFBF8] p-5 sm:p-6 rounded-xl border border-[#18181A]/10">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#ECFDF5] text-[#047857] border border-emerald-200">
              EU CBAM Definitive Regime
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#F7F5F0] text-[#18181A] border border-[#18181A]/12">
              No-Login Supplier Portal
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-medium text-[#18181A] tracking-[-0.02em]">
            Supplier Data Requests for CBAM
          </h1>
          <p className="text-sm text-[#55544E] max-w-2xl">
            Request, collect, and verify actual precursor emissions data from upstream mills,
            traders, and re-rollers—reducing exposure to statutory EU default markups under
            Implementing Regulation (EU) 2025/2621.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleOpenPrecursorLedger}
            className="h-9 px-3.5 rounded-lg text-xs font-medium bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] border border-[#18181A]/12 inline-flex items-center gap-2 transition-colors duration-150 cursor-pointer"
          >
            <Database className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
            Precursor Ledger
          </button>
          <button
            type="button"
            onClick={() => {
              setCreatedResult(null);
              setIsNewModalOpen(true);
            }}
            className="h-9 px-3.5 rounded-lg text-xs font-medium bg-[#059669] hover:bg-[#047857] text-white inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            New Data Request
          </button>
        </div>
      </div>

      <SupplierRequestsKpis
        total={requests.length}
        pendingReviewCount={pendingReviewCount}
        acceptedCount={acceptedCount}
        overdueCount={overdueCount}
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Requests' },
            { id: 'requested', label: 'Requested' },
            { id: 'reminded', label: 'Reminded' },
            { id: 'received', label: 'Received' },
            { id: 'accepted', label: 'Accepted' },
            { id: 'overdue', label: 'Overdue' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-150 border cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#18181A] text-[#FCFBF8] border-[#18181A]'
                  : 'bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#55544E] hover:text-[#18181A] border-[#18181A]/12'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search
            className="w-4 h-4 text-[#78766E] absolute left-3 top-1/2 -translate-y-1/2"
            strokeWidth={1.5}
          />
          <input
            type="text"
            placeholder="Search mill, product, CN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 bg-[#FCFBF8] border border-[#18181A]/12 text-[#18181A] placeholder:text-[#78766E] text-xs rounded-lg pl-9 pr-3 focus:outline-none focus:border-[#059669] transition-colors duration-150"
          />
        </div>
      </div>

      <SupplierRequestsBoard
        loading={loading}
        filteredRequests={filteredRequests}
        copiedToken={copiedToken}
        onCopyLink={handleCopyLink}
        onSendReminder={handleSendReminder}
        onOpenReview={handleOpenReview}
      />

      {isNewModalOpen && (
        <SupplierNewRequestModal
          createdResult={createdResult}
          newSupplier={newSupplier}
          onNewSupplierChange={(sup, supId) => {
            setNewSupplier(sup);
            setNewSupplierId(supId);
          }}
          newProduct={newProduct}
          onNewProductChange={setNewProduct}
          newCnCode={newCnCode}
          onNewCnCodeChange={setNewCnCode}
          newPeriod={newPeriod}
          onNewPeriodChange={setNewPeriod}
          newDeadline={newDeadline}
          onNewDeadlineChange={setNewDeadline}
          newPhone={newPhone}
          onNewPhoneChange={setNewPhone}
          newEmail={newEmail}
          onNewEmailChange={setNewEmail}
          onCopyLink={handleCopyLink}
          onClose={() => setIsNewModalOpen(false)}
          onSubmit={handleCreateRequest}
        />
      )}

      {isReviewModalOpen && selectedRequest && (
        <SupplierReviewModal
          selectedRequest={selectedRequest}
          reviewAction={reviewAction}
          onReviewActionChange={setReviewAction}
          linkedHeatsInput={linkedHeatsInput}
          onLinkedHeatsInputChange={setLinkedHeatsInput}
          reviewComment={reviewComment}
          onReviewCommentChange={setReviewComment}
          reviewSubmitting={reviewSubmitting}
          onClose={() => setIsReviewModalOpen(false)}
          onSubmit={handleSubmitReview}
        />
      )}

      {isPrecursorLedgerOpen && (
        <PrecursorLedgerModal
          precursors={precursors}
          onClose={() => setIsPrecursorLedgerOpen(false)}
        />
      )}
    </div>
  );
};
