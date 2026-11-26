import React from 'react';
import { AlertTriangle, FileSpreadsheet, UserPlus, X } from 'lucide-react';

interface ConsultantInviteModalProps {
  inviteName: string;
  onInviteNameChange: (v: string) => void;
  inviteCode: string;
  onInviteCodeChange: (v: string) => void;
  inviteGst: string;
  onInviteGstChange: (v: string) => void;
  inviteLocation: string;
  onInviteLocationChange: (v: string) => void;
  inviteRole: string;
  onInviteRoleChange: (v: string) => void;
  inviteDays: number;
  onInviteDaysChange: (v: number) => void;
  isSubmittingInvite: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ConsultantInviteModal: React.FC<ConsultantInviteModalProps> = ({
  inviteName,
  onInviteNameChange,
  inviteCode,
  onInviteCodeChange,
  inviteGst,
  onInviteGstChange,
  inviteLocation,
  onInviteLocationChange,
  inviteRole,
  onInviteRoleChange,
  inviteDays,
  onInviteDaysChange,
  isSubmittingInvite,
  onClose,
  onSubmit,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
    <div className="bg-[#FCFBF8] rounded-xl max-w-md w-full border border-[#18181A]/15 p-6 space-y-4 text-xs">
      <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          <h3 className="font-medium text-[#18181A] text-base">Invite Client Factory</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer"
          aria-label="Close invite modal"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3.5">
        <div className="space-y-1">
          <label className="font-medium text-[#18181A] block">Client Factory Legal Name</label>
          <input
            type="text"
            value={inviteName}
            onChange={(e) => onInviteNameChange(e.target.value)}
            placeholder="e.g. Asansol Steel Tubes Pvt Ltd"
            className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] focus:outline-none focus:border-[#059669]"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-medium text-[#18181A] block">Plant Identifier Code</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => onInviteCodeChange(e.target.value.toUpperCase())}
              placeholder="e.g. AST-01"
              className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono focus:outline-none focus:border-[#059669]"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-[#18181A] block">GSTIN or PAN</label>
            <input
              type="text"
              value={inviteGst}
              onChange={(e) => onInviteGstChange(e.target.value.toUpperCase())}
              placeholder="19AABCA1234A1Z1"
              className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono focus:outline-none focus:border-[#059669]"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="font-medium text-[#18181A] block">Location (City &amp; State)</label>
          <input
            type="text"
            value={inviteLocation}
            onChange={(e) => onInviteLocationChange(e.target.value)}
            placeholder="Asansol, West Bengal, India"
            className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] focus:outline-none focus:border-[#059669]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-medium text-[#18181A] block">Granted Access Role</label>
            <select
              value={inviteRole}
              onChange={(e) => onInviteRoleChange(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-medium focus:outline-none focus:border-[#059669]"
            >
              <option value="QA_CONSULTANT">QA Consultant</option>
              <option value="COMPLIANCE_MANAGER">Compliance Manager</option>
              <option value="AUDITOR_READONLY">Auditor (Read-Only)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-[#18181A] block">Grant Duration</label>
            <select
              value={inviteDays}
              onChange={(e) => onInviteDaysChange(Number(e.target.value))}
              className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-medium focus:outline-none focus:border-[#059669]"
            >
              <option value={90}>90 Days (Quarterly)</option>
              <option value={180}>180 Days (Semi-Annual)</option>
              <option value={365}>365 Days (1 Year)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#18181A]/10">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmittingInvite}
            className="h-9 px-4 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] font-medium cursor-pointer disabled:opacity-50"
          >
            {isSubmittingInvite ? 'Inviting...' : 'Send Access Grant'}
          </button>
        </div>
      </form>
    </div>
  </div>
);

interface ConsultantBulkCsvModalProps {
  bulkCsvText: string;
  onBulkCsvTextChange: (v: string) => void;
  isSubmittingBulk: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export const ConsultantBulkCsvModal: React.FC<ConsultantBulkCsvModalProps> = ({
  bulkCsvText,
  onBulkCsvTextChange,
  isSubmittingBulk,
  onClose,
  onSubmit,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
    <div className="bg-[#FCFBF8] rounded-xl max-w-lg w-full border border-[#18181A]/15 p-6 space-y-4 text-xs">
      <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          <h3 className="font-medium text-[#18181A] text-base">Bulk Client Onboarding via CSV</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer"
          aria-label="Close bulk onboarding modal"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <p className="text-[#55544E]">
        Paste or edit a comma-separated roster with columns: <br />
        <code className="text-[#047857] font-mono">
          client_name, plant_code, gst_or_pan, location, role, duration_days
        </code>
      </p>

      <textarea
        rows={6}
        value={bulkCsvText}
        onChange={(e) => onBulkCsvTextChange(e.target.value)}
        className="w-full p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono text-xs focus:outline-none focus:border-[#059669]"
      />

      <div className="flex justify-end gap-2 pt-2 border-t border-[#18181A]/10">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-4 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] font-medium cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmittingBulk || !bulkCsvText.trim()}
          className="h-9 px-4 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] font-medium cursor-pointer disabled:opacity-50"
        >
          {isSubmittingBulk ? 'Processing...' : 'Process Bulk Onboarding'}
        </button>
      </div>
    </div>
  </div>
);

interface ConsultantRevokeModalProps {
  plantId: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConsultantRevokeModal: React.FC<ConsultantRevokeModalProps> = ({
  plantId,
  onClose,
  onConfirm,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
    <div className="bg-[#FCFBF8] rounded-xl max-w-sm w-full border border-[#18181A]/15 p-6 space-y-4 text-xs">
      <div className="flex items-center gap-2 text-[#DC2626]">
        <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />
        <h3 className="font-medium text-[#18181A] text-base">Confirm Access Revocation</h3>
      </div>

      <p className="text-[#55544E] leading-relaxed">
        Are you sure you want to revoke consultant access for{' '}
        <strong className="font-medium text-[#18181A]">{plantId}</strong>? In conformance with
        Plant Data Sovereignty, all RLS cross-queries for this factory will immediately be rejected.
      </p>

      <div className="flex justify-end gap-2 pt-2 border-t border-[#18181A]/10">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-4 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] font-medium cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="h-9 px-4 rounded-lg bg-[#DC2626] hover:bg-red-700 text-white font-medium cursor-pointer"
        >
          Confirm Revocation
        </button>
      </div>
    </div>
  </div>
);
