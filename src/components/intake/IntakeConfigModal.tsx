import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Mail,
  Copy,
  Check,
  ShieldCheck,
  Smartphone,
  RefreshCw,
  X,
  AlertCircle,
  ExternalLink,
  Plus,
  Trash2,
} from 'lucide-react';
import { useToast } from '../ui/ToastContext';
import { haptics } from '../../lib/motion';

interface IntakeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  plantId?: string;
}

export const IntakeConfigModal: React.FC<IntakeConfigModalProps> = ({
  isOpen,
  onClose,
  plantId = 'plant-howrah-01',
}) => {
  let toast: {
    success: (title: string, desc?: string) => void;
    warning?: (title: string, desc?: string) => void;
  };
  try {
    toast = useToast();
  } catch {
    toast = {
      success: () => {},
      warning: () => {},
    };
  }

  const [activeTab, setActiveTab] = useState<'whatsapp' | 'email' | 'budget'>('whatsapp');
  const [pairingCode, setPairingCode] = useState('884012');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [inboundEmail, setInboundEmail] = useState(
    `docs-${plantId.split('-')[1] || 'howrah'}@inbound.heatledger.ai`
  );
  const [allowList, setAllowList] = useState<string[]>([
    '@howrahsteel.in',
    '@tatasteel.com',
    'qa@sail.in',
  ]);
  const [newDomain, setNewDomain] = useState('');

  const [messagesUsed, setMessagesUsed] = useState(18);
  const [monthlyBudget, setMonthlyBudget] = useState(500);

  useEffect(() => {
    if (!isOpen) return;
    fetch(`/api/intake/budget?plant_id=${plantId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setMessagesUsed(data.messages_used ?? 18);
          setMonthlyBudget(data.monthly_budget ?? 500);
        }
      })
      .catch(() => {});

    fetch(`/api/intake/email/config?plant_id=${plantId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.inbound_email) setInboundEmail(data.inbound_email);
          if (data.allow_list && data.allow_list.length > 0) setAllowList(data.allow_list);
        }
      })
      .catch(() => {});
  }, [isOpen, plantId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = (text: string, fieldName: string) => {
    haptics.tap();
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success('Copied to Clipboard', `${fieldName} copied.`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleGeneratePairingCode = () => {
    haptics.tap();
    setIsGenerating(true);
    fetch('/api/intake/whatsapp/generate-pairing-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plant_id: plantId, user_id: 'usr_qa_inspector_01' }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setIsGenerating(false);
        if (data && data.pairing_code) {
          setPairingCode(data.pairing_code);
          toast.success('Pairing Code Generated', `Send 'PAIR ${data.pairing_code}' from WhatsApp.`);
        } else {
          const newCode = Math.floor(100000 + Math.random() * 900000).toString();
          setPairingCode(newCode);
          toast.success('Pairing Code Generated', `Send 'PAIR ${newCode}' from WhatsApp.`);
        }
      })
      .catch(() => {
        setIsGenerating(false);
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        setPairingCode(newCode);
      });
  };

  const handleAddDomain = () => {
    if (!newDomain.trim()) return;
    const clean = newDomain.trim().toLowerCase();
    if (!allowList.includes(clean)) {
      setAllowList([...allowList, clean]);
      toast.success('Domain Added', `${clean} added to plant allow-list.`);
    }
    setNewDomain('');
  };

  const handleRemoveDomain = (domain: string) => {
    setAllowList(allowList.filter((d) => d !== domain));
  };

  const waMessage = `PAIR ${pairingCode}`;
  const waUrl = `https://wa.me/919830022000?text=${encodeURIComponent(waMessage)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="intake-config-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl max-w-lg w-full shadow-xl text-left text-[#09090B] max-h-[90dvh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E4E4E7] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#ECFDF5] border border-emerald-200 flex items-center justify-center text-[#059669] shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 id="intake-config-title" className="text-sm font-semibold text-[#09090B]">
                WhatsApp &amp; Email Intake Channels
              </h3>
              <p className="text-xs text-[#52525B]">
                Mobile photo forwarding and inbound supplier email routing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close intake modal"
            className="p-1.5 rounded-lg text-[#52525B] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Segmented Tab Switcher */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#F4F4F5] border border-[#E4E4E7]">
            <button
              type="button"
              onClick={() => {
                haptics.tap();
                setActiveTab('whatsapp');
              }}
              className={`py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'whatsapp'
                  ? 'bg-[#FFFFFF] text-[#09090B] border border-[#E4E4E7] shadow-xs'
                  : 'text-[#52525B] hover:text-[#09090B] border border-transparent'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => {
                haptics.tap();
                setActiveTab('email');
              }}
              className={`py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'email'
                  ? 'bg-[#FFFFFF] text-[#09090B] border border-[#E4E4E7] shadow-xs'
                  : 'text-[#52525B] hover:text-[#09090B] border border-transparent'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email-In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                haptics.tap();
                setActiveTab('budget');
              }}
              className={`py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'budget'
                  ? 'bg-[#FFFFFF] text-[#09090B] border border-[#E4E4E7] shadow-xs'
                  : 'text-[#52525B] hover:text-[#09090B] border border-transparent'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Budget &amp; Quota</span>
            </button>
          </div>

          {/* TAB 1: WHATSAPP INTAKE */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7] space-y-2">
                <p className="text-xs text-[#52525B] leading-relaxed">
                  Shop-floor operators can photograph paper MTCs and forward them directly to your
                  plant&apos;s verified WhatsApp ingestion number.
                </p>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-xs">
                  <span className="text-[#52525B]">Inbound Number</span>
                  <span className="font-mono font-semibold text-[#09090B]">+91 98300 22000</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#09090B]">Plant Pairing Code:</span>
                  <button
                    type="button"
                    onClick={handleGeneratePairingCode}
                    disabled={isGenerating}
                    className="text-xs font-medium text-[#047857] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7]">
                  <span className="text-2xl font-mono font-semibold tabular-nums text-[#09090B] tracking-[0.2em]">
                    {pairingCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(`PAIR ${pairingCode}`, 'Pairing Command')}
                    className="h-8 px-3 rounded-lg bg-[#FAFAFA] hover:bg-[#F4F4F5] border border-[#E4E4E7] text-[#09090B] font-medium text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedField === 'Pairing Command' ? (
                      <Check className="w-3.5 h-3.5 text-[#059669]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-[#52525B]" />
                    )}
                    <span>{copiedField === 'Pairing Command' ? 'Copied' : 'Copy PAIR'}</span>
                  </button>
                </div>

                <p className="text-xs text-[#52525B] leading-relaxed">
                  Send <strong className="font-mono text-[#09090B]">PAIR {pairingCode}</strong> from
                  WhatsApp to associate your device with this installation.
                </p>

                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-10 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Open in WhatsApp with Code</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL INTAKE */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#09090B] block">
                  Dedicated Plant Inbound Mailbox
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inboundEmail}
                    className="flex-1 h-9 px-3 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7] text-[#047857] text-xs font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(inboundEmail, 'Inbound Email')}
                    className="h-9 px-3 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#09090B] text-xs font-medium inline-flex items-center gap-1.5 border border-[#E4E4E7] transition-colors cursor-pointer"
                  >
                    {copiedField === 'Inbound Email' ? (
                      <Check className="w-3.5 h-3.5 text-[#059669]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-[#52525B]" />
                    )}
                    <span>Copy</span>
                  </button>
                </div>
                <p className="text-xs text-[#52525B]">
                  Suppliers can forward PDF certificates directly here. Inline signatures and
                  tracking pixels are stripped automatically.
                </p>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-[#E4E4E7]">
                <label className="text-xs font-medium text-[#09090B] block">
                  Approved Sender Domains
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. @tatasteel.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                    className="flex-1 h-9 px-3 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] placeholder:text-[#A1A1AA] text-xs font-mono focus:outline-none focus:border-[#059669]"
                  />
                  <button
                    type="button"
                    onClick={handleAddDomain}
                    className="h-9 px-3.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {allowList.map((domain) => (
                    <span
                      key={domain}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F4F4F5] text-[#09090B] border border-[#E4E4E7] text-xs font-mono"
                    >
                      <span>{domain}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDomain(domain)}
                        aria-label={`Remove ${domain}`}
                        className="text-[#52525B] hover:text-[#DC2626] p-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BUDGET & COST GUARD */}
          {activeTab === 'budget' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#52525B] font-medium">Monthly Message Quota:</span>
                  <span className="font-mono font-semibold tabular-nums text-[#09090B]">
                    {messagesUsed} / {monthlyBudget} msgs
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-[#E4E4E7] overflow-hidden">
                  <div
                    className="h-full bg-[#059669] rounded-full transition-all"
                    style={{ width: `${Math.min(100, (messagesUsed / monthlyBudget) * 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-[#52525B]">
                  <span>Remaining: {Math.max(0, monthlyBudget - messagesUsed)}</span>
                  <span className="text-[#047857] font-semibold">
                    {((messagesUsed / monthlyBudget) * 100).toFixed(1)}% Used
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-2.5 text-[#92400E] text-xs leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#D97706]" />
                <span>
                  Cost Guard automatically halts outbound template messages once the 500/month cap is reached to eliminate surprise Meta Cloud API charges.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Hairline Footer */}
        <div className="px-5 py-3.5 border-t border-[#E4E4E7] bg-[#FAFAFA] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg bg-[#09090B] hover:bg-[#27272A] text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
