import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, FileSpreadsheet, Lock, ShieldCheck, Sliders } from 'lucide-react';
import {
  api,
  AuditLogRecord,
  AuditChainVerificationResponse,
  AuditComment,
} from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../ui/ToastContext';
import {
  AuditFilterBar,
  AuditIntegrityBanner,
  AuditLedgerTable,
} from './audit/AuditLedgerTable';
import {
  AuditCommentsModal,
  AuditConfigModal,
  AuditDiffModal,
  AuditLegalHoldModal,
} from './audit/AuditModals';

export const AuditTrailView: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [records, setRecords] = useState<AuditLogRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [integrityStatus, setIntegrityStatus] = useState<AuditChainVerificationResponse | null>(
    null
  );
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [smallPlantMode, setSmallPlantMode] = useState<boolean>(false);
  const [requireSeparateReviewer, setRequireSeparateReviewer] = useState<boolean>(true);

  const [isLegalHoldModalOpen, setIsLegalHoldModalOpen] = useState<boolean>(false);
  const [legalHoldReason, setLegalHoldReason] = useState<string>('');
  const [isTogglingLegalHold, setIsTogglingLegalHold] = useState<boolean>(false);

  const [selectedRecordForDiff, setSelectedRecordForDiff] = useState<AuditLogRecord | null>(null);

  const [selectedEntityForComments, setSelectedEntityForComments] = useState<{
    type: string;
    id: string;
  } | null>(null);
  const [comments, setComments] = useState<AuditComment[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);

  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const isAdminOrOwner =
    !user || user.role === 'OWNER' || user.role === 'QA_HEAD' || user.role === 'QA_INSPECTOR';

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

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await api.fetchPlantWorkflowConfig();
      setSmallPlantMode(Boolean(cfg.small_plant_mode));
      setRequireSeparateReviewer(Boolean(cfg.require_separate_reviewer));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadAuditData();
    loadConfig();
    api.fetchAuditNotifications().catch(() => {});
  }, [loadAuditData, loadConfig]);

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

  const handleOpenComments = async (entityType: string, entityId: string) => {
    setSelectedEntityForComments({ type: entityType, id: entityId });
    try {
      const list = await api.fetchAuditComments(entityId);
      setComments(list);
    } catch (err: any) {
      addToast(err.message || 'Failed to load comments', 'error');
    }
  };

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

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const blob = await api.downloadAuditCsv();
      triggerBlobDownload(blob, `HeatLedger_AuditLog_Chain_${new Date().toISOString().slice(0, 10)}.csv`);
      addToast('Audit log CSV downloaded', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to export CSV', 'error');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const blob = await api.downloadAuditPdf();
      triggerBlobDownload(
        blob,
        `HeatLedger_AuditCertificate_${new Date().toISOString().slice(0, 10)}.pdf`
      );
      addToast('Audit Certificate PDF downloaded', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to export PDF', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const displayedRecords = useMemo(
    () =>
      records.filter((r) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          r.entity_id.toLowerCase().includes(q) ||
          r.user_name.toLowerCase().includes(q) ||
          r.action.toLowerCase().includes(q) ||
          r.record_hash.toLowerCase().includes(q)
        );
      }),
    [records, searchQuery]
  );

  return (
    <div className="space-y-6 font-sans text-left">
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
              Append-only cryptographic ledger with maker-checker segregation, legal-hold
              enforcement, and verifier exports.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
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

      <AuditIntegrityBanner
        integrityStatus={integrityStatus}
        totalCount={totalCount}
        isVerifying={isVerifying}
        onVerifyChain={handleVerifyChain}
      />

      <AuditFilterBar
        entityTypeFilter={entityTypeFilter}
        onEntityTypeChange={setEntityTypeFilter}
        actionFilter={actionFilter}
        onActionFilterChange={setActionFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      <AuditLedgerTable
        loading={loading}
        displayedRecords={displayedRecords}
        onCopyHash={(hash) => {
          navigator.clipboard.writeText(hash);
          addToast('Full SHA-256 copied to clipboard', 'success');
        }}
        onInspectDiff={setSelectedRecordForDiff}
        onOpenComments={handleOpenComments}
      />

      {selectedRecordForDiff && (
        <AuditDiffModal
          record={selectedRecordForDiff}
          onClose={() => setSelectedRecordForDiff(null)}
        />
      )}

      {isConfigModalOpen && (
        <AuditConfigModal
          smallPlantMode={smallPlantMode}
          onSmallPlantModeChange={setSmallPlantMode}
          requireSeparateReviewer={requireSeparateReviewer}
          onRequireSeparateReviewerChange={setRequireSeparateReviewer}
          isSavingConfig={isSavingConfig}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveConfig}
        />
      )}

      {isLegalHoldModalOpen && (
        <AuditLegalHoldModal
          legalHoldReason={legalHoldReason}
          onReasonChange={setLegalHoldReason}
          isTogglingLegalHold={isTogglingLegalHold}
          onClose={() => setIsLegalHoldModalOpen(false)}
          onToggleHold={handleToggleLegalHold}
        />
      )}

      {selectedEntityForComments && (
        <AuditCommentsModal
          entityId={selectedEntityForComments.id}
          comments={comments}
          newCommentText={newCommentText}
          onNewCommentTextChange={setNewCommentText}
          isSubmittingComment={isSubmittingComment}
          onClose={() => setSelectedEntityForComments(null)}
          onPostComment={handlePostComment}
        />
      )}
    </div>
  );
};
