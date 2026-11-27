import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Send,
  FileSpreadsheet,
  Layers,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  ApiService,
  SupplierRequestItem,
  CreateSupplierRequestInput,
} from '../../../services/api';
import { useToast } from '../../ui/ToastContext';

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
  const [createdRequestResult, setCreatedRequestResult] = useState<any | null>(null);

  const [reviewModalRequest, setReviewModalRequest] = useState<SupplierRequestItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'Accepted' | 'Returned'>('Accepted');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [linkedHeatsText, setLinkedHeatsText] = useState<string>('TSJ-26-9021, TSJ-26-9022');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  const [reminderModalData, setReminderModalData] = useState<{
    requestId: string;
    supplierName: string;
    productName: string;
    deadline: string;
    token: string;
    whatsappMsg?: string;
  } | null>(null);

  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // New Request Form State
  const [supplierId, setSupplierId] = useState<string>('sup_tata_01');
  const [supplierName, setSupplierName] = useState<string>('Tata Steel Limited (Jamshedpur)');
  const [productName, setProductName] = useState<string>('Continuously Cast Billets (150x150 mm)');
  const [cnCode, setCnCode] = useState<string>('7207 11 00');
  const [reportingPeriod, setReportingPeriod] = useState<string>('2026-Q1');
  const [dueDate, setDueDate] = useState<string>('2026-12-15');
  const [supplierEmail, setSupplierEmail] = useState<string>('cbam.desk@tatasteel.com');
  const [supplierPhone, setSupplierPhone] = useState<string>('+919830112233');
  const [customNote, setCustomNote] = useState<string>('Required for EU CBAM export batch EXP-2026-109');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);

  const supplierPresets = [
    {
      id: 'sup_tata_01',
      name: 'Tata Steel Limited (Jamshedpur)',
      email: 'cbam.desk@tatasteel.com',
      phone: '+919830112233',
      defaultProduct: 'Continuously Cast Billets (150x150 mm)',
      defaultCn: '7207 11 00',
    },
    {
      id: 'sup_sail_02',
      name: 'Steel Authority of India Limited (Durgapur)',
      email: 'cbam.durgapur@sail.in',
      phone: '+919831998877',
      defaultProduct: 'Hot Rolled Steel Rounds (Dia 80mm)',
      defaultCn: '7214 99 10',
    },
    {
      id: 'sup_jsw_03',
      name: 'JSW Steel Limited (Vijayanagar)',
      email: 'cbam@jsw.in',
      phone: '+919845112233',
      defaultProduct: 'Carbon Steel Blooms & Billets',
      defaultCn: '7207 11 00',
    },
    {
      id: 'sup_jspl_04',
      name: 'Jindal Steel & Power Limited (Angul)',
      email: 'quality.angul@jindalsteel.com',
      phone: '+919861001122',
      defaultProduct: 'Alloy Round Billets (ASTM A105)',
      defaultCn: '7228 30 20',
    },
  ];

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

  const handleSupplierSelect = (id: string) => {
    const s = supplierPresets.find((p) => p.id === id);
    if (s) {
      setSupplierId(s.id);
      setSupplierName(s.name);
      setSupplierEmail(s.email);
      setSupplierPhone(s.phone);
      setProductName(s.defaultProduct);
      setCnCode(s.defaultCn);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);
    try {
      const payload: CreateSupplierRequestInput = {
        supplier_id: supplierId,
        supplier_name: supplierName,
        product_name: productName,
        cn_code: cnCode,
        reporting_period: reportingPeriod,
        due_date: dueDate,
        data_needed: [
          'production_route',
          'direct_fuel_consumption',
          'electricity_consumption',
          'electricity_source',
          'scrap_content_pct',
          'precursor_emissions_tco2_per_t',
          'evidence_doc',
        ],
        supplier_email: supplierEmail || undefined,
        supplier_phone: supplierPhone || undefined,
        custom_note: customNote || undefined,
      };

      const result = await ApiService.createSupplierRequest(payload);
      setCreatedRequestResult(result);
      toast.success('Request Created', 'No-login supplier portal link generated.');
      loadRequests();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      toast.error('Request Creation Failed', err?.message || 'Unable to create supplier request.');
    } finally {
      setIsSubmittingCreate(false);
    }
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

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalRequest) return;
    setIsSubmittingReview(true);
    try {
      const heats = linkedHeatsText
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean);

      await ApiService.reviewSupplierRequest(reviewModalRequest.id, {
        action: reviewAction,
        comment:
          reviewComment ||
          (reviewAction === 'Accepted' ? 'Precursor verified by QA.' : 'Returned for revision.'),
        linked_heats: reviewAction === 'Accepted' ? heats : undefined,
      });

      toast.success(
        reviewAction === 'Accepted' ? 'Precursor Accepted' : 'Returned to Supplier',
        reviewAction === 'Accepted'
          ? 'Precursor data accepted and linked to active heats.'
          : 'Submission returned to supplier with review notes.'
      );
      setReviewModalRequest(null);
      loadRequests();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      toast.error('Review Submission Failed', err?.message || 'Unable to record QA review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    toast.success('Copied to Clipboard', 'Supplier link copied.');
    setTimeout(() => setCopiedToken(null), 2000);
  };

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
          onClick={() => {
            setCreatedRequestResult(null);
            setIsCreateModalOpen(true);
          }}
          className="h-9 px-3.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] font-medium text-xs inline-flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          <span>New Supplier Request</span>
        </button>
      </div>

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
            onClick={() => setActiveFilter(tab.key)}
            className={`p-3 rounded-xl border text-left transition-colors ${
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
            onChange={(e) => setSearchQuery(e.target.value)}
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
                    copyToClipboard(
                      `${window.location.origin}/supplier-request/${req.token}`,
                      req.id
                    )
                  }
                  className="h-8 px-3 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium border border-[#18181A]/15 transition-colors inline-flex items-center gap-1.5"
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
                  onClick={() => handleSendReminder(req.id)}
                  className="h-8 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium border border-amber-200 transition-colors inline-flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Remind</span>
                </button>

                {['RECEIVED', 'IN_REVIEW'].includes(req.status.toUpperCase()) && (
                  <button
                    type="button"
                    onClick={() => {
                      setReviewModalRequest(req);
                      setReviewAction('Accepted');
                      setReviewComment('Precursor verified against third-party mill statement.');
                    }}
                    className="h-8 px-3 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] text-xs font-medium transition-colors inline-flex items-center gap-1.5"
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

      {/* Create New Request Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0D0E11]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FCFBF8] border border-[#18181A]/15 rounded-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3.5">
              <h3 className="text-base font-medium text-[#18181A] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                <span>New Supplier CBAM Data Request</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#55544E] hover:text-[#18181A] h-8 w-8 rounded-lg hover:bg-[#EFECE5] flex items-center justify-center transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {createdRequestResult ? (
              <div className="py-4 text-center space-y-4">
                <div className="w-11 h-11 mx-auto rounded-xl bg-[#059669]/10 border border-[#059669]/20 text-[#059669] flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <h4 className="text-base font-medium text-[#18181A]">
                  Secure Request Link Generated
                </h4>
                <p className="text-xs text-[#55544E] leading-relaxed max-w-md mx-auto">
                  The request for <span className="font-medium text-[#18181A]">{createdRequestResult.product_name}</span> is live. Share this mobile link with your supplier&apos;s QA or sustainability desk:
                </p>

                <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 flex items-center justify-between gap-3 text-left">
                  <span className="text-xs font-mono text-[#047857] truncate">
                    {window.location.origin}/supplier-request/{createdRequestResult.token}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `${window.location.origin}/supplier-request/${createdRequestResult.token}`,
                        'modal'
                      )
                    }
                    className="h-8 px-3 rounded-md bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] text-xs font-medium shrink-0 transition-colors"
                  >
                    {copiedToken === 'modal' ? 'Copied' : 'Copy Link'}
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#18181A]/10 text-left text-xs text-[#18181A] space-y-2">
                  <div className="font-medium flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                    <span>WhatsApp Invitation Preview</span>
                  </div>
                  <pre className="text-xs font-mono text-[#55544E] whitespace-pre-wrap bg-[#FCFBF8] p-3 rounded-lg border border-[#18181A]/10">
                    {createdRequestResult.whatsapp_invitation}
                  </pre>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-9 px-4 rounded-lg bg-[#18181A] hover:bg-[#2C303A] text-[#FCFBF8] text-xs font-medium transition-colors"
                >
                  Done &amp; Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#55544E] mb-1.5">
                    Select Upstream Steel Mill *
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => handleSupplierSelect(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
                  >
                    {supplierPresets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#55544E] mb-1.5">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#55544E] mb-1.5">
                      CN Code (Combined Nomenclature) *
                    </label>
                    <input
                      type="text"
                      required
                      value={cnCode}
                      onChange={(e) => setCnCode(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs font-mono focus:outline-none focus:border-[#059669]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#55544E] mb-1.5">
                      Reporting Period *
                    </label>
                    <select
                      value={reportingPeriod}
                      onChange={(e) => setReportingPeriod(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
                    >
                      <option value="2026-Q1">2026-Q1 (Jan – Mar 2026)</option>
                      <option value="2026-Q2">2026-Q2 (Apr – Jun 2026)</option>
                      <option value="2025-Annual">2025-Annual (Full Year)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#55544E] mb-1.5">
                      Target Due Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs font-mono focus:outline-none focus:border-[#059669]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#55544E] mb-1.5">
                      Supplier Contact Email
                    </label>
                    <input
                      type="email"
                      value={supplierEmail}
                      onChange={(e) => setSupplierEmail(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#55544E] mb-1.5">
                      Supplier Contact Phone (WhatsApp)
                    </label>
                    <input
                      type="tel"
                      value={supplierPhone}
                      onChange={(e) => setSupplierPhone(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs font-mono focus:outline-none focus:border-[#059669]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#55544E] mb-1.5">
                    Custom Note / Batch Context
                  </label>
                  <textarea
                    rows={2}
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="e.g. Precursor billets for export batch EXP-2026-109."
                    className="w-full px-3 py-2 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs placeholder:text-[#78766E] focus:outline-none focus:border-[#059669]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#18181A]/10">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="h-9 px-3.5 rounded-lg text-xs font-medium text-[#55544E] hover:text-[#18181A] border border-[#18181A]/15 bg-[#FCFBF8] hover:bg-[#EFECE5] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCreate}
                    className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] font-medium text-xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {isSubmittingCreate ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                        <span>Generating Link...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>Create &amp; Generate Link</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Review Submission Modal */}
      {reviewModalRequest && (
        <div className="fixed inset-0 z-50 bg-[#0D0E11]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FCFBF8] border border-[#18181A]/15 rounded-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3.5">
              <h3 className="text-base font-medium text-[#18181A] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                <span>Review Precursor Data Submission</span>
              </h3>
              <button
                type="button"
                onClick={() => setReviewModalRequest(null)}
                className="text-[#55544E] hover:text-[#18181A] h-8 w-8 rounded-lg hover:bg-[#EFECE5] flex items-center justify-center transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#18181A]/10 text-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#55544E]">Supplier</span>
                <span className="text-[#18181A] font-medium">{reviewModalRequest.supplier_name}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#55544E]">Product &amp; CN</span>
                <span className="text-[#18181A] font-mono">
                  {reviewModalRequest.product_name} ({reviewModalRequest.cn_code})
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#55544E]">Reported SEE</span>
                <span className="text-[#047857] font-mono tabular-nums font-medium">
                  {reviewModalRequest.precursor_emissions_tco2_per_t || 1.825} tCO₂e / t
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#55544E]">Data Origin</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
                  Supplier-Reported (Unverified until Accepted)
                </span>
              </div>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
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
                  onClick={() => setReviewModalRequest(null)}
                  className="h-9 px-3.5 rounded-lg text-xs font-medium text-[#55544E] hover:text-[#18181A] border border-[#18181A]/15 bg-[#FCFBF8] hover:bg-[#EFECE5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className={`h-9 px-4 rounded-lg font-medium text-xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
                    reviewAction === 'Accepted'
                      ? 'bg-[#059669] hover:bg-[#047857] text-[#FCFBF8]'
                      : 'bg-rose-700 hover:bg-rose-800 text-[#FCFBF8]'
                  }`}
                >
                  {isSubmittingReview ? (
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
      )}

      {/* Reminder Notice Modal */}
      {reminderModalData && (
        <div className="fixed inset-0 z-50 bg-[#0D0E11]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FCFBF8] border border-[#18181A]/15 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3.5">
              <h3 className="text-base font-medium text-[#18181A] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-700" strokeWidth={1.5} />
                <span>Supplier Reminder Dispatched</span>
              </h3>
              <button
                type="button"
                onClick={() => setReminderModalData(null)}
                className="text-[#55544E] hover:text-[#18181A] h-8 w-8 rounded-lg hover:bg-[#EFECE5] flex items-center justify-center transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <p className="text-xs text-[#55544E]">
              A reminder timestamp has been recorded. You can copy and send this message directly via WhatsApp:
            </p>

            <pre className="p-3.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-xs font-mono text-[#18181A] whitespace-pre-wrap max-h-48 overflow-y-auto">
              {reminderModalData.whatsappMsg}
            </pre>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#18181A]/10">
              <button
                type="button"
                onClick={() => {
                  if (reminderModalData.whatsappMsg) {
                    copyToClipboard(reminderModalData.whatsappMsg, 'whatsapp');
                  }
                }}
                className="h-9 px-3.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-[#FCFBF8] font-medium text-xs inline-flex items-center gap-1.5 transition-colors"
              >
                {copiedToken === 'whatsapp' ? (
                  <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                ) : (
                  <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                )}
                <span>{copiedToken === 'whatsapp' ? 'Copied' : 'Copy WhatsApp Message'}</span>
              </button>
              <button
                type="button"
                onClick={() => setReminderModalData(null)}
                className="h-9 px-3.5 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] border border-[#18181A]/15 text-xs font-medium transition-colors"
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

export default SupplierDataRequestsTracker;
