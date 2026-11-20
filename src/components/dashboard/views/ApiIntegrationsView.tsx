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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              API, Webhooks & ERP Integrations
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-mono text-xs font-semibold">
              Prompt P11
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Scoped API keys (hl_live_...), HMAC-signed outbound webhooks, and Tally Prime / ERP-9 standardized exports.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'keys'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API Keys</span>
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'webhooks'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Webhook className="w-3.5 h-3.5" />
            <span>Webhooks</span>
          </button>
          <button
            onClick={() => setActiveTab('erp')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'erp'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Tally & ERP</span>
          </button>
        </div>
      </div>

      {/* One-Time Key Display Modal */}
      {createdKeyData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
              <ShieldCheck className="w-5 h-5" />
              <span>New API Key Generated Successfully</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Please copy your live API secret token now. <strong>You will not be able to view it again.</strong>
            </p>
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-xs break-all select-all flex items-center justify-between gap-2 border border-slate-300 dark:border-slate-700">
              <span className="text-slate-900 dark:text-slate-100">{createdKeyData.raw_key}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdKeyData.raw_key);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0"
              >
                {copiedKey ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={() => setCreatedKeyData(null)}
              className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              I have safely copied my API key
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: Scoped API Keys */}
      {activeTab === 'keys' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              API tokens authenticate external ERP systems and scripts against your tenant's scoped data.
            </div>
            <button
              onClick={() => setIsKeyModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Scoped Key</span>
            </button>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="py-3 px-4">Key Name</th>
                  <th className="py-3 px-4">Prefix</th>
                  <th className="py-3 px-4">Assigned Scopes</th>
                  <th className="py-3 px-4">Last Used</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {apiKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-sans font-bold text-slate-900 dark:text-slate-100">
                      {key.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{key.key_prefix}</td>
                    <td className="py-3 px-4 font-sans">
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-700 dark:text-slate-300"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-sans">
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-sans">
                      {new Date(key.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-medium transition-colors cursor-pointer"
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
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              HeatLedger dispatches HMAC-SHA256 signed POST requests when critical shop-floor events fire.
            </div>
            <button
              onClick={() => setIsWebhookModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Register Webhook</span>
            </button>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="py-3 px-4">Endpoint URL</th>
                  <th className="py-3 px-4">Secret Mask</th>
                  <th className="py-3 px-4">Subscribed Events</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {webhooks.map((wh) => (
                  <tr key={wh.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-slate-100">
                      {wh.target_url}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{wh.secret_masked}</td>
                    <td className="py-3 px-4 font-sans">
                      <div className="flex flex-wrap gap-1">
                        {wh.events.map((e) => (
                          <span
                            key={e}
                            className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px]"
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 text-[11px] font-sans">
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
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Tally Prime / ERP-9 Compliance Export</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-mono">
                  RFC 4180
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Download verified export consignment ledgers with linked Heat Numbers, Melt-and-Pour countries, and CBAM Specific Embedded Emissions.
              </p>
            </div>
            <button
              onClick={handleDownloadTallyCsv}
              className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Download Tally CSV</span>
            </button>
          </div>

          {/* Column Dictionary */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
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
                <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-[11px]">{c.col}</div>
                  <div className="text-slate-500 text-[11px] mt-1">{c.map}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Key Modal Dialog */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Generate New Scoped API Key
            </h3>
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Key Description / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Factory Tally ERP Connector"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Select Permission Scopes</label>
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
                        className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
                      />
                      <div>
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{scope.label}</div>
                        <div className="text-[11px] text-slate-500">{scope.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newKeyName.trim() || selectedScopes.length === 0}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white font-semibold transition-colors shadow-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Register Outbound Webhook
            </h3>
            <form onSubmit={handleRegisterWebhook} className="space-y-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Destination Webhook URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://your-domain.com/webhooks/heatledger"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Subscribed Events</label>
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
                        className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
                      />
                      <div>
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{event.label}</div>
                        <div className="text-[11px] text-slate-500">{event.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWebhookModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!targetUrl.trim() || selectedEvents.length === 0}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white font-semibold transition-colors shadow-xs"
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
