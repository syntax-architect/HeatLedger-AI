import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { useToast } from '../../../ui/ToastContext';

interface WorkbenchBottomBarProps {
  isOffSpec: boolean;
  canApprove: boolean;
  unconfirmedCount: number;
  heatNumber: string;
  onReject: () => void;
  onRequestScan: () => void;
  onApprove: () => void;
  onProceedToStep3: () => void;
}

export const WorkbenchBottomBar: React.FC<WorkbenchBottomBarProps> = ({
  isOffSpec,
  canApprove,
  unconfirmedCount,
  heatNumber,
  onReject,
  onRequestScan,
  onApprove,
  onProceedToStep3,
}) => {
  return (
    <div className="sticky bottom-2 z-20 px-4 py-3 bg-[#FCFBF8]/95 backdrop-blur-md border border-[#18181A]/15 rounded-xl flex flex-wrap items-center justify-between gap-3">
      <div className="text-xs flex items-center gap-2">
        <span className="text-[#55544E]">Inspection Status:</span>
        {isOffSpec ? (
          <span className="font-medium text-[#DC2626]">
            Blocked · Out-of-spec chemistry detected
          </span>
        ) : canApprove ? (
          <span className="font-medium text-[#047857]">All Fields Checked · Ready to Sign</span>
        ) : (
          <span className="font-medium text-[#B45309]">
            Inspection Status: {unconfirmedCount} field(s) require inspector review
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        <button
          type="button"
          onClick={onReject}
          className="flex-1 sm:flex-initial h-9 px-3.5 rounded-lg bg-[#FEF2F2] hover:bg-red-100 border border-[#FECACA] text-[#DC2626] text-xs font-medium transition-colors duration-150 cursor-pointer"
        >
          Reject MTC
        </button>

        <button
          type="button"
          onClick={onRequestScan}
          className="flex-1 sm:flex-initial h-9 px-3.5 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] text-xs font-medium transition-colors duration-150 cursor-pointer"
        >
          Request New Scan
        </button>

        <button
          type="button"
          disabled={!canApprove}
          onClick={onApprove}
          className="flex-1 sm:flex-initial h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
          <span>Approve MTC</span>
        </button>

        {canApprove && (
          <button
            type="button"
            onClick={onProceedToStep3}
            className="flex-1 sm:flex-initial h-9 px-4 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer"
          >
            <span>Add to Shipment (Step 3)</span>
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
};
