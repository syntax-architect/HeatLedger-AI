import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Eye,
  Lock,
  MessageSquare,
  RefreshCw,
  Search,
} from 'lucide-react';
import { AuditChainVerificationResponse, AuditLogRecord } from '../../../../services/api';

interface AuditIntegrityBannerProps {
  integrityStatus: AuditChainVerificationResponse | null;
  totalCount: number;
  isVerifying: boolean;
  onVerifyChain: () => void;
}

export const AuditIntegrityBanner: React.FC<AuditIntegrityBannerProps> = ({
  integrityStatus,
  totalCount,
  isVerifying,
  onVerifyChain,
}) => (
  <div
    className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
      integrityStatus?.valid
        ? 'bg-[#ECFDF5] border-emerald-200'
        : 'bg-[#FEF2F2] border-[#FECACA]'
    }`}
  >
    <div className="flex items-start sm:items-center gap-3">
      <span
        className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
          integrityStatus?.valid
            ? 'bg-[#FCFBF8] border-emerald-200 text-[#059669]'
            : 'bg-[#FCFBF8] border-[#FECACA] text-[#DC2626]'
        }`}
      >
        {integrityStatus?.valid ? (
          <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
        ) : (
          <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />
        )}
      </span>
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm text-[#18181A]">
            {integrityStatus?.valid
              ? 'Cryptographic Hash-Chain Integrity: 100% Verified'
              : 'Tampering Warning: Hash Chain Break Detected!'}
          </span>
          <span className="font-mono tabular-nums text-xs text-[#55544E]">
            ({totalCount} append-only entries)
          </span>
        </div>
        <p className="text-xs text-[#55544E] font-mono tabular-nums truncate max-w-xl">
          Latest Sealed SHA-256 Block:{' '}
          <span className="font-medium text-[#18181A]">
            {integrityStatus?.last_verified_hash
              ? `${integrityStatus.last_verified_hash.slice(0, 32)}...`
              : 'Root Genesis Anchor'}
          </span>
        </p>
      </div>
    </div>

    <button
      type="button"
      onClick={onVerifyChain}
      disabled={isVerifying}
      className="h-9 px-3.5 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-[#18181A] font-medium text-xs flex items-center justify-center gap-1.5 hover:bg-[#EFECE5] cursor-pointer disabled:opacity-50 self-start md:self-auto shrink-0 transition-colors duration-150"
    >
      <RefreshCw
        className={`w-4 h-4 text-[#059669] ${isVerifying ? 'animate-spin' : ''}`}
        strokeWidth={1.5}
      />
      <span>{isVerifying ? 'Verifying Tree...' : 'Verify Chain Now'}</span>
    </button>
  </div>
);

interface AuditFilterBarProps {
  entityTypeFilter: string;
  onEntityTypeChange: (v: string) => void;
  actionFilter: string;
  onActionFilterChange: (v: string) => void;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
}

export const AuditFilterBar: React.FC<AuditFilterBarProps> = ({
  entityTypeFilter,
  onEntityTypeChange,
  actionFilter,
  onActionFilterChange,
  searchQuery,
  onSearchQueryChange,
}) => (
  <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
    <div className="flex items-center flex-wrap gap-3">
      <div className="flex items-center gap-1.5">
        <span className="text-[#55544E] font-medium">Entity:</span>
        <select
          value={entityTypeFilter}
          onChange={(e) => onEntityTypeChange(e.target.value)}
          className="h-9 px-2.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 font-medium text-[#18181A] focus:outline-none focus:border-[#059669]"
          aria-label="Filter by Entity Type"
        >
          <option value="ALL">All Entities</option>
          <option value="SHIPMENT">Shipments</option>
          <option value="CERTIFICATE">Certificates</option>
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[#55544E] font-medium">Action:</span>
        <select
          value={actionFilter}
          onChange={(e) => onActionFilterChange(e.target.value)}
          className="h-9 px-2.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 font-medium text-[#18181A] focus:outline-none focus:border-[#059669]"
          aria-label="Filter by Action"
        >
          <option value="ALL">All Actions</option>
          <option value="CREATE">CREATE</option>
          <option value="REVIEW">REVIEW</option>
          <option value="APPROVE">APPROVE</option>
          <option value="SIGN">SIGN</option>
          <option value="RELEASE">RELEASE</option>
          <option value="DELETE">DELETE</option>
          <option value="LEGAL_HOLD_ENABLE">LEGAL_HOLD</option>
          <option value="COMMENT">COMMENT</option>
        </select>
      </div>
    </div>

    <div className="relative min-w-[220px]">
      <Search
        className="w-4 h-4 text-[#55544E] absolute left-3 top-1/2 -translate-y-1/2"
        strokeWidth={1.5}
      />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        placeholder="Search entity, user, hash..."
        className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] placeholder:text-[#78766E] text-xs focus:outline-none focus:border-[#059669]"
      />
    </div>
  </div>
);

interface AuditLedgerTableProps {
  loading: boolean;
  displayedRecords: AuditLogRecord[];
  onCopyHash: (hash: string) => void;
  onInspectDiff: (record: AuditLogRecord) => void;
  onOpenComments: (entityType: string, entityId: string) => void;
}

export const AuditLedgerTable: React.FC<AuditLedgerTableProps> = ({
  loading,
  displayedRecords,
  onCopyHash,
  onInspectDiff,
  onOpenComments,
}) => (
  <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
    {loading ? (
      <div className="py-20 flex flex-col items-center justify-center text-[#55544E] gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-[#059669]" strokeWidth={1.5} />
        <p className="text-xs font-mono">Loading tamper-evident audit ledger...</p>
      </div>
    ) : displayedRecords.length === 0 ? (
      <div className="py-16 text-center text-[#55544E] space-y-2">
        <Lock className="w-6 h-6 mx-auto text-[#78766E]" strokeWidth={1.5} />
        <p className="text-xs font-medium text-[#18181A]">
          No audit entries matching filter criteria.
        </p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#F7F5F0] border-b border-[#18181A]/10 text-[#55544E]">
            <tr>
              <th className="py-3 px-4 font-medium">Seq</th>
              <th className="py-3 px-4 font-medium">Timestamp (UTC)</th>
              <th className="py-3 px-4 font-medium">Entity</th>
              <th className="py-3 px-4 font-medium">Action</th>
              <th className="py-3 px-4 font-medium">Actor (Role)</th>
              <th className="py-3 px-4 font-medium">IP Address</th>
              <th className="py-3 px-4 font-medium">SHA-256 Record Hash</th>
              <th className="py-3 px-4 font-medium text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#18181A]/10 text-[#18181A]">
            {displayedRecords.map((r) => (
              <tr
                key={r.sequence_number}
                className="hover:bg-[#F7F5F0] transition-colors duration-150"
              >
                <td className="py-3 px-4 font-mono tabular-nums font-medium text-[#18181A]">
                  #{r.sequence_number}
                </td>
                <td className="py-3 px-4 font-mono tabular-nums text-[#55544E] whitespace-nowrap">
                  {r.timestamp.replace('T', ' ').slice(0, 19)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-[#18181A]">{r.entity_id}</span>
                    <span className="text-xs font-mono text-[#55544E] bg-[#EFECE5] border border-[#18181A]/10 px-1.5 py-0.5 rounded">
                      {r.entity_type}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded-md font-mono text-xs font-medium border ${
                      r.action === 'SIGN' || r.action === 'RELEASE'
                        ? 'bg-[#ECFDF5] text-[#047857] border-emerald-200'
                        : r.action === 'APPROVE'
                          ? 'bg-[#F7F5F0] text-[#18181A] border-[#18181A]/15'
                          : r.action === 'DELETE'
                            ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                            : 'bg-[#EFECE5] text-[#55544E] border-[#18181A]/10'
                    }`}
                  >
                    {r.action}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="font-medium text-[#18181A]">{r.user_name}</span>{' '}
                  <span className="text-[#55544E] font-mono text-xs">({r.user_role})</span>
                </td>
                <td className="py-3 px-4 font-mono tabular-nums text-[#55544E] whitespace-nowrap">
                  {r.ip_address}
                </td>
                <td className="py-3 px-4 font-mono tabular-nums text-xs text-[#55544E]">
                  <div className="flex items-center gap-1.5">
                    <span>{r.record_hash.slice(0, 16)}...</span>
                    <button
                      type="button"
                      onClick={() => onCopyHash(r.record_hash)}
                      className="text-[#78766E] hover:text-[#18181A] cursor-pointer"
                      title="Copy full 64-char SHA-256 hash"
                    >
                      <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onInspectDiff(r)}
                      className="p-1.5 rounded-lg bg-[#F7F5F0] hover:bg-[#EFECE5] border border-[#18181A]/10 text-[#55544E] hover:text-[#18181A] cursor-pointer"
                      title="View state delta and diff"
                    >
                      <Eye className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenComments(r.entity_type, r.entity_id)}
                      className="p-1.5 rounded-lg bg-[#F7F5F0] hover:bg-[#EFECE5] border border-[#18181A]/10 text-[#55544E] hover:text-[#18181A] cursor-pointer"
                      title="View comments & mentions"
                    >
                      <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);
