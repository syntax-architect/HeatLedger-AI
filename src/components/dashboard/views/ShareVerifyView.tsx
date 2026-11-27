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
    <div className="space-y-6 pb-20 max-w-7xl mx-auto text-[#18181A]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#18181A]/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#059669]" strokeWidth={1.5} />
            <h1 className="text-xl sm:text-2xl font-medium text-[#18181A] tracking-tight">
              Share &amp; Verify
            </h1>
          </div>
          <p className="text-sm text-[#55544E] mt-1">
            Manage buyer portal access links, audit verification logs, and revoke tokens instantly.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/verify')}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] border border-[#18181A]/15 text-xs font-medium transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
            <span>Offline Verifier</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10">
          <div className="flex items-center justify-between text-xs font-medium text-[#55544E]">
            <span>Active Buyer Links</span>
            <ExternalLink className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          </div>
          <p className="text-2xl font-medium font-mono tabular-nums text-[#18181A] mt-2">
            {links.filter((l) => !l.isRevoked).length}
          </p>
          <p className="text-xs text-[#78766E] mt-1">Ready for customs verification</p>
        </div>

        <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10">
          <div className="flex items-center justify-between text-xs font-medium text-[#55544E]">
            <span>Total Portal Views</span>
            <Eye className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
          </div>
          <p className="text-2xl font-medium font-mono tabular-nums text-[#18181A] mt-2">
            {links.reduce((acc, curr) => acc + curr.viewsCount, 0)}
          </p>
          <p className="text-xs text-[#78766E] mt-1">Across EU customs and buyers</p>
        </div>

        <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10">
          <div className="flex items-center justify-between text-xs font-medium text-[#55544E]">
            <span>Revoked Links</span>
            <Ban className="w-4 h-4 text-rose-700" strokeWidth={1.5} />
          </div>
          <p className="text-2xl font-medium font-mono tabular-nums text-[#18181A] mt-2">
            {links.filter((l) => l.isRevoked).length}
          </p>
          <p className="text-xs text-[#78766E] mt-1">Immediate access cutoff enforced</p>
        </div>
      </div>

      {/* Active Links Section */}
      <div className="rounded-xl border border-[#18181A]/10 bg-[#FCFBF8] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#18181A]/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-medium text-[#18181A] flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
            <span>Active Buyer Pack Links</span>
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#78766E] absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search recipient, heat, or token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-xs text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EFECE5]/60 border-b border-[#18181A]/10 font-medium text-[#55544E]">
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
            <tbody className="divide-y divide-[#18181A]/8">
              {filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-[#78766E]">
                    No share links match your query.
                  </td>
                </tr>
              ) : (
                filteredLinks.map((link) => (
                  <tr key={link.id} className="hover:bg-[#F7F5F0] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#18181A]">{link.recipient}</td>
                    <td className="px-4 py-3 font-mono text-[#55544E]">{link.shipmentId}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-[#047857] bg-[#059669]/10 border border-[#059669]/20 px-2 py-0.5 rounded-md">
                        {link.token}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[#55544E]">{link.expiresAt}</td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums font-medium text-[#18181A]">
                      {link.viewsCount}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {link.isRevoked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                          <Ban className="w-3 h-3" strokeWidth={1.5} /> Revoked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#047857] bg-[#059669]/10 border border-[#059669]/20 px-2 py-0.5 rounded-md">
                          <Check className="w-3 h-3" strokeWidth={1.5} /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(link.token)}
                          disabled={link.isRevoked}
                          className={`h-8 px-2.5 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                            link.isRevoked
                              ? 'opacity-40 cursor-not-allowed border-[#18181A]/10 text-[#78766E]'
                              : 'bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] border-[#18181A]/15 cursor-pointer'
                          }`}
                          title="Copy Link to Clipboard"
                        >
                          {copiedToken === link.token ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
                              <span className="text-[#047857]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[#55544E]" strokeWidth={1.5} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleRevoke(link.id)}
                          className={`h-8 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                            link.isRevoked
                              ? 'bg-[#059669]/10 text-[#047857] border-[#059669]/20 hover:bg-[#059669]/15'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
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
      <div className="rounded-xl border border-[#18181A]/10 bg-[#FCFBF8] p-5">
        <div className="flex items-center justify-between pb-4 border-b border-[#18181A]/10">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
            <h3 className="text-sm font-medium text-[#18181A]">Recent Verification Logs</h3>
          </div>
          <span className="text-xs text-[#78766E]">Real-time access audit</span>
        </div>

        <div className="divide-y divide-[#18181A]/8 mt-2">
          {logs.map((log) => (
            <div key={log.id} className="py-3 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#18181A]">{log.recipient}</span>
                  <span className="font-mono text-[#78766E]">({log.token})</span>
                </div>
                <div className="text-[#55544E] flex items-center gap-2">
                  <span>Action: <span className="font-mono">{log.action}</span></span>
                  <span>·</span>
                  <span>IP: <span className="font-mono">{log.ipAddress}</span></span>
                </div>
              </div>
              <div className="text-right space-y-0.5">
                <span
                  className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                    log.status === 'allowed'
                      ? 'bg-[#059669]/10 text-[#047857] border-[#059669]/20'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {log.status === 'allowed' ? '200 OK' : '403 Revoked'}
                </span>
                <p className="text-[#78766E] font-mono text-[11px]">{log.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default ShareVerifyView;
