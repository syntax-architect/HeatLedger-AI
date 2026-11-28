import React, { useState } from 'react';
import {
  MessageSquare,
  Mail,
  ListFilter,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '../../ui/ToastContext';
import {
  PhonePairing,
  EmailConfig,
  IntakeLog,
  INITIAL_PHONE_PAIRINGS,
  INITIAL_EMAIL_CONFIG,
  INITIAL_INTAKE_LOGS,
} from './intakeChannels/types';
import { WhatsAppChannelTab } from './intakeChannels/WhatsAppChannelTab';
import { EmailChannelTab } from './intakeChannels/EmailChannelTab';
import { IntakeLogsTab } from './intakeChannels/IntakeLogsTab';

export type { PhonePairing, EmailConfig, IntakeLog };

interface IntakeChannelsViewProps {
  onNavigateToWorkbench?: (documentId: string) => void;
}

export const IntakeChannelsView: React.FC<IntakeChannelsViewProps> = ({ onNavigateToWorkbench }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'email' | 'logs'>('whatsapp');

  // WhatsApp Pairings State
  const [pairings, setPairings] = useState<PhonePairing[]>(INITIAL_PHONE_PAIRINGS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<{ code: string; instruction: string } | null>(null);

  // Email Config State
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(INITIAL_EMAIL_CONFIG);

  // Transmission Logs State
  const [logs] = useState<IntakeLog[]>(INITIAL_INTAKE_LOGS);

  // Meta API monthly utility budget
  const [budget] = useState({
    monthly_budget: '500 msgs (Free Tier Active)',
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to Clipboard', text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGeneratePairing = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/intake/whatsapp/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plant_id: 'PLANT-KOL-01' }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedCode({
          code: data.code,
          instruction: data.instruction || 'Send PAIR <code> to the plant WhatsApp line to link your number.',
        });
        toast.success('Pairing Code Generated', `Code: ${data.code}`);
      } else {
        const fallbackCode = String(Math.floor(100000 + Math.random() * 900000));
        setGeneratedCode({
          code: fallbackCode,
          instruction: `Send PAIR ${fallbackCode} to the plant WhatsApp line to link your number.`,
        });
        toast.success('Pairing Code Generated', `Code: ${fallbackCode}`);
      }
    } catch {
      const fallbackCode = String(Math.floor(100000 + Math.random() * 900000));
      setGeneratedCode({
        code: fallbackCode,
        instruction: `Send PAIR ${fallbackCode} to the plant WhatsApp line to link your number.`,
      });
      toast.success('Pairing Code Generated', `Code: ${fallbackCode}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUnlink = (id: string) => {
    setPairings((prev) => prev.filter((p) => p.id !== id));
    toast.success('Phone Unlinked', 'Operator number removed from authorized list.');
  };

  const handleToggleEmailActive = () => {
    setEmailConfig((prev) => {
      const nextState = !prev.is_active;
      toast.success(
        nextState ? 'Intake Resumed' : 'Intake Paused',
        nextState ? 'Inbound address is accepting new emails.' : 'Inbound address paused.'
      );
      return { ...prev, is_active: nextState };
    });
  };

  const handleAddAllowDomain = (domain: string) => {
    let clean = domain.trim().toLowerCase();
    if (!clean) return;
    if (!clean.startsWith('@') && !clean.includes('.')) {
      clean = `@${clean}`;
    }
    if (emailConfig.allow_list.includes(clean)) {
      toast.error('Already in Allow-List', clean);
      return;
    }
    setEmailConfig((prev) => ({
      ...prev,
      allow_list: [...prev.allow_list, clean],
    }));
    toast.success('Domain Added', `Added ${clean} to sender allow-list.`);
  };

  const handleRemoveAllowDomain = (domain: string) => {
    setEmailConfig((prev) => ({
      ...prev,
      allow_list: prev.allow_list.filter((d) => d !== domain),
    }));
    toast.success('Domain Removed', `Removed ${domain} from allow-list.`);
  };

  return (
    <div className="space-y-6 font-sans text-left text-[#18181A]">
      {/* Header and Live Status Bar */}
      <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-medium tracking-[-0.02em] text-[#18181A] flex items-center gap-2">
            <span>Automated Intake Channels</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#047857] border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              Meta Cloud &amp; Inbound Ready
            </span>
          </h1>
          <p className="text-xs text-[#55544E] mt-1">
            Accept physical MTC snapshots via WhatsApp Business and raw PDF files via plant email.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#EFECE5] border border-[#18181A]/10 self-start lg:self-center">
          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                : 'text-[#55544E] hover:text-[#18181A] border border-transparent'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>WhatsApp Cloud</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer ${
              activeTab === 'email'
                ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                : 'text-[#55544E] hover:text-[#18181A] border border-transparent'
            }`}
          >
            <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Plant Email-In</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                : 'text-[#55544E] hover:text-[#18181A] border border-transparent'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Activity Logs ({logs.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: WhatsApp Cloud Intake */}
      {activeTab === 'whatsapp' && (
        <WhatsAppChannelTab
          pairings={pairings}
          isGenerating={isGenerating}
          generatedCode={generatedCode}
          copiedKey={copiedKey}
          budget={budget}
          onGeneratePairing={handleGeneratePairing}
          onCopy={copyToClipboard}
          onUnlink={handleUnlink}
        />
      )}

      {/* Tab 2: Plant Email-In Ingestion */}
      {activeTab === 'email' && (
        <EmailChannelTab
          emailConfig={emailConfig}
          copiedKey={copiedKey}
          onToggleActive={handleToggleEmailActive}
          onCopy={copyToClipboard}
          onAddDomain={handleAddAllowDomain}
          onRemoveDomain={handleRemoveAllowDomain}
        />
      )}

      {/* Tab 3: Unified Transmission Logs */}
      {activeTab === 'logs' && (
        <IntakeLogsTab logs={logs} onNavigateToWorkbench={onNavigateToWorkbench} />
      )}
    </div>
  );
};

export default IntakeChannelsView;
