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
    <div className="space-y-6 font-sans">
      {/* 1. Header & Actions Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-sm shrink-0">
            <Lock className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Approvals &amp; Tamper-Evident Audit Trail
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono text-xs font-bold">
                SHA-256 Hash Chain
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Append-only cryptographic ledger with maker-checker segregation, legal-hold enforcement, and verifier exports.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Workflow Config Modal Trigger */}
          {isAdminOrOwner && (
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Configure Maker-Checker rules & small plant mode"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Workflow Rules</span>
            </button>
          )}

          {/* Legal Hold Button */}
          {isAdminOrOwner && (
            <button
              onClick={() => setIsLegalHoldModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Toggle statutory legal hold on plant records"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Legal Hold</span>
            </button>
          )}

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            disabled={isExportingCsv}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            title="Download CSV audit ledger"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Download PDF Certificate */}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            title="Download verified A4 audit attestation certificate"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400 dark:text-slate-950" />
            <span>Audit Certificate (PDF)</span>
          </button>
        </div>
      </div>

      {/* 2. Cryptographic Integrity Status Banner */}
      <div
        className={`p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          integrityStatus?.valid
            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
            : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3">
          <span
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              integrityStatus?.valid
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            {integrityStatus?.valid ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </span>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {integrityStatus?.valid
                  ? 'Cryptographic Hash-Chain Integrity: 100% Verified'
                  : 'Tampering Warning: Hash Chain Break Detected!'}
              </span>
              <span className="font-mono text-xs text-slate-500">
                ({totalCount} append-only entries)
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-mono truncate max-w-xl">
              Latest Sealed SHA-256 Block:{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {integrityStatus?.last_verified_hash
                  ? `${integrityStatus.last_verified_hash.slice(0, 32)}...`
                  : 'Root Genesis Anchor'}
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={handleVerifyChain}
          disabled={isVerifying}
          className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50 self-start md:self-auto shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${isVerifying ? 'animate-spin' : ''}`} />
          <span>{isVerifying ? 'Verifying Tree...' : 'Verify Chain Now'}</span>
        </button>
      </div>

      {/* 3. Filter Bar & Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center flex-wrap gap-2">
          {/* Entity Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Entity:</span>
            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
              aria-label="Filter by Entity Type"
            >
              <option value="ALL">All Entities</option>
              <option value="SHIPMENT">Shipments</option>
              <option value="CERTIFICATE">Certificates</option>
            </select>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
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
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entity, user, hash..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* 4. Chronological Ledger Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-xs font-mono">Loading tamper-evident audit ledger...</p>
          </div>
        ) : displayedRecords.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Lock className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-medium">No audit entries matching filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Seq</th>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor (Role)</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">SHA-256 Record Hash</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {displayedRecords.map((r) => {
                  const isActionCritical = ['APPROVE', 'SIGN', 'RELEASE', 'DELETE'].includes(r.action);
                  return (
                    <tr
                      key={r.sequence_number}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        #{r.sequence_number}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {r.timestamp.replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {r.entity_id}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {r.entity_type}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                            r.action === 'SIGN' || r.action === 'RELEASE'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                              : r.action === 'APPROVE'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                              : r.action === 'DELETE'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {r.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {r.user_name}
                        </span>{' '}
                        <span className="text-slate-400 font-mono text-[11px]">({r.user_role})</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {r.ip_address}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <span>{r.record_hash.slice(0, 16)}...</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(r.record_hash, 'Full SHA-256')}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Copy full 64-char SHA-256 hash"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedRecordForDiff(r)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                            title="View state delta and diff"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenComments(r.entity_type, r.entity_id)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                            title="View comments & mentions"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. MODALS & DRAWERS */}
      {/* Before/After Diff Inspector Modal */}
      {selectedRecordForDiff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                  <span>Audit Block #{selectedRecordForDiff.sequence_number}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-mono">
                    {selectedRecordForDiff.action}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Entity: {selectedRecordForDiff.entity_type} {selectedRecordForDiff.entity_id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecordForDiff(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-mono px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5">
                <span className="font-semibold text-slate-500 font-mono uppercase text-[11px]">
                  State Before
                </span>
                <pre className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {JSON.stringify(JSON.parse(selectedRecordForDiff.before_state || '{}'), null, 2)}
                </pre>
              </div>

              <div className="space-y-1.5">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono uppercase text-[11px]">
                  State After
                </span>
                <pre className="p-3 rounded-xl bg-emerald-50/30 dark:bg-slate-950 border border-emerald-200/80 dark:border-emerald-800/40 font-mono text-[11px] text-emerald-900 dark:text-emerald-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {JSON.stringify(JSON.parse(selectedRecordForDiff.after_state || '{}'), null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1 font-mono">
              <div className="text-slate-500">
                Previous Block Hash: {selectedRecordForDiff.previous_hash}
              </div>
              <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                Sealed Record Hash: {selectedRecordForDiff.record_hash}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedRecordForDiff(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-semibold text-xs cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Configuration Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Plant Maker-Checker Rules
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-mono px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">
                      Small Plant Collapsible Progression
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Allows smaller plants with lean QA teams to collapse Review &amp; Approval steps.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Enable Small Plant Mode"
                    checked={smallPlantMode}
                    onChange={(e) => setSmallPlantMode(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">
                      Strict Segregation of Duties
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Enforces that the person who reviews cannot approve their own certificate.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Strict Segregation of Duties"
                    checked={requireSeparateReviewer}
                    onChange={(e) => setRequireSeparateReviewer(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px]">
                <strong>Statutory Retention Policy:</strong> 10-year immutable audit retention configured in accordance with EN 10204:2004 Clause 6 and Regulation (EU) 2023/956 Article 25.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-semibold text-xs cursor-pointer disabled:opacity-50"
              >
                {isSavingConfig ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legal-Hold Modal */}
      {isLegalHoldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Statutory Legal-Hold
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLegalHoldModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-mono px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              When Legal-Hold is activated, all soft and hard deletions across certificates, heats, and shipments are permanently locked.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Inquiry Reference / Reason
              </label>
              <textarea
                rows={3}
                value={legalHoldReason}
                onChange={(e) => setLegalHoldReason(e.target.value)}
                placeholder="e.g. European Commission CBAM verifier audit notice #AUD-2026-EU..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => handleToggleLegalHold(false)}
                disabled={isTogglingLegalHold}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer hover:bg-slate-200"
              >
                Release Hold
              </button>

              <button
                type="button"
                onClick={() => handleToggleLegalHold(true)}
                disabled={isTogglingLegalHold}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs cursor-pointer disabled:opacity-50"
              >
                {isTogglingLegalHold ? 'Locking...' : 'Activate Legal-Hold'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments & Mentions Drawer */}
      {selectedEntityForComments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Audit Notes: {selectedEntityForComments.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntityForComments(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-mono px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2.5">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Zero comments recorded on this entity yet.
                </p>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {c.author_name} ({c.author_role})
                      </span>
                      <span>{c.created_at.slice(0, 19).replace('T', ' ')}</span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                      {c.comment_text}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Quick @Mention helper pills */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-[11px]">Mention:</span>
              {['@Chatterjee (QA_INSPECTOR)', '@Sharma (QA)', '@Director'].map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setNewCommentText((prev) => `${prev} ${pill.split(' ')[0]} `)}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px] hover:bg-emerald-50 hover:text-emerald-700"
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
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none"
              />
              <button
                type="button"
                onClick={handlePostComment}
                disabled={isSubmittingComment || !newCommentText.trim()}
                className="p-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
