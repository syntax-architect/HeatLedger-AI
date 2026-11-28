import React from 'react';
import { MessageSquare, X, Copy, Check } from 'lucide-react';
import { useToast } from '../../../ui/ToastContext';

export interface ReminderModalData {
  requestId: string;
  supplierName: string;
  productName: string;
  deadline: string;
  token: string;
  whatsappMsg?: string;
}

interface ReminderNoticeModalProps {
  data: ReminderModalData;
  onClose: () => void;
}

export const ReminderNoticeModal: React.FC<ReminderNoticeModalProps> = ({
  data,
  onClose,
}) => {
  const toast = useToast();
  const [copiedToken, setCopiedToken] = React.useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken('whatsapp');
    toast.success('Copied to Clipboard', 'WhatsApp reminder text copied.');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0D0E11]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FCFBF8] border border-[#18181A]/15 rounded-xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3.5">
          <h3 className="text-base font-medium text-[#18181A] flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-700" strokeWidth={1.5} />
            <span>Supplier Reminder Dispatched</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
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
          {data.whatsappMsg}
        </pre>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#18181A]/10">
          <button
            type="button"
            onClick={() => {
              if (data.whatsappMsg) {
                handleCopy(data.whatsappMsg);
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
            onClick={onClose}
            className="h-9 px-3.5 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] border border-[#18181A]/15 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
