import React from 'react';
import { FileText, Lock, ChevronRight } from 'lucide-react';

export interface StatTileProps {
  label: string;
  value: string | number;
  delta?: string;
  isPositive?: boolean;
  sparklineData?: number[];
  icon?: React.ReactNode;
  className?: string;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  delta,
  isPositive,
  sparklineData = [12, 18, 14, 22, 28, 25, 32],
  icon,
  className = '',
}) => {
  const min = Math.min(...sparklineData);
  const max = Math.max(...sparklineData);
  const range = max - min || 1;
  const width = 64;
  const height = 24;

  const points = sparklineData
    .map((v, i) => {
      const x = (i / (sparklineData.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div
      className={`p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 flex flex-col justify-between text-left ${className}`}
    >
      <div className="flex items-center justify-between text-[#55544E] text-xs font-medium">
        <span>{label}</span>
        {icon && <span className="text-[#55544E]">{icon}</span>}
      </div>

      <div className="flex items-baseline justify-between mt-2.5">
        <span className="text-2xl font-medium tracking-[-0.025em] text-[#18181A] font-mono tabular-nums">
          {value}
        </span>
        {sparklineData.length > 1 && (
          <svg
            aria-hidden="true"
            className="w-16 h-6 stroke-[#059669] fill-none"
            viewBox={`0 0 ${width} ${height}`}
          >
            <polyline
              points={points}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {delta && (
        <div className="mt-2 text-xs font-medium flex items-center gap-1.5">
          <span
            className={`font-mono tabular-nums ${
              isPositive ? 'text-[#047857]' : 'text-[#B91C1C]'
            }`}
          >
            {delta}
          </span>
          <span className="text-[#55544E]">vs last period</span>
        </div>
      )}
    </div>
  );
};

export interface KeyValueItem {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

export const KeyValueGrid: React.FC<{
  items: KeyValueItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}> = ({ items, columns = 3, className = '' }) => {
  const colClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  }[columns];

  return (
    <div
      className={`grid ${colClass} gap-3.5 p-3.5 rounded-xl bg-[#F7F5F0] border border-[#18181A]/10 ${className}`}
    >
      {items.map((item, idx) => (
        <div key={idx} className="flex flex-col text-left">
          <span className="text-xs font-medium text-[#55544E]">{item.label}</span>
          <span
            className={`text-xs font-medium text-[#18181A] mt-0.5 ${
              item.mono ? 'font-mono tabular-nums' : ''
            }`}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon, title, description, action, className = '' }) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-[#18181A]/15 bg-[#FCFBF8] ${className}`}
    >
      {icon && (
        <div className="w-10 h-10 rounded-lg bg-[#EFECE5] border border-[#18181A]/10 flex items-center justify-center text-[#55544E] mb-3">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium tracking-[-0.015em] text-[#18181A] mb-1">{title}</h3>
      <p className="text-xs text-[#55544E] max-w-sm mb-4 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export const PdfThumbnail: React.FC<{
  fileName: string;
  sizeBytes?: number;
  sha256?: string;
  isImmutable?: boolean;
  className?: string;
  onClick?: () => void;
}> = ({ fileName, sizeBytes, sha256, isImmutable = true, className = '', onClick }) => {
  const sizeMb = sizeBytes ? (sizeBytes / (1024 * 1024)).toFixed(2) : null;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 hover:border-[#18181A]/25 transition-colors duration-150 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="w-10 h-10 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5" strokeWidth={1.5} />
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-[#18181A] truncate">{fileName}</span>
          {isImmutable && (
            <span title="Tamper-evident SHA-256 original preservation">
              <Lock className="w-3 h-3 text-[#047857] shrink-0" strokeWidth={1.5} />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-[#55544E]">
          {sizeMb && <span className="font-mono tabular-nums">{sizeMb} MB</span>}
          {sizeMb && sha256 && <span aria-hidden="true">·</span>}
          {sha256 && (
            <span className="font-mono tabular-nums text-xs truncate max-w-[120px]" title={sha256}>
              {sha256.slice(0, 10)}…
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export interface DataListItem {
  id: string;
  title: string;
  subtitle: string;
  status: React.ReactNode;
  meta: string;
  numeric?: React.ReactNode;
  onClick?: () => void;
}

export const DataList: React.FC<{
  items: DataListItem[];
  className?: string;
}> = ({ items, className = '' }) => {
  return (
    <div
      className={`w-full flex flex-col divide-y divide-[#18181A]/10 rounded-xl border border-[#18181A]/10 bg-[#FCFBF8] overflow-hidden ${className}`}
    >
      {items.map((item) => (
        <div
          key={item.id}
          onClick={item.onClick}
          className={`flex items-center justify-between px-4 py-3 hover:bg-[#F7F5F0] transition-colors duration-150 ${
            item.onClick ? 'cursor-pointer' : ''
          }`}
        >
          <div className="flex-1 min-w-0 pr-3 text-left">
            <div className="flex items-center gap-2">
              <span className="font-mono tabular-nums text-xs font-medium text-[#18181A] truncate">
                {item.title}
              </span>
              {item.status}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-[#55544E]">
              <span className="truncate">{item.subtitle}</span>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap">{item.meta}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {item.numeric && <div>{item.numeric}</div>}
            {item.onClick && <ChevronRight className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />}
          </div>
        </div>
      ))}
    </div>
  );
};
