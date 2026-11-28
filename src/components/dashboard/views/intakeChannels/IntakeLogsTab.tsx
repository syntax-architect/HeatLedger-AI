import React from 'react';
import { MessageSquare, Mail, FileText } from 'lucide-react';
import { IntakeLog } from './types';

interface IntakeLogsTabProps {
  logs: IntakeLog[];
  onNavigateToWorkbench?: (documentId: string) => void;
}

export const IntakeLogsTab: React.FC<IntakeLogsTabProps> = ({
  logs,
  onNavigateToWorkbench,
}) => {
  return (
    <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
      <div className="px-5 py-4 border-b border-[#18181A]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-medium tracking-[-0.01em] text-[#18181A]">
            Recent Inbound Transmissions
          </h2>
          <p className="text-xs text-[#55544E]">
            Audit trail of incoming certificates received via WhatsApp and plant email channels.
          </p>
        </div>
        <span className="text-xs text-[#55544E] font-mono tabular-nums">
          {logs.length} entries
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#F7F5F0] border-b border-[#18181A]/10 text-[#55544E]">
            <tr>
              <th className="py-2.5 px-4 font-medium">Channel</th>
              <th className="py-2.5 px-4 font-medium">Sender</th>
              <th className="py-2.5 px-4 font-medium">File Type</th>
              <th className="py-2.5 px-4 font-medium">Status</th>
              <th className="py-2.5 px-4 font-medium">Automated Response</th>
              <th className="py-2.5 px-4 font-medium">Time</th>
              <th className="py-2.5 px-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#18181A]/10">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-[#F7F5F0] transition-colors duration-150">
                <td className="py-3 px-4">
                  {log.channel === 'WHATSAPP' ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-[#ECFDF5] text-[#047857] border border-emerald-200">
                      <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
                      WhatsApp
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-[#EFECE5] text-[#18181A] border border-[#18181A]/12">
                      <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Email
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 font-mono tabular-nums font-medium text-[#18181A]">
                  {log.sender}
                </td>
                <td className="py-3 px-4 font-mono text-[#55544E]">{log.message_type}</td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
                      log.status === 'PROCESSED'
                        ? 'bg-[#ECFDF5] text-[#047857] border-emerald-200'
                        : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                    }`}
                  >
                    {log.status === 'PROCESSED' ? 'Processed' : 'Unpaired Sender'}
                  </span>
                </td>
                <td
                  className="py-3 px-4 text-[#55544E] max-w-xs truncate"
                  title={log.reply_sent}
                >
                  {log.reply_sent || '—'}
                </td>
                <td className="py-3 px-4 font-mono tabular-nums text-[#55544E]">
                  {new Date(log.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="py-3 px-4 text-right">
                  {log.document_id ? (
                    <button
                      type="button"
                      onClick={() => onNavigateToWorkbench?.(log.document_id!)}
                      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[#18181A]/12 bg-[#FCFBF8] text-[#18181A] hover:border-[#059669] hover:text-[#047857] transition-colors duration-150 font-medium text-xs cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Review MTC
                    </button>
                  ) : (
                    <span className="text-[#78766E] text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
