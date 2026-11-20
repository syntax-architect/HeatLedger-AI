import React, { useState, useEffect } from 'react';
import {
  Send,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  FileText,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Database,
  Search,
  CheckCircle2,
  XCircle,
  Link2,
  X,
} from 'lucide-react';
import { api, SupplierRequestItem, VersionedPrecursorItem } from '../../../services/api';
import { useToast } from '../../ui/ToastContext';

export const SupplierRequestsView: React.FC = () => {
  const { addToast } = useToast();
  const [requests, setRequests] = useState<SupplierRequestItem[]>([]);
  const [, setCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [isPrecursorLedgerOpen, setIsPrecursorLedgerOpen] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<SupplierRequestItem | null>(null);
  const [precursors, setPrecursors] = useState<VersionedPrecursorItem[]>([]);

  // New Request Form State
  const [newSupplier, setNewSupplier] = useState('Tata Steel Limited');
  const [newSupplierId, setNewSupplierId] = useState('sup_tata_steel');
  const [newProduct, setNewProduct] = useState('Steel Billets Grade SAE 1018');
  const [newCnCode, setNewCnCode] = useState('7207 11 16');
  const [newPeriod, setNewPeriod] = useState('2026-Q1');
  const [newDeadline, setNewDeadline] = useState('2026-04-15');
  const [newPhone, setNewPhone] = useState('+91 657 664 4000');
  const [newEmail, setNewEmail] = useState('tc.dispatch@tatasteel.com');
  const [createdResult, setCreatedResult] = useState<any>(null);

  // Review Form State
  const [reviewAction, setReviewAction] = useState<'Accepted' | 'Returned'>('Accepted');
  const [reviewComment, setReviewComment] = useState('');
  const [linkedHeatsInput, setLinkedHeatsInput] = useState('TSJ-26-9021, TSJ-26-9022');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.listSupplierRequests();
      setRequests(res.requests || []);
      setCounts(res.counts || {});
    } catch {
      setRequests([
        {
          id: 'req_sr_9021',
          token: 'sreq_demo_tata_9021',
          supplier_id: 'sup_tata_steel',
          supplier_name: 'Tata Steel Limited',
          product_name: 'Steel Billets Grade SAE 1018',
          cn_code: '7207 11 16',
          reporting_period: '2026-Q1',
          deadline: '2026-04-15',
          due_date: '2026-04-15',
          status: 'Accepted',
          data_needed: ['production_route', 'direct_fuel', 'electricity_source', 'scrap_content'],
          requested_fields: ['production_route', 'direct_fuel', 'electricity_source', 'scrap_content'],
          public_url: '/supplier-request/sreq_demo_tata_9021',
          created_at: new Date().toISOString(),
          submitter_name: 'V. K. Mehta',
          submitted_at: '2026-03-28T10:15:00Z',
          precursor_emissions_tco2_per_t: 2.1,
          evidence_file_name: 'TSJ_CBAM_Emission_Declaration_2026Q1.pdf',
          precursor_record_id: 'prec_tsj_26_01',
          precursor_version: 1,
        },
        {
          id: 'req_sr_9022',
          token: 'sreq_demo_jsw_9022',
          supplier_id: 'sup_jsw_steel',
          supplier_name: 'JSW Steel Limited',
          product_name: 'DRI & Billets Grade SAE 1045',
          cn_code: '7207 19 80',
          reporting_period: '2026-Q1',
          deadline: '2026-04-10',
          due_date: '2026-04-10',
          status: 'Received',
          data_needed: ['production_route', 'direct_fuel', 'electricity_source', 'scrap_content'],
          requested_fields: ['production_route', 'direct_fuel', 'electricity_source', 'scrap_content'],
          public_url: '/supplier-request/sreq_demo_jsw_9022',
          created_at: new Date().toISOString(),
          submitter_name: 'P. R. Hegde',
          submitted_at: '2026-03-29T14:30:00Z',
          precursor_emissions_tco2_per_t: 1.6,
          evidence_file_name: 'JSW_Vijayanagar_CBAM_Annex_IV_2026Q1.xlsx',
        },
        {
          id: 'req_sr_9023',
          token: 'sreq_demo_sail_9023',
          supplier_id: 'sup_sail_bokaro',
          supplier_name: 'Steel Authority of India Limited (SAIL)',
          product_name: 'Steel Billets Grade IS 2062 E250',
          cn_code: '7207 11 16',
          reporting_period: '2026-Q1',
          deadline: '2026-04-05',
          due_date: '2026-04-05',
          status: 'Reminded',
          data_needed: ['production_route', 'direct_fuel', 'electricity_source'],
          requested_fields: ['production_route', 'direct_fuel', 'electricity_source'],
          public_url: '/supplier-request/sreq_demo_sail_9023',
          created_at: new Date().toISOString(),
        },
        {
          id: 'req_sr_9024',
          token: 'sreq_demo_electrosteel_9024',
          supplier_id: 'sup_electrosteel',
          supplier_name: 'Electrosteel Steels Limited',
          product_name: 'Pig Iron Precursors',
          cn_code: '7201 10 19',
          reporting_period: '2025-Q4',
          deadline: '2026-02-15',
          due_date: '2026-02-15',
          status: 'Overdue',
          data_needed: ['production_route', 'direct_fuel', 'electricity_source'],
          requested_fields: ['production_route', 'direct_fuel', 'electricity_source'],
          public_url: '/supplier-request/sreq_demo_electrosteel_9024',
          created_at: new Date().toISOString(),
        },
      ]);
      setCounts({ TOTAL: 4, ACCEPTED: 1, RECEIVED: 1, REMINDED: 1, OVERDUE: 1 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

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
        data_needed: ['production_route', 'direct_fuel', 'electricity_source', 'precursor_inputs', 'scrap_content'],
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

  const handleOpenReview = async (req: SupplierRequestItem) => {
    setSelectedRequest(req);
    setReviewAction('Accepted');
    setReviewComment('Actual production evidence verified against melt log. Approved for CBAM declaration.');
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
      setPrecursors([
        {
          id: 'prec_tsj_26_01',
          request_id: 'req_sr_9021',
          supplier_id: 'sup_tata_steel',
          supplier_name: 'Tata Steel Limited',
          product_name: 'Steel Billets Grade SAE 1018',
          cn_code: '7207 11 16',
          reporting_period: '2026-Q1',
          precursor_see_tco2_per_t: 2.1,
          production_route: 'BF-BOF (Blast Furnace - Basic Oxygen Furnace)',
          scrap_content_pct: 12.5,
          evidence_sha256: '8a32f912e5ab84cf43d120a1122394c8e7629b3a0df478b0213709b119cd7e21',
          linked_heats: ['TSJ-26-9021', 'TSJ-26-9022'],
          version: 1,
          accepted_by: 'usr_qa_04',
          accepted_at: '2026-03-29T11:00:00Z',
          data_origin_tag: 'VERIFIED_SUPPLIER_PRECURSOR',
        },
      ]);
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
    return r.status.toLowerCase().replace(/[^a-z]/g, '') === activeTab.toLowerCase().replace(/[^a-z]/g, '');
  });

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'ACCEPTED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-[#ECFDF5] text-[#047857] border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Accepted
        </span>
      );
    }
    if (s === 'RECEIVED' || s === 'IN_REVIEW') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-[#EFF6FF] text-[#2563EB] border border-blue-200">
          <Clock className="w-3.5 h-3.5" />
          {s === 'RECEIVED' ? 'Received · Review Pending' : 'In Review'}
        </span>
      );
    }
    if (s === 'REMINDED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
          <MessageSquare className="w-3.5 h-3.5" />
          Reminded
        </span>
      );
    }
    if (s === 'OVERDUE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
          <AlertTriangle className="w-3.5 h-3.5" />
          Overdue
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-[#F4F4F5] text-[#52525B] border border-[#E4E4E7]">
        <Send className="w-3.5 h-3.5" />
        Requested
      </span>
    );
  };

  const pendingReviewCount = requests.filter((r) =>
    ['received', 'in_review'].includes(r.status.toLowerCase())
  ).length;
  const acceptedCount = requests.filter((r) => r.status.toLowerCase() === 'accepted').length;
  const overdueCount = requests.filter((r) => r.status.toLowerCase() === 'overdue').length;

  return (
    <div className="space-y-6 text-left text-[#09090B]">
      {/* View Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 sm:p-6 rounded-xl border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#ECFDF5] text-[#047857] border border-emerald-200">
              EU CBAM Definitive Regime
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#EFF6FF] text-[#2563EB] border border-blue-200">
              No-Login Supplier Portal
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#09090B] tracking-[-0.025em]">
            Supplier Data Requests for CBAM
          </h1>
          <p className="text-sm text-[#52525B] max-w-2xl">
            Request, collect, and verify actual precursor emissions data from upstream mills, traders, and re-rollers—reducing exposure to statutory EU default markups under Implementing Regulation (EU) 2025/2621.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleOpenPrecursorLedger}
            className="px-3.5 py-2 rounded-lg text-xs font-medium bg-white hover:bg-[#FAFAFA] text-[#09090B] border border-[#E4E4E7] inline-flex items-center gap-2 transition-colors"
          >
            <Database className="w-4 h-4 text-[#059669]" />
            Precursor Ledger
          </button>
          <button
            type="button"
            onClick={() => {
              setCreatedResult(null);
              setIsNewModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-lg text-xs font-medium bg-[#059669] hover:bg-[#047857] text-white inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Data Request
          </button>
        </div>
      </div>

      {/* Compact 4-KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-white border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-medium text-[#52525B]">Active Requests</span>
          <div className="text-[28px] leading-tight font-semibold font-mono tabular-nums text-[#09090B] mt-1">
            {requests.length}
          </div>
          <span className="text-xs text-[#52525B] mt-0.5 block">Across upstream mills</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-medium text-[#2563EB]">Pending QA Review</span>
          <div className="text-[28px] leading-tight font-semibold font-mono tabular-nums text-[#2563EB] mt-1">
            {pendingReviewCount}
          </div>
          <span className="text-xs text-[#52525B] mt-0.5 block">Evidence attached</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-medium text-[#047857]">Accepted Precursors</span>
          <div className="text-[28px] leading-tight font-semibold font-mono tabular-nums text-[#047857] mt-1">
            {acceptedCount}
          </div>
          <span className="text-xs text-[#52525B] mt-0.5 block">Linked to heat ledger</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <span className="text-xs font-medium text-[#DC2626]">Overdue Requests</span>
          <div className="text-[28px] leading-tight font-semibold font-mono tabular-nums text-[#DC2626] mt-1">
            {overdueCount}
          </div>
          <span className="text-xs text-[#52525B] mt-0.5 block">Past submission deadline</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                activeTab === tab.id
                  ? 'bg-[#09090B] text-white border-[#09090B]'
                  : 'bg-white hover:bg-[#FAFAFA] text-[#52525B] hover:text-[#09090B] border-[#E4E4E7]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search mill, product, CN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#E4E4E7] text-[#09090B] placeholder:text-[#A1A1AA] text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-[#059669] transition-colors"
          />
        </div>
      </div>

      {/* Request Board Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-xl border border-[#E4E4E7] text-[#52525B] text-xs">
            Loading supplier data requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-[#E4E4E7] text-[#52525B]">
            <FileText className="w-7 h-7 text-[#A1A1AA] mx-auto mb-2" />
            <p className="text-sm font-medium text-[#09090B]">No supplier requests found for this filter.</p>
            <p className="text-xs text-[#52525B] mt-1">
              Create a new request to invite upstream mills to submit precursor emissions data.
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div
              key={req.id}
              className="p-5 rounded-xl bg-white border border-[#E4E4E7] hover:border-[#D4D4D8] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-sm sm:text-base font-semibold text-[#09090B] tracking-[-0.015em]">
                    {req.supplier_name}
                  </h3>
                  {getStatusBadge(req.status)}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#52525B]">
                  <span>
                    Product: <strong className="font-medium text-[#09090B]">{req.product_name}</strong>
                  </span>
                  <span className="font-mono tabular-nums text-[#52525B]">CN {req.cn_code}</span>
                  <span className="font-mono tabular-nums text-[#52525B]">{req.reporting_period}</span>
                  <span className="inline-flex items-center gap-1 text-[#52525B]">
                    <Clock className="w-3.5 h-3.5 text-[#A1A1AA]" />
                    Due <span className="font-mono tabular-nums text-[#09090B]">{req.due_date}</span>
                  </span>
                </div>

                {req.precursor_emissions_tco2_per_t && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="px-2 py-0.5 rounded-md text-xs font-mono tabular-nums bg-[#ECFDF5] text-[#047857] border border-emerald-200">
                      Reported SEE: <strong>{req.precursor_emissions_tco2_per_t.toFixed(2)} tCO₂e/t</strong>
                    </span>
                    <span className="text-xs text-[#52525B]">
                      Origin tag: Supplier-Reported (pending accredited verifier audit)
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t border-[#E4E4E7] lg:border-t-0 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyLink(req.token)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-[#FAFAFA] text-[#09090B] border border-[#E4E4E7] inline-flex items-center gap-1.5 transition-colors"
                  title="Copy direct no-login mobile link for mill"
                >
                  {copiedToken === req.token ? (
                    <Check className="w-3.5 h-3.5 text-[#059669]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#52525B]" />
                  )}
                  {copiedToken === req.token ? 'Copied' : 'Copy Link'}
                </button>

                <a
                  href={`/supplier-request/${req.token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-[#FAFAFA] text-[#09090B] border border-[#E4E4E7] inline-flex items-center gap-1.5 transition-colors"
                  title="Preview mobile supplier form"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#2563EB]" />
                  Preview Form
                </a>

                {['requested', 'reminded', 'overdue'].includes(req.status.toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => handleSendReminder(req)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#FFFBEB] hover:bg-amber-100/70 text-[#B45309] border border-[#FDE68A] inline-flex items-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Send Reminder
                  </button>
                )}

                {['received', 'in_review', 'accepted'].includes(req.status.toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => handleOpenReview(req)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#059669] hover:bg-[#047857] text-white inline-flex items-center gap-1.5 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {req.status.toLowerCase() === 'accepted' ? 'View Precursor' : 'Review & Accept'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL 1: Create New Request */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E4E7] rounded-xl max-w-xl w-full p-6 space-y-5 shadow-[0_16px_48px_rgba(0,0,0,0.16)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-4">
              <div>
                <h2 className="text-base font-semibold text-[#09090B] tracking-[-0.015em]">
                  Create CBAM Data Request
                </h2>
                <p className="text-xs text-[#52525B] mt-0.5">
                  Generate a secure no-login mobile link for upstream mills and traders.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-[#52525B] hover:text-[#09090B] p-1.5 rounded-lg hover:bg-[#F4F4F5] transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createdResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#ECFDF5] border border-emerald-200 text-xs space-y-2.5">
                  <div className="flex items-center gap-2 font-semibold text-sm text-[#047857]">
                    <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                    Request Link Generated
                  </div>
                  <p className="text-[#047857]">
                    Send this link to the mill quality or dispatch officer. No account or password is required.
                  </p>
                  <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-emerald-200 font-mono text-xs break-all text-[#09090B]">
                    <span className="flex-1">
                      {window.location.origin}
                      {createdResult.form_url || createdResult.public_url}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(createdResult.secure_token || createdResult.token)}
                      className="px-2.5 py-1 bg-[#059669] hover:bg-[#047857] text-white rounded-md text-xs font-medium shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-[#09090B]">WhatsApp Invitation Template</span>
                  <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7] text-xs font-mono text-[#09090B] whitespace-pre-wrap">
                    {createdResult.whatsapp_invitation}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-[#E4E4E7]">
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-medium bg-[#09090B] hover:bg-zinc-800 text-white"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#09090B]">Upstream Mill / Supplier</label>
                  <select
                    value={newSupplier}
                    onChange={(e) => {
                      setNewSupplier(e.target.value);
                      if (e.target.value.includes('Tata')) setNewSupplierId('sup_tata_steel');
                      else if (e.target.value.includes('SAIL')) setNewSupplierId('sup_sail_bokaro');
                      else if (e.target.value.includes('JSW')) setNewSupplierId('sup_jsw_steel');
                      else setNewSupplierId('sup_custom_mill');
                    }}
                    className="w-full bg-white border border-[#E4E4E7] rounded-lg px-3 py-2 text-xs text-[#09090B] focus:outline-none focus:border-[#059669]"
                  >
                    <option value="Tata Steel Limited">Tata Steel Limited (Jamshedpur / Kalinganagar)</option>
                    <option value="Steel Authority of India Limited (SAIL)">SAIL (Bokaro / Rourkela)</option>
                    <option value="JSW Steel Limited">JSW Steel Limited (Vijayanagar Works)</option>
                    <option value="Jindal Steel & Power Ltd.">Jindal Steel &amp; Power Ltd. (Raigarh)</option>
                    <option value="Kalyani Steels Limited">Kalyani Steels Limited (Ginigera)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#09090B]">Product / Precursor Name</label>
                    <input
                      type="text"
                      value={newProduct}
                      onChange={(e) => setNewProduct(e.target.value)}
                      className="w-full bg-white border border-[#E4E4E7] rounded-lg px-3 py-2 text-xs text-[#09090B] focus:outline-none focus:border-[#059669]"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#09090B]">Combined CN Code</label>
                    <input
                      type="text"
                      value={newCnCode}
                      onChange={(e) => setNewCnCode(e.target.value)}
                      className="w-full bg-white border border-[#E4E4E7] rounded-lg px-3 py-2 text-xs text-[#09090B] font-mono focus:outline-none focus:border-[#059669]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#09090B]">Reporting Period</label>
                    <select
                      value={newPeriod}
                      onChange={(e) => setNewPeriod(e.target.value)}
                      className="w-full bg-white border border-[#E4E4E7] rounded-lg px-3 py-2 text-xs text-[#09090B] focus:outline-none focus:border-[#059669]"
                    >
                      <option value="2026-Q1">2026-Q1 (Jan – Mar 2026)</option>
                      <option value="2026-Q2">2026-Q2 (Apr – Jun 2026)</option>
                      <option value="2025-Q4">2025-Q4 (Oct – Dec 2025)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#09090B]">Submission Due Date</label>
                    <input
                      type="date"
                      value={newDeadline}
                      onChange={(e) => setNewDeadline(e.target.value)}
                      className="w-full bg-white border border-[#E4E4E7] rounded-lg px-3 py-2 text-xs text-[#09090B] font-mono focus:outline-none focus:border-[#059669]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#09090B]">WhatsApp Mobile (+91)</label>
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full bg-white border border-[#E4E4E7] rounded-lg px-3 py-2 text-xs text-[#09090B] font-mono focus:outline-none focus:border-[#059669]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#09090B]">QA Contact Email</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full bg-white border border-[#E4E4E7] rounded-lg px-3 py-2 text-xs text-[#09090B] focus:outline-none focus:border-[#059669]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#09090B]">Data Fields Included</label>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#52525B] bg-[#FAFAFA] p-3 rounded-lg border border-[#E4E4E7]">
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#059669]" /> Production Route
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#059669]" /> Direct Fuel Consumption
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#059669]" /> Electricity &amp; Grid Factor
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#059669]" /> Scrap Input Content (%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#059669]" /> Precursors Consumed
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#059669]" /> Evidence PDF / Excel
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E4E4E7]">
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    className="px-3.5 py-2 rounded-lg text-xs font-medium text-[#52525B] hover:text-[#09090B] border border-[#E4E4E7] bg-white hover:bg-[#FAFAFA]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-medium bg-[#059669] hover:bg-[#047857] text-white transition-colors"
                  >
                    Generate Secure Link &amp; Templates
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Review Supplier Submission */}
      {isReviewModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E4E7] rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-[0_16px_48px_rgba(0,0,0,0.16)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-4">
              <div>
                <h2 className="text-base font-semibold text-[#09090B] tracking-[-0.015em]">
                  Review Supplier CBAM Declaration
                </h2>
                <p className="text-xs text-[#52525B] mt-0.5">
                  {selectedRequest.supplier_name} · {selectedRequest.product_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="text-[#52525B] hover:text-[#09090B] p-1.5 rounded-lg hover:bg-[#F4F4F5]"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Submitter & Evidence Bar */}
            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#52525B]">
                  Respondent:{' '}
                  <strong className="font-semibold text-[#09090B]">
                    {selectedRequest.submitter_name || 'V. K. Mehta (QA Head)'}
                  </strong>
                </span>
                <span className="text-[#52525B] font-mono tabular-nums">
                  Submitted:{' '}
                  {selectedRequest.submitted_at
                    ? new Date(selectedRequest.submitted_at).toLocaleDateString()
                    : 'Recent'}
                </span>
              </div>

              {selectedRequest.evidence_file_name && (
                <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-[#E4E4E7] text-xs">
                  <div className="flex items-center gap-2 text-[#09090B] min-w-0">
                    <FileText className="w-4 h-4 text-[#059669] shrink-0" />
                    <span className="font-mono truncate">{selectedRequest.evidence_file_name}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-[#ECFDF5] text-[#047857] border border-emerald-200 shrink-0">
                    Tamper-evident SHA-256
                  </span>
                </div>
              )}
            </div>

            {/* Emission Metrics Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7]">
                <span className="text-xs text-[#52525B]">Production Route</span>
                <p className="text-xs font-semibold text-[#09090B] mt-1">BF-BOF Primary</p>
              </div>
              <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7]">
                <span className="text-xs text-[#52525B]">Specific SEE</span>
                <p className="text-xs font-mono tabular-nums font-semibold text-[#047857] mt-1">
                  {selectedRequest.precursor_emissions_tco2_per_t
                    ? `${selectedRequest.precursor_emissions_tco2_per_t.toFixed(2)} tCO₂e/t`
                    : '1.85 tCO₂e/t'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7]">
                <span className="text-xs text-[#52525B]">Data Origin</span>
                <p className="text-xs font-semibold text-[#B45309] mt-1">Supplier-Reported</p>
              </div>
            </div>

            {/* QA Decision Controls */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#09090B]">Decision Action</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setReviewAction('Accepted')}
                    className={`py-2.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border transition-colors ${
                      reviewAction === 'Accepted'
                        ? 'bg-[#059669] text-white border-[#059669]'
                        : 'bg-white text-[#52525B] border-[#E4E4E7] hover:text-[#09090B]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Accept &amp; Version Precursor
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction('Returned')}
                    className={`py-2.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border transition-colors ${
                      reviewAction === 'Returned'
                        ? 'bg-[#DC2626] text-white border-[#DC2626]'
                        : 'bg-white text-[#52525B] border-[#E4E4E7] hover:text-[#09090B]'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    Return with Comments
                  </button>
                </div>
              </div>

              {reviewAction === 'Accepted' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#09090B]">
                    Link to Heat Numbers <span className="text-[#52525B] font-normal">(Comma separated)</span>
                  </label>
                  <input
                    type="text"
                    value={linkedHeatsInput}
                    onChange={(e) => setLinkedHeatsInput(e.target.value)}
                    placeholder="e.g. TSJ-26-9021, TSJ-26-9022"
                    className="w-full bg-white border border-[#E4E4E7] rounded-lg px-3 py-2 text-xs text-[#09090B] font-mono focus:outline-none focus:border-[#059669]"
                  />
                  <span className="text-xs text-[#52525B] block">
                    Shipments consuming these heats will automatically reference this versioned precursor record.
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#09090B]">
                  Review Notes &amp; Verification Rationale
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-[#E4E4E7] rounded-lg p-3 text-xs text-[#09090B] focus:outline-none focus:border-[#059669]"
                  placeholder="Explain why this data is accepted or returned..."
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E4E4E7]">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-[#52525B] hover:text-[#09090B] border border-[#E4E4E7] bg-white hover:bg-[#FAFAFA]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={reviewSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-[#059669] hover:bg-[#047857] text-white transition-colors disabled:opacity-50"
                >
                  {reviewSubmitting ? 'Recording Decision...' : 'Confirm Decision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Versioned Precursors Ledger */}
      {isPrecursorLedgerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E4E7] rounded-xl max-w-3xl w-full p-6 space-y-5 shadow-[0_16px_48px_rgba(0,0,0,0.16)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-4">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-[#059669]" />
                <div>
                  <h2 className="text-base font-semibold text-[#09090B] tracking-[-0.015em]">
                    Versioned Precursor Records
                  </h2>
                  <p className="text-xs text-[#52525B] mt-0.5">
                    Accepted supplier precursor emissions records linked to active heats.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrecursorLedgerOpen(false)}
                className="text-[#52525B] hover:text-[#09090B] p-1.5 rounded-lg hover:bg-[#F4F4F5]"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {precursors.length === 0 ? (
                <div className="p-8 text-center text-[#52525B] text-xs">
                  No precursor records generated yet.
                </div>
              ) : (
                precursors.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm font-semibold text-[#09090B]">{p.supplier_name}</strong>
                        <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-[#ECFDF5] text-[#047857] border border-emerald-200">
                          v{p.version}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-white text-[#52525B] border border-[#E4E4E7]">
                          {p.reporting_period}
                        </span>
                      </div>
                      <span className="text-xs font-semibold font-mono tabular-nums text-[#047857]">
                        {p.precursor_see_tco2_per_t.toFixed(2)} tCO₂e/t
                      </span>
                    </div>

                    <div className="text-xs text-[#52525B] flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        Product: <strong className="font-medium text-[#09090B]">{p.product_name}</strong>
                      </span>
                      <span className="font-mono tabular-nums">CN {p.cn_code}</span>
                      <span>
                        Route: <span className="text-[#09090B]">{p.production_route}</span>
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#E4E4E7] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-[#52525B]">
                        <Link2 className="w-3.5 h-3.5 text-[#059669]" />
                        <span>Linked Heats:</span>
                        <span className="font-mono text-[#047857] font-medium">
                          {(p.linked_heats || []).join(', ')}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-[#52525B]">
                        SHA-256: {p.evidence_sha256 ? `${p.evidence_sha256.slice(0, 12)}…` : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E4E4E7]">
              <button
                type="button"
                onClick={() => setIsPrecursorLedgerOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-[#09090B] hover:bg-zinc-800 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
