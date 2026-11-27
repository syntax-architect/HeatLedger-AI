import React from 'react';
import { MessageSquare, Send, ShieldCheck, Sliders, X } from 'lucide-react';
import { AuditComment, AuditLogRecord } from '../../../../services/api';

interface AuditDiffModalProps {
  record: AuditLogRecord;
  onClose: () => void;
}

export const AuditDiffModal: React.FC<AuditDiffModalProps> = ({ record, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
    <div className="bg-[#FCFBF8] rounded-xl max-w-xl w-full border border-[#18181A]/15 p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
        <div>
          <h3 className="font-medium text-[#18181A] text-base flex items-center gap-2">
            <span>Audit Block #{record.sequence_number}</span>
            <span className="px-2 py-0.5 rounded-md bg-[#EFECE5] border border-[#18181A]/10 text-[#55544E] text-xs font-mono">
              {record.action}
            </span>
          </h3>
          <p className="text-xs text-[#55544E] font-mono mt-0.5">
            Entity: {record.entity_type} {record.entity_id}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer"
          aria-label="Close audit block inspector"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="space-y-1.5">
          <span className="font-medium text-[#55544E] block">State Before</span>
          <pre className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 font-mono text-xs text-[#18181A] whitespace-pre-wrap max-h-48 overflow-y-auto">
            {JSON.stringify(JSON.parse(record.before_state || '{}'), null, 2)}
          </pre>
        </div>

        <div className="space-y-1.5">
          <span className="font-medium text-[#047857] block">State After</span>
          <pre className="p-3 rounded-lg bg-[#ECFDF5]/60 border border-emerald-200 font-mono text-xs text-[#047857] whitespace-pre-wrap max-h-48 overflow-y-auto">
            {JSON.stringify(JSON.parse(record.after_state || '{}'), null, 2)}
          </pre>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-xs space-y-1 font-mono tabular-nums">
        <div className="text-[#55544E] truncate">Previous Block Hash: {record.previous_hash}</div>
        <div className="text-[#047857] font-medium truncate">
          Sealed Record Hash: {record.record_hash}
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-[#18181A]/10">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-4 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] font-medium text-xs cursor-pointer transition-colors duration-150"
        >
          Close Inspector
        </button>
      </div>
    </div>
  </div>
);

interface AuditConfigModalProps {
  smallPlantMode: boolean;
  onSmallPlantModeChange: (v: boolean) => void;
  requireSeparateReviewer: boolean;
  onRequireSeparateReviewerChange: (v: boolean) => void;
  isSavingConfig: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const AuditConfigModal: React.FC<AuditConfigModalProps> = ({
  smallPlantMode,
  onSmallPlantModeChange,
  requireSeparateReviewer,
  onRequireSeparateReviewerChange,
  isSavingConfig,
  onClose,
  onSave,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
    <div className="bg-[#FCFBF8] rounded-xl max-w-md w-full border border-[#18181A]/15 p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          <h3 className="font-medium text-[#18181A] text-base">Plant Maker-Checker Rules</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
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
              onChange={(e) => onSmallPlantModeChange(e.target.checked)}
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
              onChange={(e) => onRequireSeparateReviewerChange(e.target.checked)}
              className="w-4 h-4 accent-[#059669] cursor-pointer shrink-0"
            />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#ECFDF5] border border-emerald-200 text-[#047857] text-xs">
          <strong className="font-medium">Statutory Retention Policy:</strong> 10-year immutable
          audit retention configured in accordance with EN 10204:2004 Clause 6 and Regulation (EU)
          2023/956 Article 25.
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-[#18181A]/10">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-4 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] font-medium text-xs cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSavingConfig}
          className="h-9 px-4 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] font-medium text-xs cursor-pointer disabled:opacity-50 transition-colors duration-150"
        >
          {isSavingConfig ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  </div>
);

interface AuditLegalHoldModalProps {
  legalHoldReason: string;
  onReasonChange: (v: string) => void;
  isTogglingLegalHold: boolean;
  onClose: () => void;
  onToggleHold: (enable: boolean) => void;
}

export const AuditLegalHoldModal: React.FC<AuditLegalHoldModalProps> = ({
  legalHoldReason,
  onReasonChange,
  isTogglingLegalHold,
  onClose,
  onToggleHold,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
    <div className="bg-[#FCFBF8] rounded-xl max-w-md w-full border border-[#18181A]/15 p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#B45309]" strokeWidth={1.5} />
          <h3 className="font-medium text-[#18181A] text-base">Statutory Legal-Hold</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer"
          aria-label="Close legal hold modal"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <p className="text-xs text-[#55544E]">
        When Legal-Hold is activated, all soft and hard deletions across certificates, heats, and
        shipments are permanently locked.
      </p>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[#18181A]">Inquiry Reference / Reason</label>
        <textarea
          rows={3}
          value={legalHoldReason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="e.g. European Commission CBAM verifier audit notice #AUD-2026-EU..."
          className="w-full px-3 py-2 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
        />
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-[#18181A]/10">
        <button
          type="button"
          onClick={() => onToggleHold(false)}
          disabled={isTogglingLegalHold}
          className="h-9 px-3.5 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-[#18181A] font-medium text-xs cursor-pointer hover:bg-[#EFECE5]"
        >
          Release Hold
        </button>

        <button
          type="button"
          onClick={() => onToggleHold(true)}
          disabled={isTogglingLegalHold}
          className="h-9 px-4 rounded-lg bg-[#DC2626] hover:bg-red-700 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
        >
          {isTogglingLegalHold ? 'Locking...' : 'Activate Legal-Hold'}
        </button>
      </div>
    </div>
  </div>
);

interface AuditCommentsModalProps {
  entityId: string;
  comments: AuditComment[];
  newCommentText: string;
  onNewCommentTextChange: (v: string) => void;
  isSubmittingComment: boolean;
  onClose: () => void;
  onPostComment: () => void;
}

export const AuditCommentsModal: React.FC<AuditCommentsModalProps> = ({
  entityId,
  comments,
  newCommentText,
  onNewCommentTextChange,
  isSubmittingComment,
  onClose,
  onPostComment,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
    <div className="bg-[#FCFBF8] rounded-xl max-w-lg w-full border border-[#18181A]/15 p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          <h3 className="font-medium text-[#18181A] text-base">Audit Notes: {entityId}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
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
              <p className="text-[#18181A] whitespace-pre-wrap">{c.comment_text}</p>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-[#55544E]">Mention:</span>
        {['@Chatterjee (QA_INSPECTOR)', '@Sharma (QA)', '@Director'].map((pill) => (
          <button
            key={pill}
            type="button"
            onClick={() => onNewCommentTextChange(`${newCommentText} ${pill.split(' ')[0]} `)}
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
          onChange={(e) => onNewCommentTextChange(e.target.value)}
          placeholder="Write audit note or @mention colleague..."
          className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
        />
        <button
          type="button"
          onClick={onPostComment}
          disabled={isSubmittingComment || !newCommentText.trim()}
          className="h-9 px-3 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] transition-colors duration-150 disabled:opacity-50 cursor-pointer shrink-0 flex items-center justify-center"
        >
          <Send className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  </div>
);
