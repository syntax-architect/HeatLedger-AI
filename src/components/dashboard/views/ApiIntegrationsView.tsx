import React, { useState, useEffect } from 'react';
import {
  Key,
  Webhook,
  FileSpreadsheet,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  Download,
  AlertCircle,
  ExternalLink,
  Code2
} from 'lucide-react';
import { api, ApiKeyItem, WebhookSubscriptionItem, ApiKeyCreatedResponse } from '../../../services/api';

const AVAILABLE_SCOPES = [
  { id: 'read:shipments', label: 'read:shipments', desc: 'Query export consignments and release gate evaluations' },
  { id: 'read:dossiers', label: 'read:dossiers', desc: 'Download signed EN 10204 Clause 6 byte-identical ZIPs' },
  { id: 'write:heats', label: 'write:heats', desc: 'Register heat numbers and allocate weights from ERP' },
  { id: 'read:cbam', label: 'read:cbam', desc: 'Read installation specific embedded emissions and default markups' },
  { id: 'read:suppliers', label: 'read:suppliers', desc: 'Access supplier compliance ratings and melt-and-pour rates' },
];

const AVAILABLE_EVENTS = [
  { id: 'certificate.extracted', label: 'certificate.extracted', desc: 'Triggered when PyMuPDF/Gemini finishes parsing MTC' },
  { id: 'shipment.ready', label: 'shipment.ready', desc: 'Triggered when all release gate compliance rules pass' },
  { id: 'dossier.signed', label: 'dossier.signed', desc: 'Triggered when QA Inspector seals Clause 6 dossier' },
  { id: 'cbam.calculated', label: 'cbam.calculated', desc: 'Triggered when specific embedded emissions math completes' },
];

export const ApiIntegrationsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'keys' | 'webhooks' | 'erp'>('keys');
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookSubscriptionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New Key Modal
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['read:shipments', 'read:dossiers']);
  const [createdKeyData, setCreatedKeyData] = useState<ApiKeyCreatedResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // New Webhook Modal
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['shipment.ready', 'dossier.signed']);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [keys, whs] = await Promise.all([
        api.fetchApiKeys().catch(() => [
          {
            id: 'key_demo_01',
            organization_id: 'org_howrah_01',
            name: 'Tally Prime Live Connector',
            key_prefix: 'hl_live_88a1...',
            scopes: ['read:shipments', 'read:dossiers'],
            created_at: '2026-04-10T10:00:00Z',
            last_used_at: '2026-04-18T14:32:00Z',
            is_active: true,
          },
        ]),
        api.fetchWebhooks().catch(() => [
          {
            id: 'wh_demo_01',
            target_url: 'https://erp.howrahprecision.in/api/webhooks/heatledger',
            secret_masked: 'whsec_99a12f...',
            events: ['shipment.ready', 'dossier.signed'],
            is_active: true,
            created_at: '2026-04-12T11:00:00Z',
          },
        ]),
      ]);
      setApiKeys(keys);
      setWebhooks(whs);
    } catch (err: any) {
      setError(err.message || 'Failed to load integration settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || selectedScopes.length === 0) return;
    try {
      const res = await api.createApiKey(newKeyName.trim(), selectedScopes);
      setCreatedKeyData(res);
      setIsKeyModalOpen(false);
      setNewKeyName('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to generate API key');
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key immediately? All connected ERP clients will be disconnected.')) return;
    try {
      await api.revokeApiKey(keyId);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke key');
    }
  };

  const handleRegisterWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim() || selectedEvents.length === 0) return;
    try {
      await api.registerWebhook(targetUrl.trim(), selectedEvents);
      setIsWebhookModalOpen(false);
      setTargetUrl('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to register webhook');
    }
  };

  const handleDownloadTallyCsv = async () => {
    try {
      const blob = await api.downloadTallyCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tally_Prime_HeatLedger_Export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download Tally CSV export');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-[#18181A]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#18181A]/10">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-[#18181A]">
            API, Webhooks & ERP Integrations
          </h1>
          <p className="text-xs sm:text-sm text-[#55544E] mt-1">
            Scoped API keys (<code className="font-mono text-[#18181A]">hl_live_...</code>), HMAC-signed outbound webhooks, and Tally Prime / ERP-9 standardized exports.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[#EFECE5] rounded-lg border border-[#18181A]/10">
          <button
            onClick={() => setActiveTab('keys')}
            className={`h-8 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'keys'
                ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                : 'text-[#55544E] hover:text-[#18181A]'
            }`}
          >
            <Key className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>API Keys</span>
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`h-8 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'webhooks'
                ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                : 'text-[#55544E] hover:text-[#18181A]'
            }`}
          >
            <Webhook className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Webhooks</span>
          </button>
          <button
            onClick={() => setActiveTab('erp')}
            className={`h-8 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'erp'
                ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                : 'text-[#55544E] hover:text-[#18181A]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Tally & ERP</span>
          </button>
        </div>
      </div>

      {/* One-Time Key Display Modal */}
      {createdKeyData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
          <div className="bg-[#FCFBF8] rounded-xl max-w-md w-full border border-[#18181A]/15 p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#047857] font-medium text-sm">
              <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
              <span>New API Key Generated Successfully</span>
            </div>
            <p className="text-xs text-[#55544E]">
              Please copy your live API secret token now. <span className="font-medium text-[#18181A]">You will not be able to view it again.</span>
            </p>
            <div className="p-3 rounded-lg bg-[#F7F5F0] font-mono text-xs break-all select-all flex items-center justify-between gap-2 border border-[#18181A]/15">
              <span className="text-[#18181A]">{createdKeyData.raw_key}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdKeyData.raw_key);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="h-8 w-8 rounded-md hover:bg-[#EFECE5] text-[#55544E] flex items-center justify-center shrink-0 transition-colors"
              >
                {copiedKey ? <Check className="w-4 h-4 text-[#059669]" strokeWidth={1.5} /> : <Copy className="w-4 h-4" strokeWidth={1.5} />}
              </button>
            </div>
            <button
              onClick={() => setCreatedKeyData(null)}
              className="w-full h-9 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] font-medium text-xs transition-colors"
            >
              I have safely copied my API key
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: Scoped API Keys */}
      {activeTab === 'keys' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-[#55544E]">
              API tokens authenticate external ERP systems and scripts against your tenant's scoped data.
            </div>
            <button
              onClick={() => setIsKeyModalOpen(true)}
              className="h-9 px-3.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] text-xs font-medium flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              <span>Generate Scoped Key</span>
            </button>
          </div>

          <div className="rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#18181A]/10 text-[#55544E] font-medium bg-[#EFECE5]/60">
                  <th className="py-3 px-4">Key Name</th>
                  <th className="py-3 px-4">Prefix</th>
                  <th className="py-3 px-4">Assigned Scopes</th>
                  <th className="py-3 px-4">Last Used</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181A]/8 font-mono">
                {apiKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-[#F7F5F0]">
                    <td className="py-3 px-4 font-sans font-medium text-[#18181A]">
                      {key.name}
                    </td>
                    <td className="py-3 px-4 text-[#55544E]">{key.key_prefix}</td>
                    <td className="py-3 px-4 font-sans">
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded-md bg-[#EFECE5] border border-[#18181A]/10 text-[11px] font-mono text-[#18181A]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#55544E] text-[11px] font-sans">
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-[#55544E] text-[11px] font-sans">
                      {new Date(key.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        className="h-8 px-2.5 rounded-md text-rose-700 hover:bg-rose-50 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Outbound Webhooks */}
      {activeTab === 'webhooks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-[#55544E]">
              HeatLedger dispatches HMAC-SHA256 signed POST requests when critical shop-floor events fire.
            </div>
            <button
              onClick={() => setIsWebhookModalOpen(true)}
              className="h-9 px-3.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] text-xs font-medium flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              <span>Register Webhook</span>
            </button>
          </div>

          <div className="rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#18181A]/10 text-[#55544E] font-medium bg-[#EFECE5]/60">
                  <th className="py-3 px-4">Endpoint URL</th>
                  <th className="py-3 px-4">Secret Mask</th>
                  <th className="py-3 px-4">Subscribed Events</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181A]/8 font-mono">
                {webhooks.map((wh) => (
                  <tr key={wh.id} className="hover:bg-[#F7F5F0]">
                    <td className="py-3 px-4 font-sans font-medium text-[#18181A]">
                      {wh.target_url}
                    </td>
                    <td className="py-3 px-4 text-[#55544E]">{wh.secret_masked}</td>
                    <td className="py-3 px-4 font-sans">
                      <div className="flex flex-wrap gap-1">
                        {wh.events.map((e) => (
                          <span
                            key={e}
                            className="px-2 py-0.5 rounded-md bg-[#059669]/10 text-[#047857] border border-[#059669]/20 text-[11px] font-mono"
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded-md bg-[#059669]/10 text-[#047857] border border-[#059669]/20 text-[11px] font-medium">
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-[#55544E] text-[11px] font-sans">
                      {new Date(wh.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Tally & ERP CSV Standard */}
      {activeTab === 'erp' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-sm text-[#18181A] flex items-center gap-2">
                <span>Tally Prime / ERP-9 Compliance Export</span>
                <span className="px-2 py-0.5 rounded-md bg-[#EFECE5] text-[#55544E] border border-[#18181A]/10 text-[11px] font-mono">
                  RFC 4180
                </span>
              </h3>
              <p className="text-xs text-[#55544E] mt-1 max-w-xl">
                Download verified export consignment ledgers with linked Heat Numbers, Melt-and-Pour countries, and CBAM Specific Embedded Emissions.
              </p>
            </div>
            <button
              onClick={handleDownloadTallyCsv}
              className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] font-medium text-xs flex items-center gap-2 transition-colors shrink-0"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
              <span>Download Tally CSV</span>
            </button>
          </div>

          {/* Column Dictionary */}
          <div className="rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 p-5 space-y-4">
            <h4 className="font-medium text-xs text-[#55544E]">
              Standard Column Dictionary & Statutory Mapping
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {[
                { col: 'Invoice_Number', map: 'Commercial Export Invoice Number (EXP-2026-XXX)' },
                { col: 'Heat_Number', map: 'Upstream steel mill melt identification code' },
                { col: 'Melt_and_Pour_Country', map: 'ISO 3166-1 alpha-2 origin proof per EU 2026/1963' },
                { col: 'Specific_Embedded_Emissions_tCO2e', map: 'Verified Annex III SEE per CBAM 2023/1773' },
                { col: 'Clause6_Byte_Identical_Annex', map: 'EN 10204:2004 Clause 6 compliance flag (YES/NO)' },
                { col: 'Dossier_Tamper_Seal_SHA256', map: 'Cryptographic SHA-256 deliverable integrity seal' },
              ].map((c, i) => (
                <div key={i} className="p-3.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10">
                  <div className="font-mono font-medium text-[#18181A] text-[11px]">{c.col}</div>
                  <div className="text-[#55544E] text-[11px] mt-1">{c.map}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Key Modal Dialog */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
          <div className="bg-[#FCFBF8] rounded-xl max-w-md w-full border border-[#18181A]/15 p-6 space-y-4 text-xs">
            <h3 className="font-medium text-sm text-[#18181A]">
              Generate New Scoped API Key
            </h3>
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="block text-[#55544E] font-medium mb-1">Key Description / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Factory Tally ERP Connector"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div>
                <label className="block text-[#55544E] font-medium mb-1">Select Permission Scopes</label>
                <div className="space-y-2 mt-2">
                  {AVAILABLE_SCOPES.map((scope) => (
                    <label key={scope.id} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(scope.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedScopes([...selectedScopes, scope.id]);
                          else setSelectedScopes(selectedScopes.filter((s) => s !== scope.id));
                        }}
                        className="mt-0.5 rounded accent-[#059669]"
                      />
                      <div>
                        <div className="font-mono font-medium text-[#18181A]">{scope.label}</div>
                        <div className="text-[11px] text-[#55544E]">{scope.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(false)}
                  className="h-9 px-4 rounded-lg bg-[#EFECE5] text-[#18181A] hover:bg-[#18181A]/10 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newKeyName.trim() || selectedScopes.length === 0}
                  className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-[#FCFBF8] font-medium transition-colors"
                >
                  Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Webhook Modal Dialog */}
      {isWebhookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
          <div className="bg-[#FCFBF8] rounded-xl max-w-md w-full border border-[#18181A]/15 p-6 space-y-4 text-xs">
            <h3 className="font-medium text-sm text-[#18181A]">
              Register Outbound Webhook
            </h3>
            <form onSubmit={handleRegisterWebhook} className="space-y-4">
              <div>
                <label className="block text-[#55544E] font-medium mb-1">Destination Webhook URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://your-domain.com/webhooks/heatledger"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div>
                <label className="block text-[#55544E] font-medium mb-1">Subscribed Events</label>
                <div className="space-y-2 mt-2">
                  {AVAILABLE_EVENTS.map((event) => (
                    <label key={event.id} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(event.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedEvents([...selectedEvents, event.id]);
                          else setSelectedEvents(selectedEvents.filter((ev) => ev !== event.id));
                        }}
                        className="mt-0.5 rounded accent-[#059669]"
                      />
                      <div>
                        <div className="font-mono font-medium text-[#18181A]">{event.label}</div>
                        <div className="text-[11px] text-[#55544E]">{event.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWebhookModalOpen(false)}
                  className="h-9 px-4 rounded-lg bg-[#EFECE5] text-[#18181A] hover:bg-[#18181A]/10 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!targetUrl.trim() || selectedEvents.length === 0}
                  className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-[#FCFBF8] font-medium transition-colors"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
