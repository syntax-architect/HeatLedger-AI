import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2,
  Copy,
  Check,
  Ban,
  ShieldCheck,
  ExternalLink,
  Clock,
  Eye,
  FileCheck,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ShareLinkItem {
  id: string;
  token: string;
  recipient: string;
  shipmentId: string;
  createdAt: string;
  expiresAt: string;
  viewsCount: number;
  isRevoked: boolean;
}

interface AccessLogItem {
  id: string;
  timestamp: string;
  token: string;
  recipient: string;
  action: 'view' | 'download' | 'verify';
  ipAddress: string;
  status: 'allowed' | 'revoked';
}

const INITIAL_LINKS: ShareLinkItem[] = [
  {
    id: 'link-1',
    token: 'sh_9f82c401',
    recipient: 'ThyssenKrupp Steel AG (Essen)',
    shipmentId: 'SH-2026-0881',
    createdAt: '2026-11-20 14:32',
    expiresAt: '2026-12-20 23:59',
    viewsCount: 4,
    isRevoked: false,
  },
  {
    id: 'link-2',
    token: 'sh_3e19a820',
    recipient: 'ArcelorMittal Gent Logistics',
    shipmentId: 'SH-2026-0879',
    createdAt: '2026-11-19 09:15',
    expiresAt: '2026-12-19 23:59',
    viewsCount: 2,
    isRevoked: false,
  },
  {
    id: 'link-3',
    token: 'sh_a45c9912',
    recipient: 'Salzgitter Flachstahl GmbH',
    shipmentId: 'SH-2026-0842',
    createdAt: '2026-11-10 11:00',
    expiresAt: '2026-12-10 23:59',
    viewsCount: 7,
    isRevoked: true,
  },
];

const INITIAL_LOGS: AccessLogItem[] = [
  {
    id: 'log-1',
    timestamp: '2026-11-23 10:14:02',
    token: 'sh_9f82c401',
    recipient: 'ThyssenKrupp Steel AG',
    action: 'download',
    ipAddress: '194.39.218.4 (DE)',
    status: 'allowed',
  },
  {
    id: 'log-2',
    timestamp: '2026-11-22 16:45:18',
    token: 'sh_9f82c401',
    recipient: 'ThyssenKrupp Steel AG',
    action: 'view',
    ipAddress: '194.39.218.4 (DE)',
    status: 'allowed',
  },
  {
    id: 'log-3',
    timestamp: '2026-11-21 11:20:05',
    token: 'sh_a45c9912',
    recipient: 'Salzgitter Flachstahl',
    action: 'view',
    ipAddress: '185.22.140.12 (DE)',
    status: 'revoked',
  },
];

export const ShareVerifyView: React.FC = () => {
  const navigate = useNavigate();
  const [links, setLinks] = useState<ShareLinkItem[]>(INITIAL_LINKS);
  const [logs, setLogs] = useState<AccessLogItem[]>(INITIAL_LOGS);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCopyLink = (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.heatledger.ai';
    const fullUrl = `${origin}/share/${token}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(fullUrl);
    }
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleToggleRevoke = (id: string) => {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, isRevoked: !l.isRevoked } : l))
    );
  };

  const filteredLinks = links.filter(
    (l) =>
      l.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.shipmentId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Share2 className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              Share & Verify
            </h1>
          </div>
          <p className="text-sm text-[#A1A1AA] mt-1">
            Manage buyer portal access links, audit verification logs, and revoke tokens instantly.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/verify')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] text-sm font-medium transition cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Offline Verifier</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs font-medium text-[#A1A1AA]">
            <span>Active Buyer Links</span>
            <ExternalLink className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-semibold text-white mt-2">
            {links.filter((l) => !l.isRevoked).length}
          </p>
          <p className="text-xs text-[#71717A] mt-1">Ready for customs verification</p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs font-medium text-[#A1A1AA]">
            <span>Total Portal Views</span>
            <Eye className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-semibold text-white mt-2">
            {links.reduce((acc, curr) => acc + curr.viewsCount, 0)}
          </p>
          <p className="text-xs text-[#71717A] mt-1">Across EU customs and buyers</p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs font-medium text-[#A1A1AA]">
            <span>Revoked Links</span>
            <Ban className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-semibold text-white mt-2">
            {links.filter((l) => l.isRevoked).length}
          </p>
          <p className="text-xs text-[#71717A] mt-1">Immediate access cutoff enforced</p>
        </div>
      </div>

      {/* Active Links Section */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0E1017] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span>Active Buyer Pack Links</span>
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search recipient, heat, or token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.02] border-b border-white/[0.06] text-xs font-medium text-[#71717A]">
              <tr>
                <th className="px-4 py-3">Recipient / Buyer</th>
                <th className="px-4 py-3">Shipment Ref</th>
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3 text-center">Views</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-[#71717A]">
                    No share links match your query.
                  </td>
                </tr>
              ) : (
                filteredLinks.map((link) => (
                  <tr key={link.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{link.recipient}</td>
                    <td className="px-4 py-3 text-xs text-[#A1A1AA]">{link.shipmentId}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        {link.token}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#71717A]">{link.expiresAt}</td>
                    <td className="px-4 py-3 text-center text-xs font-semibold text-[#F4F4F5]">
                      {link.viewsCount}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {link.isRevoked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                          <Ban className="w-3 h-3" /> Revoked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(link.token)}
                          disabled={link.isRevoked}
                          className={`p-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition ${
                            link.isRevoked
                              ? 'opacity-40 cursor-not-allowed border-white/[0.04] text-[#71717A]'
                              : 'bg-white/[0.04] hover:bg-white/[0.08] text-white border-white/[0.08] cursor-pointer'
                          }`}
                          title="Copy Link to Clipboard"
                        >
                          {copiedToken === link.token ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[#A1A1AA]" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleRevoke(link.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                            link.isRevoked
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                        >
                          {link.isRevoked ? 'Reinstate' : 'Revoke'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Access Audit Log */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0E1017] p-5">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Recent Verification Logs</h3>
          </div>
          <span className="text-xs text-[#71717A]">Real-time access audit</span>
        </div>

        <div className="divide-y divide-white/[0.04] mt-2">
          {logs.map((log) => (
            <div key={log.id} className="py-3 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{log.recipient}</span>
                  <span className="text-[#71717A]">({log.token})</span>
                </div>
                <div className="text-[#71717A] flex items-center gap-2">
                  <span>Action: {log.action.toUpperCase()}</span>
                  <span>•</span>
                  <span>IP: {log.ipAddress}</span>
                </div>
              </div>
              <div className="text-right space-y-0.5">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                    log.status === 'allowed'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {log.status === 'allowed' ? '200 OK' : '403 REVOKED'}
                </span>
                <p className="text-[#71717A] text-[11px]">{log.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default ShareVerifyView;
