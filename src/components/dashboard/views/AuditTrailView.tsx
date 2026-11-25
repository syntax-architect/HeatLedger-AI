import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  Lock,
  Download,
  Filter,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  MessageSquare,
  FileSpreadsheet,
  FileText,
  Copy,
  ExternalLink,
  ChevronRight,
  Eye,
  Trash2,
  Send,
  Bell,
  UserCheck,
  Clock,
  Layers,
  ArrowRight,
  X,
} from 'lucide-react';
import {
  api,
  AuditLogRecord,
  AuditTrailResponse,
  AuditChainVerificationResponse,
  PlantWorkflowConfig,
  AuditComment,
  AuditNotification,
} from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../ui/ToastContext';

export const AuditTrailView: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [records, setRecords] = useState<AuditLogRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [integrityStatus, setIntegrityStatus] = useState<AuditChainVerificationResponse | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Filters
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Workflow Config & Legal Hold
  const [workflowConfig, setWorkflowConfig] = useState<PlantWorkflowConfig | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [smallPlantMode, setSmallPlantMode] = useState<boolean>(false);
  const [requireSeparateReviewer, setRequireSeparateReviewer] = useState<boolean>(true);

  // Legal Hold Modal
  const [isLegalHoldModalOpen, setIsLegalHoldModalOpen] = useState<boolean>(false);
  const [legalHoldReason, setLegalHoldReason] = useState<string>('');
  const [isTogglingLegalHold, setIsTogglingLegalHold] = useState<boolean>(false);

  // State Diff Modal
  const [selectedRecordForDiff, setSelectedRecordForDiff] = useState<AuditLogRecord | null>(null);

  // Comments & Mentions Drawer
  const [selectedEntityForComments, setSelectedEntityForComments] = useState<{
    type: string;
    id: string;
  } | null>(null);
  const [comments, setComments] = useState<AuditComment[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<AuditNotification[]>([]);

  // Export Loading States
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const isAdminOrOwner =
    !user || user.role === 'OWNER' || user.role === 'QA_HEAD' || user.role === 'QA_INSPECTOR';

  // Load Audit Trail Data
  const loadAuditData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.fetchAuditTrail({
        entity_type: entityTypeFilter === 'ALL' ? undefined : entityTypeFilter,
        action: actionFilter === 'ALL' ? undefined : actionFilter,
        limit: 100,
      });
      setRecords(data.records || []);
      setTotalCount(data.total_count || 0);
      setIntegrityStatus(data.integrity_status || null);
    } catch (err: any) {
      addToast(err.message || 'Failed to load audit trail', 'error');
    } finally {
      setLoading(false);
    }
  }, [entityTypeFilter, actionFilter, addToast]);

  // Load Plant Workflow Configuration
  const loadConfig = useCallback(async () => {
    try {
      const cfg = await api.fetchPlantWorkflowConfig();
      setWorkflowConfig(cfg);
      setSmallPlantMode(Boolean(cfg.small_plant_mode));
      setRequireSeparateReviewer(Boolean(cfg.require_separate_reviewer));
    } catch {
      // ignore
    }
  }, []);

  // Load Notifications
  const loadNotifications = useCallback(async () => {
    try {
      const notifs = await api.fetchAuditNotifications();
      setNotifications(notifs);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadAuditData();
    loadConfig();
    loadNotifications();
  }, [loadAuditData, loadConfig, loadNotifications]);

  // Run On-Demand Hash-Chain Verification
  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const res = await api.verifyAuditChain();
      setIntegrityStatus(res);
      if (res.valid) {
        addToast(
          `Cryptographic integrity verified: ${res.total_records} blocks link unbroken to Genesis Anchor.`,
          'success'
        );
      } else {
        addToast(
          `CRITICAL WARNING: Tampering detected at sequence #${res.tampered_sequence}!`,
          'error'
        );
      }
    } catch (err: any) {
      addToast(err.message || 'Verification check failed', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Save Plant Workflow Configuration
  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await api.updatePlantWorkflowConfig({
        small_plant_mode: smallPlantMode,
        require_separate_reviewer: requireSeparateReviewer,
        retention_years: 10,
      });
      addToast('Plant maker-checker rules updated successfully', 'success');
      setIsConfigModalOpen(false);
      loadConfig();
    } catch (err: any) {
      addToast(err.message || 'Failed to update workflow configuration', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Toggle Legal-Hold
  const handleToggleLegalHold = async (enable: boolean) => {
    if (enable && !legalHoldReason.trim()) {
      addToast('Please enter a formal reason or authority reference for legal hold', 'error');
      return;
    }
    setIsTogglingLegalHold(true);
    try {
      await api.setAuditLegalHold({
        entity_id: 'GLOBAL_HOLD',
        legal_hold: enable,
        reason: legalHoldReason || 'Standard statutory audit hold',
      });
      addToast(
        enable
          ? 'Legal-Hold ACTIVATED: All entity deletions strictly blocked.'
          : 'Legal-Hold released: Standard 10-year retention restored.',
        'success'
      );
      setIsLegalHoldModalOpen(false);
      setLegalHoldReason('');
      loadAuditData();
    } catch (err: any) {
      addToast(err.message || 'Failed to update legal hold', 'error');
    } finally {
      setIsTogglingLegalHold(false);
    }
  };

  // Open Comments Drawer
  const handleOpenComments = async (entityType: string, entityId: string) => {
    setSelectedEntityForComments({ type: entityType, id: entityId });
    try {
      const list = await api.fetchAuditComments(entityId);
      setComments(list);
    } catch (err: any) {
      addToast(err.message || 'Failed to load comments', 'error');
    }
  };

  // Post Comment
  const handlePostComment = async () => {
    if (!selectedEntityForComments || !newCommentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      await api.addAuditComment({
        entity_type: selectedEntityForComments.type,
        entity_id: selectedEntityForComments.id,
        comment_text: newCommentText,
      });
      addToast('Comment posted and logged to audit hash chain', 'success');
      setNewCommentText('');
      const updated = await api.fetchAuditComments(selectedEntityForComments.id);
      setComments(updated);
      loadAuditData();
    } catch (err: any) {
      addToast(err.message || 'Failed to post comment', 'error');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const blob = await api.downloadAuditCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HeatLedger_AuditLog_Chain_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addToast('Audit log CSV downloaded', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to export CSV', 'error');
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Export PDF Certificate
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const blob = await api.downloadAuditPdf();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HeatLedger_AuditCertificate_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addToast('Audit Certificate PDF downloaded', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to export PDF', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast(`${label} copied to clipboard`, 'success');
  };

  // Filtered Records
  const displayedRecords = useMemo(() => {
    return records.filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.entity_id.toLowerCase().includes(q) ||
        r.user_name.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q) ||
        r.record_hash.toLowerCase().includes(q)
      );
    });
  }, [records, searchQuery]);

  return (
    <div className="space-y-6 font-sans text-left">
      {/* 1. Header & Actions Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#18181A]/10">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-[#FCFBF8] text-[#18181A] flex items-center justify-center border border-[#18181A]/12 shrink-0">
            <Lock className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-medium text-[#18181A] tracking-[-0.02em]">
                Approvals &amp; Tamper-Evident Audit Trail
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#047857] border border-emerald-200 font-mono text-xs font-medium">
                SHA-256 Hash Chain
              </span>
            </div>
            <p className="text-xs text-[#55544E] mt-0.5">
              Append-only cryptographic ledger with maker-checker segregation, legal-hold enforcement, and verifier exports.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Workflow Config Modal Trigger */}
          {isAdminOrOwner && (
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="h-9 px-3 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] font-medium text-xs flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
              title="Configure Maker-Checker rules & small plant mode"
            >
              <Sliders className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
              <span className="hidden sm:inline">Workflow Rules</span>
            </button>
          )}

          {/* Legal Hold Button */}
          {isAdminOrOwner && (
            <button
              type="button"
              onClick={() => setIsLegalHoldModalOpen(true)}
              className="h-9 px-3 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] font-medium text-xs flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
              title="Toggle statutory legal hold on plant records"
            >
              <ShieldCheck className="w-4 h-4 text-[#B45309]" strokeWidth={1.5} />
              <span className="hidden sm:inline">Legal Hold</span>
            </button>
          )}

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExportingCsv}
            className="h-9 px-3 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] font-medium text-xs flex items-center gap-1.5 transition-colors duration-150 cursor-pointer disabled:opacity-60"
            title="Download CSV audit ledger"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Download PDF Certificate */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="h-9 px-3.5 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] font-medium text-xs flex items-center gap-1.5 transition-colors duration-150 cursor-pointer disabled:opacity-60"
            title="Download verified A4 audit attestation certificate"
          >
            <Download className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
            <span>Audit Certificate (PDF)</span>
          </button>
        </div>
      </div>

      {/* 2. Cryptographic Integrity Status Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          integrityStatus?.valid
            ? 'bg-[#ECFDF5] border-emerald-200'
            : 'bg-[#FEF2F2] border-[#FECACA]'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3">
          <span
            className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
              integrityStatus?.valid
                ? 'bg-[#FCFBF8] border-emerald-200 text-[#059669]'
                : 'bg-[#FCFBF8] border-[#FECACA] text-[#DC2626]'
            }`}
          >
            {integrityStatus?.valid ? (
              <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
            ) : (
              <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />
            )}
          </span>
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-sm text-[#18181A]">
                {integrityStatus?.valid
                  ? 'Cryptographic Hash-Chain Integrity: 100% Verified'
                  : 'Tampering Warning: Hash Chain Break Detected!'}
              </span>
              <span className="font-mono tabular-nums text-xs text-[#55544E]">
                ({totalCount} append-only entries)
              </span>
            </div>
            <p className="text-xs text-[#55544E] font-mono tabular-nums truncate max-w-xl">
              Latest Sealed SHA-256 Block:{' '}
              <span className="font-medium text-[#18181A]">
                {integrityStatus?.last_verified_hash
                  ? `${integrityStatus.last_verified_hash.slice(0, 32)}...`
                  : 'Root Genesis Anchor'}
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleVerifyChain}
          disabled={isVerifying}
          className="h-9 px-3.5 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-[#18181A] font-medium text-xs flex items-center justify-center gap-1.5 hover:bg-[#EFECE5] cursor-pointer disabled:opacity-50 self-start md:self-auto shrink-0 transition-colors duration-150"
        >
          <RefreshCw
            className={`w-4 h-4 text-[#059669] ${isVerifying ? 'animate-spin' : ''}`}
            strokeWidth={1.5}
          />
          <span>{isVerifying ? 'Verifying Tree...' : 'Verify Chain Now'}</span>
        </button>
      </div>

      {/* 3. Filter Bar & Search */}
      <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center flex-wrap gap-3">
          {/* Entity Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#55544E] font-medium">Entity:</span>
            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="h-9 px-2.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 font-medium text-[#18181A] focus:outline-none focus:border-[#059669]"
              aria-label="Filter by Entity Type"
            >
              <option value="ALL">All Entities</option>
              <option value="SHIPMENT">Shipments</option>
              <option value="CERTIFICATE">Certificates</option>
            </select>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#55544E] font-medium">Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-9 px-2.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 font-medium text-[#18181A] focus:outline-none focus:border-[#059669]"
              aria-label="Filter by Action"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="REVIEW">REVIEW</option>
              <option value="APPROVE">APPROVE</option>
              <option value="SIGN">SIGN</option>
              <option value="RELEASE">RELEASE</option>
              <option value="DELETE">DELETE</option>
              <option value="LEGAL_HOLD_ENABLE">LEGAL_HOLD</option>
              <option value="COMMENT">COMMENT</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search
            className="w-4 h-4 text-[#55544E] absolute left-3 top-1/2 -translate-y-1/2"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entity, user, hash..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] placeholder:text-[#78766E] text-xs focus:outline-none focus:border-[#059669]"
          />
        </div>
      </div>

      {/* 4. Chronological Ledger Table */}
      <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#55544E] gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#059669]" strokeWidth={1.5} />
            <p className="text-xs font-mono">Loading tamper-evident audit ledger...</p>
          </div>
        ) : displayedRecords.length === 0 ? (
          <div className="py-16 text-center text-[#55544E] space-y-2">
            <Lock className="w-6 h-6 mx-auto text-[#78766E]" strokeWidth={1.5} />
            <p className="text-xs font-medium text-[#18181A]">
              No audit entries matching filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F7F5F0] border-b border-[#18181A]/10 text-[#55544E]">
                <tr>
                  <th className="py-3 px-4 font-medium">Seq</th>
                  <th className="py-3 px-4 font-medium">Timestamp (UTC)</th>
                  <th className="py-3 px-4 font-medium">Entity</th>
                  <th className="py-3 px-4 font-medium">Action</th>
                  <th className="py-3 px-4 font-medium">Actor (Role)</th>
                  <th className="py-3 px-4 font-medium">IP Address</th>
                  <th className="py-3 px-4 font-medium">SHA-256 Record Hash</th>
                  <th className="py-3 px-4 font-medium text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181A]/10 text-[#18181A]">
                {displayedRecords.map((r) => (
                  <tr
                    key={r.sequence_number}
                    className="hover:bg-[#F7F5F0] transition-colors duration-150"
                  >
                    <td className="py-3 px-4 font-mono tabular-nums font-medium text-[#18181A]">
                      #{r.sequence_number}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-[#55544E] whitespace-nowrap">
                      {r.timestamp.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-[#18181A]">
                          {r.entity_id}
                        </span>
                        <span className="text-xs font-mono text-[#55544E] bg-[#EFECE5] border border-[#18181A]/10 px-1.5 py-0.5 rounded">
                          {r.entity_type}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md font-mono text-xs font-medium border ${
                          r.action === 'SIGN' || r.action === 'RELEASE'
                            ? 'bg-[#ECFDF5] text-[#047857] border-emerald-200'
                            : r.action === 'APPROVE'
                              ? 'bg-[#F7F5F0] text-[#18181A] border-[#18181A]/15'
                              : r.action === 'DELETE'
                                ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                                : 'bg-[#EFECE5] text-[#55544E] border-[#18181A]/10'
                        }`}
                      >
                        {r.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-medium text-[#18181A]">
                        {r.user_name}
                      </span>{' '}
                      <span className="text-[#55544E] font-mono text-xs">({r.user_role})</span>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-[#55544E] whitespace-nowrap">
                      {r.ip_address}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-xs text-[#55544E]">
                      <div className="flex items-center gap-1.5">
                        <span>{r.record_hash.slice(0, 16)}...</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(r.record_hash, 'Full SHA-256')}
                          className="text-[#78766E] hover:text-[#18181A] cursor-pointer"
                          title="Copy full 64-char SHA-256 hash"
                        >
                          <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedRecordForDiff(r)}
                          className="p-1.5 rounded-lg bg-[#F7F5F0] hover:bg-[#EFECE5] border border-[#18181A]/10 text-[#55544E] hover:text-[#18181A] cursor-pointer"
                          title="View state delta and diff"
                        >
                          <Eye className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenComments(r.entity_type, r.entity_id)}
                          className="p-1.5 rounded-lg bg-[#F7F5F0] hover:bg-[#EFECE5] border border-[#18181A]/10 text-[#55544E] hover:text-[#18181A] cursor-pointer"
                          title="View comments & mentions"
                        >
                          <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. MODALS & DRAWERS */}
      {/* Before/After Diff Inspector Modal */}
      {selectedRecordForDiff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
          <div className="bg-[#FCFBF8] rounded-xl max-w-xl w-full border border-[#18181A]/15 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
              <div>
                <h3 className="font-medium text-[#18181A] text-base flex items-center gap-2">
                  <span>Audit Block #{selectedRecordForDiff.sequence_number}</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#EFECE5] border border-[#18181A]/10 text-[#55544E] text-xs font-mono">
                    {selectedRecordForDiff.action}
                  </span>
                </h3>
                <p className="text-xs text-[#55544E] font-mono mt-0.5">
                  Entity: {selectedRecordForDiff.entity_type} {selectedRecordForDiff.entity_id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecordForDiff(null)}
                className="p-1.5 rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer"
                aria-label="Close audit block inspector"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5">
                <span className="font-medium text-[#55544E] block">
                  State Before
                </span>
                <pre className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 font-mono text-xs text-[#18181A] whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {JSON.stringify(JSON.parse(selectedRecordForDiff.before_state || '{}'), null, 2)}
                </pre>
              </div>

              <div className="space-y-1.5">
                <span className="font-medium text-[#047857] block">
                  State After
                </span>
                <pre className="p-3 rounded-lg bg-[#ECFDF5]/60 border border-emerald-200 font-mono text-xs text-[#047857] whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {JSON.stringify(JSON.parse(selectedRecordForDiff.after_state || '{}'), null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-xs space-y-1 font-mono tabular-nums">
              <div className="text-[#55544E] truncate">
                Previous Block Hash: {selectedRecordForDiff.previous_hash}
              </div>
              <div className="text-[#047857] font-medium truncate">
                Sealed Record Hash: {selectedRecordForDiff.record_hash}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#18181A]/10">
              <button
                type="button"
                onClick={() => setSelectedRecordForDiff(null)}
                className="h-9 px-4 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] font-medium text-xs cursor-pointer transition-colors duration-150"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Configuration Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
          <div className="bg-[#FCFBF8] rounded-xl max-w-md w-full border border-[#18181A]/15 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                <h3 className="font-medium text-[#18181A] text-base">
                  Plant Maker-Checker Rules
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer"
                aria-label="Close configuration"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="font-medium text-[#18181A] block">
                      Small Plant Collapsible Progression
                    </span>
                    <span className="text-[#55544E] text-xs">
                      Allows smaller plants with lean QA teams to collapse Review &amp; Approval steps.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Enable Small Plant Mode"
                    checked={smallPlantMode}
                    onChange={(e) => setSmallPlantMode(e.target.checked)}
                    className="w-4 h-4 accent-[#059669] cursor-pointer shrink-0"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="font-medium text-[#18181A] block">
                      Strict Segregation of Duties
                    </span>
                    <span className="text-[#55544E] text-xs">
                      Enforces that the person who reviews cannot approve their own certificate.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Strict Segregation of Duties"
                    checked={requireSeparateReviewer}
                    onChange={(e) => setRequireSeparateReviewer(e.target.checked)}
                    className="w-4 h-4 accent-[#059669] cursor-pointer shrink-0"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#ECFDF5] border border-emerald-200 text-[#047857] text-xs">
                <strong className="font-medium">Statutory Retention Policy:</strong> 10-year immutable audit retention configured in accordance with EN 10204:2004 Clause 6 and Regulation (EU) 2023/956 Article 25.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#18181A]/10">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="h-9 px-4 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] font-medium text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="h-9 px-4 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] font-medium text-xs cursor-pointer disabled:opacity-50 transition-colors duration-150"
              >
                {isSavingConfig ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legal-Hold Modal */}
      {isLegalHoldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
          <div className="bg-[#FCFBF8] rounded-xl max-w-md w-full border border-[#18181A]/15 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#B45309]" strokeWidth={1.5} />
                <h3 className="font-medium text-[#18181A] text-base">
                  Statutory Legal-Hold
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLegalHoldModalOpen(false)}
                className="p-1.5 rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer"
                aria-label="Close legal hold modal"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <p className="text-xs text-[#55544E]">
              When Legal-Hold is activated, all soft and hard deletions across certificates, heats, and shipments are permanently locked.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#18181A]">
                Inquiry Reference / Reason
              </label>
              <textarea
                rows={3}
                value={legalHoldReason}
                onChange={(e) => setLegalHoldReason(e.target.value)}
                placeholder="e.g. European Commission CBAM verifier audit notice #AUD-2026-EU..."
                className="w-full px-3 py-2 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#18181A]/10">
              <button
                type="button"
                onClick={() => handleToggleLegalHold(false)}
                disabled={isTogglingLegalHold}
                className="h-9 px-3.5 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-[#18181A] font-medium text-xs cursor-pointer hover:bg-[#EFECE5]"
              >
                Release Hold
              </button>

              <button
                type="button"
                onClick={() => handleToggleLegalHold(true)}
                disabled={isTogglingLegalHold}
                className="h-9 px-4 rounded-lg bg-[#DC2626] hover:bg-red-700 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
              >
                {isTogglingLegalHold ? 'Locking...' : 'Activate Legal-Hold'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments & Mentions Drawer */}
      {selectedEntityForComments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
          <div className="bg-[#FCFBF8] rounded-xl max-w-lg w-full border border-[#18181A]/15 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                <h3 className="font-medium text-[#18181A] text-base">
                  Audit Notes: {selectedEntityForComments.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntityForComments(null)}
                className="p-1.5 rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer"
                aria-label="Close comments drawer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2.5">
              {comments.length === 0 ? (
                <p className="text-xs text-[#55544E] text-center py-6">
                  Zero comments recorded on this entity yet.
                </p>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[#55544E] font-mono tabular-nums text-xs">
                      <span className="font-medium font-sans text-[#18181A]">
                        {c.author_name} ({c.author_role})
                      </span>
                      <span>{c.created_at.slice(0, 19).replace('T', ' ')}</span>
                    </div>
                    <p className="text-[#18181A] whitespace-pre-wrap">
                      {c.comment_text}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Quick @Mention helper pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[#55544E]">Mention:</span>
              {['@Chatterjee (QA_INSPECTOR)', '@Sharma (QA)', '@Director'].map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setNewCommentText((prev) => `${prev} ${pill.split(' ')[0]} `)}
                  className="px-2 py-0.5 rounded bg-[#EFECE5] text-[#18181A] border border-[#18181A]/10 font-mono text-xs hover:bg-[#ECFDF5] hover:text-[#047857] cursor-pointer"
                >
                  {pill.split(' ')[0]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Write audit note or @mention colleague..."
                className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
              />
              <button
                type="button"
                onClick={handlePostComment}
                disabled={isSubmittingComment || !newCommentText.trim()}
                className="h-9 px-3 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] transition-colors duration-150 disabled:opacity-50 cursor-pointer shrink-0 flex items-center justify-center"
              >
                <Send className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
