import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  Clock,
  FileCheck,
  FileText,
  Archive,
  Copy,
  Check,
} from 'lucide-react';
import { haptics } from '../../lib/motion';

export type StatusType =
  | 'Verified'
  | 'Needs review'
  | 'Missing'
  | 'Out of spec'
  | 'Awaiting sign-off'
  | 'Signed'
  | 'Draft'
  | 'Superseded';

interface StatusConfig {
  icon: React.ReactNode;
  bg: string;
  text: string;
  border: string;
}

const statusMap: Record<StatusType, StatusConfig> = {
  Verified: {
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    bg: 'bg-[#ECFDF5] dark:bg-emerald-500/10',
    text: 'text-[#047857] dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-500/25',
  },
  'Needs review': {
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    bg: 'bg-[#FFFBEB] dark:bg-amber-500/10',
    text: 'text-[#B45309] dark:text-amber-400',
    border: 'border-[#FDE68A] dark:border-amber-500/25',
  },
  Missing: {
    icon: <HelpCircle className="w-3.5 h-3.5" />,
    bg: 'bg-[#FEF2F2] dark:bg-red-500/10',
    text: 'text-[#B91C1C] dark:text-red-400',
    border: 'border-[#FECACA] dark:border-red-500/25',
  },
  'Out of spec': {
    icon: <XCircle className="w-3.5 h-3.5" />,
    bg: 'bg-[#FEF2F2] dark:bg-red-500/10',
    text: 'text-[#B91C1C] dark:text-red-400',
    border: 'border-[#FECACA] dark:border-red-500/25',
  },
  'Awaiting sign-off': {
    icon: <Clock className="w-3.5 h-3.5" />,
    bg: 'bg-[#EFF6FF] dark:bg-blue-500/10',
    text: 'text-[#1D4ED8] dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-500/25',
  },
  Signed: {
    icon: <FileCheck className="w-3.5 h-3.5" />,
    bg: 'bg-[#ECFDF5] dark:bg-emerald-500/15',
    text: 'text-[#065F46] dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-500/30',
  },
  Draft: {
    icon: <FileText className="w-3.5 h-3.5" />,
    bg: 'bg-zinc-100 dark:bg-white/[0.04]',
    text: 'text-zinc-700 dark:text-zinc-300',
    border: 'border-zinc-200 dark:border-white/[0.1]',
  },
  Superseded: {
    icon: <Archive className="w-3.5 h-3.5" />,
    bg: 'bg-zinc-100 dark:bg-white/[0.03]',
    text: 'text-zinc-600 dark:text-zinc-400',
    border: 'border-zinc-200 dark:border-white/[0.08]',
  },
};

export const StatusChip: React.FC<{
  status: StatusType;
  className?: string;
  size?: 'sm' | 'md';
}> = ({ status, className = '', size = 'md' }) => {
  const config = statusMap[status] || statusMap.Draft;
  const sizeStyles = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap shrink-0 font-medium rounded-md border ${config.bg} ${config.text} ${config.border} ${sizeStyles} ${className}`}
    >
      <span className="shrink-0">{config.icon}</span>
      <span>{status}</span>
    </span>
  );
};

export const ConfidenceBadge: React.FC<{
  confidence: number; // 0 to 1 or 0 to 100
  className?: string;
}> = ({ confidence, className = '' }) => {
  const pct = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);

  const colorClass =
    pct >= 90
      ? 'bg-[#ECFDF5] text-[#047857] border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25'
      : pct >= 75
        ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A] dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25'
        : 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA] dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/25';

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap shrink-0 font-mono tabular-nums text-xs font-medium px-2 py-0.5 rounded-md border ${colorClass} ${className}`}
      title={`Extraction confidence: ${pct}%`}
    >
      <span>{pct}% Conf</span>
    </span>
  );
};

export const HeatNumberTag: React.FC<{
  heatNumber: string;
  className?: string;
  showCopy?: boolean;
}> = ({ heatNumber, className = '', showCopy = true }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(heatNumber);
      haptics.tap();
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <span
      onClick={showCopy ? handleCopy : undefined}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 font-mono tabular-nums text-xs font-medium px-2 py-0.5 rounded-md bg-surface-2 border border-border text-text hover:border-zinc-300 dark:hover:border-white/20 transition-colors select-all ${
        showCopy ? 'cursor-pointer' : ''
      } ${className}`}
      title={showCopy ? 'Click to copy heat number' : undefined}
    >
      <span className="text-[#047857] dark:text-emerald-400 font-semibold">#</span>
      <span>{heatNumber}</span>
      {showCopy && (
        <span className="text-text-muted hover:text-text shrink-0 ml-0.5">
          {copied ? (
            <Check className="w-3 h-3 text-[#047857] dark:text-emerald-400" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </span>
      )}
    </span>
  );
};

export const CNCodeTag: React.FC<{
  code: string;
  className?: string;
}> = ({ code, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 font-mono tabular-nums text-xs px-2 py-0.5 rounded-md bg-surface-2 border border-border text-text-muted ${className}`}
      title={`EU CN Code: ${code}`}
    >
      <span className="text-xs text-text-muted font-medium">CN</span>
      <span className="text-text font-semibold">{code}</span>
    </span>
  );
};
