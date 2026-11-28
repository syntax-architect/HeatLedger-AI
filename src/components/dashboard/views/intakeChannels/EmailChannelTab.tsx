import React, { useState } from 'react';
import { Mail, Copy, Check, Plus, X, CheckCircle2 } from 'lucide-react';
import { EmailConfig } from './types';

interface EmailChannelTabProps {
  emailConfig: EmailConfig;
  copiedKey: string | null;
  onToggleActive: () => void;
  onCopy: (text: string, key: string) => void;
  onAddDomain: (domain: string) => void;
  onRemoveDomain: (domain: string) => void;
}

export const EmailChannelTab: React.FC<EmailChannelTabProps> = ({
  emailConfig,
  copiedKey,
  onToggleActive,
  onCopy,
  onAddDomain,
  onRemoveDomain,
}) => {
  const [newAllowItem, setNewAllowItem] = useState('');

  const handleAdd = () => {
    if (!newAllowItem.trim()) return;
    onAddDomain(newAllowItem.trim());
    setNewAllowItem('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Email Address Card */}
        <div className="bg-[#FCFBF8] p-5 sm:p-6 rounded-xl border border-[#18181A]/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-medium tracking-[-0.01em] text-[#18181A]">
                Dedicated Plant Inbound Address
              </h2>
              <p className="text-xs text-[#55544E] mt-0.5">
                Forward supplier emails or mill dispatch notices containing PDF certificates to this address.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
                  emailConfig.is_active
                    ? 'bg-[#ECFDF5] text-[#047857] border-emerald-200'
                    : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                }`}
              >
                {emailConfig.is_active ? 'Active' : 'Paused'}
              </span>
              <button
                type="button"
                onClick={onToggleActive}
                className="h-8 px-3 text-xs font-medium rounded-lg border border-[#18181A]/12 bg-[#FCFBF8] text-[#18181A] hover:bg-[#EFECE5] transition-colors duration-150 cursor-pointer"
              >
                {emailConfig.is_active ? 'Pause Intake' : 'Resume Intake'}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <Mail className="w-4 h-4 text-[#059669] shrink-0" strokeWidth={1.5} />
              <span className="font-mono text-sm text-[#18181A] font-medium select-all truncate">
                {emailConfig.inbound_email}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onCopy(emailConfig.inbound_email, 'email')}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-[#059669] text-white hover:bg-[#047857] transition-colors duration-150 shrink-0 cursor-pointer"
            >
              {copiedKey === 'email' ? (
                <Check className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <Copy className="w-4 h-4" strokeWidth={1.5} />
              )}
              {copiedKey === 'email' ? 'Copied' : 'Copy Address'}
            </button>
          </div>
        </div>

        {/* Sender Allow-List Configuration */}
        <div className="bg-[#FCFBF8] p-5 sm:p-6 rounded-xl border border-[#18181A]/10 space-y-4">
          <div>
            <h2 className="text-base font-medium tracking-[-0.01em] text-[#18181A]">
              Sender Allow-List &amp; Anti-Spam Filter
            </h2>
            <p className="text-xs text-[#55544E] mt-0.5">
              Only messages matching approved domains or exact addresses are ingested into the document queue.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="e.g. @tatasteel.com or dispatch@jsw.in"
              value={newAllowItem}
              onChange={(e) => setNewAllowItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="flex-1 h-9 px-3 text-xs font-mono rounded-lg border border-[#18181A]/12 bg-[#F7F5F0] text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669]"
            />
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-lg bg-[#059669] text-white hover:bg-[#047857] transition-colors duration-150 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              Add to Allow-List
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {emailConfig.allow_list.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-mono bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A]"
              >
                <span>{item}</span>
                <button
                  type="button"
                  onClick={() => onRemoveDomain(item)}
                  className="text-[#55544E] hover:text-[#DC2626] transition-colors cursor-pointer"
                  aria-label={`Remove ${item}`}
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Processing Pipeline */}
      <div className="space-y-6">
        <div className="bg-[#FCFBF8] p-5 sm:p-6 rounded-xl border border-[#18181A]/10 space-y-4">
          <h2 className="text-base font-medium tracking-[-0.01em] text-[#18181A]">
            Automated Sanitation Pipeline
          </h2>
          <ul className="space-y-3.5 text-xs text-[#55544E]">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" strokeWidth={1.5} />
              <span>
                <strong className="text-[#18181A] font-medium">Tracking Pixel Stripping:</strong> 1x1 GIF and PNG beacons are stripped automatically on receipt.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" strokeWidth={1.5} />
              <span>
                <strong className="text-[#18181A] font-medium">Magic Byte Validation:</strong> Only verified PDF, JPG, PNG, and HEIC files pass into storage.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" strokeWidth={1.5} />
              <span>
                <strong className="text-[#18181A] font-medium">EN 10204 Clause 6 Integrity:</strong> Byte-identical original preservation in read-only storage with tamper-evident SHA-256 verification.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
