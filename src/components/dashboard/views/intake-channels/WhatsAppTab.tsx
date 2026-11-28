import React from 'react';
import { ShieldCheck, Copy, Check, Trash2, RefreshCw } from 'lucide-react';

export interface PhonePairing {
  id: string;
  phone_number: string;
  plant_id: string;
  user_id: string;
  pairing_code: string;
  is_verified: number;
  is_opted_out: number;
  created_at: string;
}

interface WhatsAppTabProps {
  pairings: PhonePairing[];
  generatedCode: { code: string; phone: string; instruction: string } | null;
  isGenerating: boolean;
  copiedKey: string | null;
  monthlyBudget: number;
  onGeneratePairing: () => void;
  onCopy: (text: string, key: string) => void;
  onUnlink: (pairingId: string) => void;
}

export const WhatsAppTab: React.FC<WhatsAppTabProps> = ({
  pairings,
  generatedCode,
  isGenerating,
  copiedKey,
  monthlyBudget,
  onGeneratePairing,
  onCopy,
  onUnlink,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-[#FCFBF8] p-5 sm:p-6 rounded-xl border border-[#18181A]/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-medium tracking-[-0.01em] text-[#18181A]">
                Linked Staff Phone Numbers
              </h2>
              <p className="text-xs text-[#55544E] mt-0.5">
                Generate a 6-digit one-time pairing code to authorize a plant operator&apos;s WhatsApp number.
              </p>
            </div>
            <button
              type="button"
              onClick={onGeneratePairing}
              disabled={isGenerating}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-lg bg-[#059669] text-white hover:bg-[#047857] transition-colors duration-150 disabled:opacity-50 shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} strokeWidth={1.5} />
              Generate 6-Digit Code
            </button>
          </div>

          {generatedCode && (
            <div className="p-4 rounded-xl bg-[#ECFDF5] border border-emerald-200 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#047857]">Active One-Time Pairing Code</span>
                <span className="text-[#047857] font-mono tabular-nums">Expires in 24h</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl font-mono font-medium tracking-[0.2em] tabular-nums text-[#18181A] bg-[#FCFBF8] border border-emerald-200 px-3.5 py-1.5 rounded-lg">
                  {generatedCode.code}
                </span>
                <button
                  type="button"
                  onClick={() => onCopy(`PAIR ${generatedCode.code}`, 'code')}
                  className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-lg bg-[#FCFBF8] border border-emerald-200 text-[#047857] hover:bg-emerald-50 transition-colors duration-150 cursor-pointer"
                >
                  {copiedKey === 'code' ? (
                    <Check className="w-4 h-4" strokeWidth={1.5} />
                  ) : (
                    <Copy className="w-4 h-4" strokeWidth={1.5} />
                  )}
                  {copiedKey === 'code' ? 'Copied' : 'Copy WhatsApp Command'}
                </button>
              </div>
              <p className="text-[#047857]">{generatedCode.instruction}</p>
            </div>
          )}

          <div className="border border-[#18181A]/10 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F7F5F0] border-b border-[#18181A]/10 text-[#55544E]">
                <tr>
                  <th className="py-2.5 px-3.5 font-medium">Phone Number</th>
                  <th className="py-2.5 px-3.5 font-medium">Linked Plant</th>
                  <th className="py-2.5 px-3.5 font-medium">Status</th>
                  <th className="py-2.5 px-3.5 font-medium">Linked Date</th>
                  <th className="py-2.5 px-3.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181A]/10 bg-[#FCFBF8]">
                {pairings.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F7F5F0] transition-colors duration-150">
                    <td className="py-3 px-3.5 font-mono tabular-nums font-medium text-[#18181A]">
                      {p.phone_number}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-[#55544E]">{p.plant_id}</td>
                    <td className="py-3 px-3.5">
                      {p.is_opted_out ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                          Opted Out
                        </span>
                      ) : p.is_verified ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#ECFDF5] text-[#047857] border border-emerald-200">
                          Active &amp; Checked
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#EFECE5] text-[#18181A] border border-[#18181A]/12">
                          Pending Code
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 font-mono tabular-nums text-[#55544E]">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => onUnlink(p.id)}
                        className="p-1.5 text-[#55544E] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors cursor-pointer"
                        title="Unlink Phone"
                        aria-label={`Unlink ${p.phone_number}`}
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </td>
                  </tr>
                ))}
                {pairings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#55544E]">
                      No phone numbers linked yet. Click &ldquo;Generate 6-Digit Code&rdquo; above to connect staff.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#FCFBF8] p-5 sm:p-6 rounded-xl border border-[#18181A]/10 space-y-4">
          <h2 className="text-base font-medium tracking-[-0.01em] text-[#18181A]">
            Shop-Floor WhatsApp Ingestion Flow
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
            <div className="p-3.5 rounded-lg border border-[#18181A]/10 bg-[#F7F5F0] space-y-1.5">
              <div className="font-medium text-[#18181A] flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-[#ECFDF5] border border-emerald-200 text-[#047857] flex items-center justify-center font-mono font-medium">
                  1
                </span>
                Snap MTC Photo
              </div>
              <p className="text-[#55544E] leading-relaxed">
                Operator photographs the physical EN 10204 3.1 certificate at the receiving bay or weighbridge.
              </p>
            </div>
            <div className="p-3.5 rounded-lg border border-[#18181A]/10 bg-[#F7F5F0] space-y-1.5">
              <div className="font-medium text-[#18181A] flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-[#ECFDF5] border border-emerald-200 text-[#047857] flex items-center justify-center font-mono font-medium">
                  2
                </span>
                Preserve Original
              </div>
              <p className="text-[#55544E] leading-relaxed">
                Message routes to the plant WhatsApp endpoint for byte-identical original preservation with a tamper-evident SHA-256 hash.
              </p>
            </div>
            <div className="p-3.5 rounded-lg border border-[#18181A]/10 bg-[#F7F5F0] space-y-1.5">
              <div className="font-medium text-[#18181A] flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-[#ECFDF5] border border-emerald-200 text-[#047857] flex items-center justify-center font-mono font-medium">
                  3
                </span>
                Instant Review Link
              </div>
              <p className="text-[#55544E] leading-relaxed">
                Automated reply inside the 24-hour service window delivers a direct workbench link to check chemistry and mechanical values.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-[#FCFBF8] p-5 sm:p-6 rounded-xl border border-[#18181A]/10 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
            <h2 className="text-base font-medium tracking-[-0.01em] text-[#18181A]">
              Meta Cloud API Cost Guard
            </h2>
          </div>
          <div className="space-y-3 text-xs text-[#55544E]">
            <div className="p-3.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 space-y-1">
              <div className="font-medium text-[#18181A]">24-Hour Service Window</div>
              <p className="leading-relaxed">
                Inbound uploads and automated status replies within 24 hours incur{' '}
                <span className="font-medium text-[#047857]">zero template fees</span> under Meta Cloud API guidelines.
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 space-y-1">
              <div className="font-medium text-[#18181A]">Utility &amp; Alert Cap</div>
              <p className="leading-relaxed">
                Outbound reminders outside 24 hours cost approx. INR{' '}
                <span className="font-mono tabular-nums text-[#18181A]">0.12 – 0.35</span> per message. Alerts are hard-capped at{' '}
                <span className="font-mono tabular-nums text-[#18181A]">{monthlyBudget}/month</span>.
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 space-y-1">
              <div className="font-medium text-[#18181A]">Opt-Out Controls</div>
              <p className="leading-relaxed">
                Staff can reply{' '}
                <code className="font-mono bg-[#FCFBF8] border border-[#18181A]/12 text-[#18181A] px-1.5 py-0.5 rounded">
                  STOP
                </code>{' '}
                at any time to pause messages, or{' '}
                <code className="font-mono bg-[#FCFBF8] border border-[#18181A]/12 text-[#18181A] px-1.5 py-0.5 rounded">
                  START
                </code>{' '}
                to re-enable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
