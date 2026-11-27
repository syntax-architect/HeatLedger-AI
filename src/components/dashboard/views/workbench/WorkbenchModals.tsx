import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface WorkbenchQuickEditModalProps {
  editValue: string;
  onEditValueChange: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export const WorkbenchQuickEditModal: React.FC<WorkbenchQuickEditModalProps> = ({
  editValue,
  onEditValueChange,
  onClose,
  onSave,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
    <div className="bg-[#FCFBF8] border border-[#18181A]/15 rounded-xl max-w-sm w-full p-5 space-y-4 text-left">
      <div>
        <h4 className="text-sm font-medium text-[#18181A]">Correct Extracted Value</h4>
        <p className="text-xs text-[#55544E] mt-1">
          The audit log records your inspector ID alongside the original OCR reading.
        </p>
      </div>
      <input
        type="text"
        value={editValue}
        onChange={(e) => onEditValueChange(e.target.value)}
        className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] font-mono tabular-nums text-sm focus:outline-none focus:border-[#059669]"
        autoFocus
      />
      <div className="flex justify-end gap-2 pt-2 border-t border-[#18181A]/10">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-3.5 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-xs font-medium text-[#18181A] cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="h-9 px-3.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-xs font-medium text-white cursor-pointer"
        >
          Save &amp; Confirm
        </button>
      </div>
    </div>
  </div>
);

interface WorkbenchRejectModalProps {
  rejectReason: string;
  onRejectReasonChange: (v: string) => void;
  onClose: () => void;
  onConfirmReject: () => void;
}

export const WorkbenchRejectModal: React.FC<WorkbenchRejectModalProps> = ({
  rejectReason,
  onRejectReasonChange,
  onClose,
  onConfirmReject,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
    <div className="bg-[#FCFBF8] border border-[#18181A]/15 rounded-xl max-w-md w-full p-5 space-y-4 text-left">
      <div className="flex items-center gap-2 text-[#DC2626] font-medium text-sm">
        <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
        <span>Reject Certificate with Audit Reason</span>
      </div>
      <p className="text-xs text-[#55544E]">
        Enter the non-conformance details to include in the supplier amendment notice.
      </p>
      <textarea
        rows={3}
        value={rejectReason}
        onChange={(e) => onRejectReasonChange(e.target.value)}
        placeholder="e.g. Molybdenum below minimum limit of 0.15% per ASTM A193 B7."
        className="w-full px-3 py-2 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs focus:outline-none focus:border-[#DC2626] resize-none"
      />
      <div className="flex justify-end gap-2 pt-2 border-t border-[#18181A]/10">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-3.5 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-xs font-medium text-[#18181A] cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirmReject}
          className="h-9 px-3.5 rounded-lg bg-[#DC2626] hover:bg-red-700 text-xs font-medium text-white cursor-pointer"
        >
          Confirm Rejection
        </button>
      </div>
    </div>
  </div>
);
