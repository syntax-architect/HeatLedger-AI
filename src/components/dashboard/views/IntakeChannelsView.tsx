import React, { useState } from 'react';
import {
  MessageSquare,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Trash2,
  Plus,
  RefreshCw,
  Clock,
  FileText,
  Zap,
} from 'lucide-react';

interface PhonePairing {
  id: string;
  phone_number: string;
  plant_id: string;
  user_id: string;
  pairing_code: string;
  is_verified: number;
  is_opted_out: number;
  created_at: string;
}

interface BudgetStatus {
  plant_id: string;
  current_month: string;
  messages_used: number;
  monthly_budget: number;
  remaining: number;
  is_capped: boolean;
  show_banner: boolean;
}

interface EmailConfig {
  plant_id: string;
  organization_id: string;
  inbound_email: string;
  is_active: boolean;
  allow_list: string[];
}

interface IntakeLog {
  id: string;
  channel: 'WHATSAPP' | 'EMAIL';
  message_id: string;
  plant_id: string;
  sender: string;
  message_type: string;
  document_id?: string;
  status: string;
  reply_sent?: string;
  created_at: string;
}

interface IntakeChannelsViewProps {
  onNavigateToWorkbench?: (docId?: string) => void;
}

export const IntakeChannelsView: React.FC<IntakeChannelsViewProps> = ({ onNavigateToWorkbench }) => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'email' | 'logs'>('whatsapp');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // WhatsApp pairing states
  const [pairings, setPairings] = useState<PhonePairing[]>([
    {
      id: 'pair_init_01',
      phone_number: '+91 98300 22001',
      plant_id: 'plant-howrah-01',
      user_id: 'usr_qa_inspector_01',
      pairing_code: '482910',
      is_verified: 1,
      is_opted_out: 0,
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'pair_init_02',
      phone_number: '+91 98300 99441',
      plant_id: 'plant-howrah-01',
      user_id: 'usr_dispatch_01',
      pairing_code: '901248',
      is_verified: 1,
      is_opted_out: 0,
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
  ]);
  const [generatedCode, setGeneratedCode] = useState<{
    code: string;
    phone: string;
    instruction: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Budget status
  const [budget] = useState<BudgetStatus>({
    plant_id: 'plant-howrah-01',
    current_month: '2026-11',
    messages_used: 18,
    monthly_budget: 500,
    remaining: 482,
    is_capped: false,
    show_banner: false,
  });

  // Email config
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    plant_id: 'plant-howrah-01',
    organization_id: 'org_demo_howrah',
    inbound_email: 'docs-howrah@inbound.heatledger.ai',
    is_active: true,
    allow_list: ['@tatasteel.com', '@sail.in', 'dispatch@jindalsteel.com'],
  });
  const [newAllowItem, setNewAllowItem] = useState('');

  // Logs
  const [logs] = useState<IntakeLog[]>([
    {
      id: 'log_01',
      channel: 'WHATSAPP',
      message_id: 'wamid.HBgLMjAyNjExMTk...',
      plant_id: 'plant-howrah-01',
      sender: '+91 98300 22001',
      message_type: 'image/jpeg',
      document_id: 'doc_wa_88910',
      status: 'PROCESSED',
      reply_sent: 'Certificate received (IMG_2026_MTC.jpg). Queued for extraction.',
      created_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    },
    {
      id: 'log_02',
      channel: 'EMAIL',
      message_id: 'em_tatasteel_8819',
      plant_id: 'plant-howrah-01',
      sender: 'dispatch@tatasteel.com',
      message_type: 'application/pdf',
      document_id: 'doc_em_44120',
      status: 'PROCESSED',
      reply_sent: 'MTC Tata Steel ASTM A106 ingested with SHA-256 digest.',
      created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
    {
      id: 'log_03',
      channel: 'WHATSAPP',
      message_id: 'wamid.HBgLUnBob25l...',
      plant_id: 'plant-howrah-01',
      sender: '+91 98765 00000',
      message_type: 'text',
      status: 'UNPAIRED_SENDER',
      reply_sent: 'Phone number not linked to plant. Generate a 6-digit pairing code.',
      created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    },
  ]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGeneratePairing = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/intake/whatsapp/generate-pairing-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plant_id: 'plant-howrah-01', user_id: 'usr_owner_01' }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedCode({
          code: data.pairing_code,
          phone: data.phone_number,
          instruction: data.instruction,
        });
      } else {
        const fallback = String(Math.floor(100000 + Math.random() * 900000));
        setGeneratedCode({
          code: fallback,
          phone: '+91 98300 22000',
          instruction: `Send 'PAIR ${fallback}' from WhatsApp to +91 98300 22000 to connect.`,
        });
      }
    } catch {
      const fallback = String(Math.floor(100000 + Math.random() * 900000));
      setGeneratedCode({
        code: fallback,
        phone: '+91 98300 22000',
        instruction: `Send 'PAIR ${fallback}' from WhatsApp to +91 98300 22000 to connect.`,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUnlink = async (pairingId: string) => {
    try {
      await fetch(`/api/intake/whatsapp/pairings/${pairingId}`, { method: 'DELETE' });
    } catch {
      // offline fallback
    }
    setPairings((prev) => prev.filter((p) => p.id !== pairingId));
  };

  const handleAddAllowDomain = () => {
    if (!newAllowItem.trim()) return;
    const clean = newAllowItem.trim().toLowerCase();
    if (!emailConfig.allow_list.includes(clean)) {
      const updated = [...emailConfig.allow_list, clean];
      setEmailConfig((prev) => ({ ...prev, allow_list: updated }));
      setNewAllowItem('');
      fetch('/api/intake/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plant_id: emailConfig.plant_id,
          allow_list: updated,
          is_active: emailConfig.is_active,
        }),
      }).catch(() => {});
    }
  };

  const handleRemoveAllowDomain = (item: string) => {
    const updated = emailConfig.allow_list.filter((x) => x !== item);
    setEmailConfig((prev) => ({ ...prev, allow_list: updated }));
    fetch('/api/intake/email/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plant_id: emailConfig.plant_id,
        allow_list: updated,
        is_active: emailConfig.is_active,
      }),
    }).catch(() => {});
  };

  const handleToggleEmailActive = () => {
    const nextState = !emailConfig.is_active;
    setEmailConfig((prev) => ({ ...prev, is_active: nextState }));
    fetch('/api/intake/email/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plant_id: emailConfig.plant_id,
        allow_list: emailConfig.allow_list,
        is_active: nextState,
      }),
    }).catch(() => {});
  };

  const budgetUsagePct = Math.min(100, Math.round((budget.messages_used / budget.monthly_budget) * 100));

  return (
    <div className="space-y-6 text-left text-[#09090B]">
      {/* Workspace Header */}
      <div className="bg-white rounded-xl border border-[#E4E4E7] p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#ECFDF5] text-[#047857] border border-emerald-200">
              24-hr Service Window Active
            </span>
            <span className="text-xs text-[#52525B] font-mono tabular-nums">
              {budget.plant_id}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-[-0.025em] text-[#09090B]">
            WhatsApp &amp; Email Certificate Intake
          </h1>
          <p className="text-sm text-[#52525B] max-w-2xl">
            Ingest weighbridge photos and supplier EN 10204 3.1 PDFs directly from WhatsApp or dedicated plant email into the inspection queue.
          </p>
        </div>

        {/* Monthly Message Budget Card */}
        <div className="flex items-center gap-3.5 bg-[#FAFAFA] px-4 py-3 rounded-xl border border-[#E4E4E7] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-xs min-w-[180px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#09090B]">Monthly Message Cap</span>
              <span className="font-mono tabular-nums font-medium text-[#52525B]">
                {budget.messages_used} / {budget.monthly_budget}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#E4E4E7] rounded-sm overflow-hidden mt-1.5">
              <div
                className="h-full bg-[#059669]"
                style={{ width: `${Math.max(4, budgetUsagePct)}%` }}
              />
            </div>
            <div className="text-xs text-[#52525B] mt-1 font-mono tabular-nums">
              {budget.remaining} outbound alerts remaining
            </div>
          </div>
          {budget.show_banner && (
            <span className="px-2 py-0.5 bg-[#FFFBEB] text-[#B45309] text-xs font-medium rounded-md border border-[#FDE68A]">
              Cap Alert
            </span>
          )}
        </div>
      </div>

      {/* Clean Segmented Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E4E4E7] overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('whatsapp')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'whatsapp'
              ? 'border-[#059669] text-[#09090B]'
              : 'border-transparent text-[#52525B] hover:text-[#09090B]'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-[#059669]" />
          WhatsApp Cloud API
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('email')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'email'
              ? 'border-[#059669] text-[#09090B]'
              : 'border-transparent text-[#52525B] hover:text-[#09090B]'
          }`}
        >
          <Mail className="w-4 h-4 text-[#2563EB]" />
          Plant Email-In
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'logs'
              ? 'border-[#059669] text-[#09090B]'
              : 'border-transparent text-[#52525B] hover:text-[#09090B]'
          }`}
        >
          <Clock className="w-4 h-4 text-[#52525B]" />
          Transmission Logs
          <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-[#F4F4F5] text-[#52525B] text-xs font-mono tabular-nums">
            {logs.length}
          </span>
        </button>
      </div>

      {/* Tab 1: WhatsApp Cloud Intake */}
      {activeTab === 'whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Pairing & Active Phones */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold tracking-[-0.015em] text-[#09090B]">
                    Linked Staff Phone Numbers
                  </h2>
                  <p className="text-xs text-[#52525B] mt-0.5">
                    Generate a 6-digit one-time pairing code to authorize a plant operator&apos;s WhatsApp number.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePairing}
                  disabled={isGenerating}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-[#059669] text-white hover:bg-[#047857] transition-colors disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  Generate 6-Digit Code
                </button>
              </div>

              {/* Generated Pairing Code Callout */}
              {generatedCode && (
                <div className="p-4 rounded-xl bg-[#ECFDF5] border border-emerald-200 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#047857]">Active One-Time Pairing Code</span>
                    <span className="text-[#047857] font-mono tabular-nums">Expires in 24h</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-2xl font-mono font-semibold tracking-[0.2em] tabular-nums text-[#09090B] bg-white border border-emerald-200 px-3.5 py-1.5 rounded-lg">
                      {generatedCode.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`PAIR ${generatedCode.code}`, 'code')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-emerald-200 text-[#047857] hover:bg-emerald-50 transition-colors"
                    >
                      {copiedKey === 'code' ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copiedKey === 'code' ? 'Copied' : 'Copy WhatsApp Command'}
                    </button>
                  </div>
                  <p className="text-[#047857]">{generatedCode.instruction}</p>
                </div>
              )}

              {/* Paired Numbers Table */}
              <div className="border border-[#E4E4E7] rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#FAFAFA] border-b border-[#E4E4E7] text-[#52525B] font-medium">
                    <tr>
                      <th className="py-2.5 px-3.5 font-medium">Phone Number</th>
                      <th className="py-2.5 px-3.5 font-medium">Linked Plant</th>
                      <th className="py-2.5 px-3.5 font-medium">Status</th>
                      <th className="py-2.5 px-3.5 font-medium">Linked Date</th>
                      <th className="py-2.5 px-3.5 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7] bg-white">
                    {pairings.map((p) => (
                      <tr key={p.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="py-3 px-3.5 font-mono tabular-nums font-medium text-[#09090B]">
                          {p.phone_number}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-[#52525B]">{p.plant_id}</td>
                        <td className="py-3 px-3.5">
                          {p.is_opted_out ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                              Opted Out
                            </span>
                          ) : p.is_verified ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#ECFDF5] text-[#047857] border border-emerald-200">
                              Active &amp; Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#EFF6FF] text-[#2563EB] border border-blue-200">
                              Pending Code
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 font-mono tabular-nums text-[#52525B]">
                          {new Date(p.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleUnlink(p.id)}
                            className="p-1.5 text-[#52525B] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors"
                            title="Unlink Phone"
                            aria-label={`Unlink ${p.phone_number}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pairings.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#52525B]">
                          No phone numbers linked yet. Click &ldquo;Generate 6-Digit Code&rdquo; above to connect staff.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Workflow Steps Card */}
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
              <h2 className="text-base font-semibold tracking-[-0.015em] text-[#09090B]">
                Shop-Floor WhatsApp Ingestion Flow
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                <div className="p-3.5 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] space-y-1.5">
                  <div className="font-semibold text-[#09090B] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#ECFDF5] border border-emerald-200 text-[#047857] flex items-center justify-center font-mono font-semibold">
                      1
                    </span>
                    Snap MTC Photo
                  </div>
                  <p className="text-[#52525B] leading-relaxed">
                    Operator photographs the physical EN 10204 3.1 certificate at the receiving bay or weighbridge.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] space-y-1.5">
                  <div className="font-semibold text-[#09090B] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#ECFDF5] border border-emerald-200 text-[#047857] flex items-center justify-center font-mono font-semibold">
                      2
                    </span>
                    Preserve Original
                  </div>
                  <p className="text-[#52525B] leading-relaxed">
                    Message routes to the plant WhatsApp endpoint for byte-identical original preservation with a tamper-evident SHA-256 hash.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] space-y-1.5">
                  <div className="font-semibold text-[#09090B] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#ECFDF5] border border-emerald-200 text-[#047857] flex items-center justify-center font-mono font-semibold">
                      3
                    </span>
                    Instant Review Link
                  </div>
                  <p className="text-[#52525B] leading-relaxed">
                    Automated reply inside the 24-hour service window delivers a direct workbench link to verify chemistry and mechanical values.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Meta Rules & Cost Guard */}
          <div className="space-y-6">
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#059669]" />
                <h2 className="text-base font-semibold tracking-[-0.015em] text-[#09090B]">
                  Meta Cloud API Cost Guard
                </h2>
              </div>
              <div className="space-y-3 text-xs text-[#52525B]">
                <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] space-y-1">
                  <div className="font-semibold text-[#09090B]">24-Hour Service Window</div>
                  <p className="leading-relaxed">
                    Inbound uploads and automated status replies within 24 hours incur{' '}
                    <span className="font-semibold text-[#047857]">zero template fees</span> under Meta Cloud API guidelines.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] space-y-1">
                  <div className="font-semibold text-[#09090B]">Utility &amp; Alert Cap</div>
                  <p className="leading-relaxed">
                    Outbound reminders outside 24 hours cost approx. INR{' '}
                    <span className="font-mono tabular-nums text-[#09090B]">0.12 – 0.35</span> per message. Alerts are hard-capped at{' '}
                    <span className="font-mono tabular-nums text-[#09090B]">{budget.monthly_budget}/month</span>.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] space-y-1">
                  <div className="font-semibold text-[#09090B]">Opt-Out Controls</div>
                  <p className="leading-relaxed">
                    Staff can reply{' '}
                    <code className="font-mono bg-white border border-[#E4E4E7] text-[#09090B] px-1.5 py-0.5 rounded">
                      STOP
                    </code>{' '}
                    at any time to pause messages, or{' '}
                    <code className="font-mono bg-white border border-[#E4E4E7] text-[#09090B] px-1.5 py-0.5 rounded">
                      START
                    </code>{' '}
                    to re-enable.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Plant Email-In Ingestion */}
      {activeTab === 'email' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Email Address Card */}
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold tracking-[-0.015em] text-[#09090B]">
                    Dedicated Plant Inbound Address
                  </h2>
                  <p className="text-xs text-[#52525B] mt-0.5">
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
                    onClick={handleToggleEmailActive}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E4E4E7] bg-white text-[#09090B] hover:bg-[#FAFAFA] transition-colors"
                  >
                    {emailConfig.is_active ? 'Pause Intake' : 'Resume Intake'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7]">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Mail className="w-4 h-4 text-[#059669] shrink-0" />
                  <span className="font-mono text-sm text-[#09090B] font-medium select-all truncate">
                    {emailConfig.inbound_email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(emailConfig.inbound_email, 'email')}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#059669] text-white hover:bg-[#047857] transition-colors shrink-0"
                >
                  {copiedKey === 'email' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedKey === 'email' ? 'Copied' : 'Copy Address'}
                </button>
              </div>
            </div>

            {/* Sender Allow-List Configuration */}
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
              <div>
                <h2 className="text-base font-semibold tracking-[-0.015em] text-[#09090B]">
                  Sender Allow-List &amp; Anti-Spam Filter
                </h2>
                <p className="text-xs text-[#52525B] mt-0.5">
                  Only messages matching approved domains or exact addresses are ingested into the document queue.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="e.g. @tatasteel.com or dispatch@jsw.in"
                  value={newAllowItem}
                  onChange={(e) => setNewAllowItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAllowDomain()}
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-[#E4E4E7] bg-white text-[#09090B] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#059669]"
                />
                <button
                  type="button"
                  onClick={handleAddAllowDomain}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-[#059669] text-white hover:bg-[#047857] transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add to Allow-List
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {emailConfig.allow_list.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-mono bg-[#FAFAFA] border border-[#E4E4E7] text-[#09090B]"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAllowDomain(item)}
                      className="text-[#52525B] hover:text-[#DC2626] transition-colors leading-none"
                      aria-label={`Remove ${item}`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Processing Pipeline */}
          <div className="space-y-6">
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
              <h2 className="text-base font-semibold tracking-[-0.015em] text-[#09090B]">
                Automated Sanitation Pipeline
              </h2>
              <ul className="space-y-3.5 text-xs text-[#52525B]">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#09090B] font-semibold">Tracking Pixel Stripping:</strong> 1x1 GIF and PNG beacons are stripped automatically on receipt.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#09090B] font-semibold">Magic Byte Validation:</strong> Only verified PDF, JPG, PNG, and HEIC files pass into storage.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#09090B] font-semibold">EN 10204 Clause 6 Integrity:</strong> Byte-identical original preservation in read-only storage with tamper-evident SHA-256 verification.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Unified Transmission Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E4E4E7] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold tracking-[-0.015em] text-[#09090B]">
                Recent Inbound Transmissions
              </h2>
              <p className="text-xs text-[#52525B]">
                Audit trail of incoming certificates received via WhatsApp and plant email channels.
              </p>
            </div>
            <span className="text-xs text-[#52525B] font-mono tabular-nums">
              {logs.length} entries
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FAFAFA] border-b border-[#E4E4E7] text-[#52525B] font-medium">
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
              <tbody className="divide-y divide-[#E4E4E7]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="py-3 px-4">
                      {log.channel === 'WHATSAPP' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-[#ECFDF5] text-[#047857] border border-emerald-200">
                          <MessageSquare className="w-3 h-3" />
                          WhatsApp
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-[#EFF6FF] text-[#2563EB] border border-blue-200">
                          <Mail className="w-3 h-3" />
                          Email
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums font-medium text-[#09090B]">
                      {log.sender}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#52525B]">{log.message_type}</td>
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
                      className="py-3 px-4 text-[#52525B] max-w-xs truncate"
                      title={log.reply_sent}
                    >
                      {log.reply_sent || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-[#52525B]">
                      {new Date(log.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {log.document_id ? (
                        <button
                          type="button"
                          onClick={() => onNavigateToWorkbench?.(log.document_id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E4E4E7] bg-white text-[#09090B] hover:border-[#059669] hover:text-[#047857] transition-colors font-medium text-xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Review MTC
                        </button>
                      ) : (
                        <span className="text-[#A1A1AA] text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
