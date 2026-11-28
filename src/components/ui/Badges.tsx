import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    icon: <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />,
    bg: 'bg-[#ECFDF5]',
    text: 'text-[#047857]',
    border: 'border-emerald-200',
  },
  'Needs review': {
    icon: <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} />,
    bg: 'bg-[#FFFBEB]',
    text: 'text-[#B45309]',
    border: 'border-[#FDE68A]',
  },
  Missing: {
    icon: <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.5} />,
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#B91C1C]',
    border: 'border-[#FECACA]',
  },
  'Out of spec': {
    icon: <XCircle className="w-3.5 h-3.5" strokeWidth={1.5} />,
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#B91C1C]',
    border: 'border-[#FECACA]',
  },
  'Awaiting sign-off': {
    icon: <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />,
    bg: 'bg-[#F7F5F0]',
    text: 'text-[#18181A]',
    border: 'border-[#18181A]/20',
  },
  Signed: {
    icon: <FileCheck className="w-3.5 h-3.5" strokeWidth={1.5} />,
    bg: 'bg-[#ECFDF5]',
    text: 'text-[#065F46]',
    border: 'border-emerald-200',
  },
  Draft: {
    icon: <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />,
    bg: 'bg-[#EFECE5]',
    text: 'text-[#55544E]',
    border: 'border-[#18181A]/10',
  },
  Superseded: {
    icon: <Archive className="w-3.5 h-3.5" strokeWidth={1.5} />,
    bg: 'bg-[#F7F5F0]',
    text: 'text-[#78766E]',
    border: 'border-[#18181A]/10',
  },
};

export const StatusChip: React.FC<{
  status: StatusType;
  className?: string;
  size?: 'sm' | 'md';
}> = ({ status, className = '', size = 'md' }) => {
  const { t } = useTranslation();
  const config = statusMap[status] || statusMap.Draft;
  const sizeStyles = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';

  const statusKeyMap: Record<StatusType, string> = {
    Verified: 'common.verified',
    'Needs review': 'common.needs_review',
    Missing: 'common.missing',
    'Out of spec': 'common.out_of_spec',
    'Awaiting sign-off': 'common.awaiting_sign_off',
    Signed: 'common.signed',
    Draft: 'common.draft',
    Superseded: 'common.superseded',
  };

  const label = t(statusKeyMap[status] || 'common.status', status);

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap shrink-0 font-medium rounded-md border ${config.bg} ${config.text} ${config.border} ${sizeStyles} ${className}`}
    >
      <span className="shrink-0">{config.icon}</span>
      <span>{label}</span>
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
      ? 'bg-[#ECFDF5] text-[#047857] border-emerald-200'
      : pct >= 75
        ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
        : 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]';

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
      className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 font-mono tabular-nums text-xs font-medium px-2 py-0.5 rounded-md bg-[#EFECE5] border border-[#18181A]/10 text-[#18181A] hover:border-[#18181A]/25 transition-colors select-all ${
        showCopy ? 'cursor-pointer' : ''
      } ${className}`}
      title={showCopy ? 'Click to copy heat number' : undefined}
    >
      <span className="text-[#047857] font-medium">#</span>
      <span>{heatNumber}</span>
      {showCopy && (
        <span className="text-[#55544E] hover:text-[#18181A] shrink-0 ml-0.5">
          {copied ? (
            <Check className="w-3 h-3 text-[#047857]" strokeWidth={1.5} />
          ) : (
            <Copy className="w-3 h-3" strokeWidth={1.5} />
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
      className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 font-mono tabular-nums text-xs px-2 py-0.5 rounded-md bg-[#EFECE5] border border-[#18181A]/10 text-[#55544E] ${className}`}
      title={`EU CN Code: ${code}`}
    >
      <span className="text-xs text-[#55544E] font-medium">CN</span>
      <span className="text-[#18181A] font-medium">{code}</span>
    </span>
  );
};
