import React, { useState } from 'react';
import { Table, BarChart3 } from 'lucide-react';

export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  unit?: string;
  category?: string;
}

export interface LazyChartProps {
  title: string;
  description?: string;
  textSummary: string;
  data: ChartDataPoint[];
  primaryLabel?: string;
  secondaryLabel?: string;
  unit?: string;
  className?: string;
}

export const LazyChart: React.FC<LazyChartProps> = ({
  title,
  description,
  textSummary,
  data,
  primaryLabel = 'Primary Value',
  secondaryLabel = 'Benchmark',
  unit = '',
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const maxValue = Math.max(...data.map((d) => Math.max(d.value, d.secondaryValue || 0)), 1);

  return (
    <div
      className={`p-5 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 font-sans text-[#18181A] ${className}`}
      role="region"
      aria-label={title}
    >
      {/* Chart Header with Accessible Table Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#18181A]/10">
        <div>
          <h3 className="text-xs sm:text-sm font-medium text-[#18181A] leading-tight">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-[#55544E] mt-0.5">{description}</p>
          )}
        </div>

        {/* View Toggle: Visual Bar Chart vs Accessible Data Table */}
        <div className="flex items-center gap-1 p-1 bg-[#EFECE5] rounded-lg border border-[#18181A]/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('chart')}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer ${
              viewMode === 'chart'
                ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                : 'text-[#55544E] hover:text-[#18181A]'
            }`}
            aria-pressed={viewMode === 'chart'}
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
            <span>Chart</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer ${
              viewMode === 'table'
                ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                : 'text-[#55544E] hover:text-[#18181A]'
            }`}
            aria-pressed={viewMode === 'table'}
          >
            <Table className="w-3.5 h-3.5 text-[#55544E]" strokeWidth={1.5} />
            <span>Data Table</span>
          </button>
        </div>
      </div>

      {/* Required Text Summary (WCAG accessibility requirement) */}
      <div className="py-2.5 px-3 my-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-xs text-[#55544E] leading-relaxed font-sans">
        <strong className="font-medium text-[#18181A]">Analysis Summary: </strong>
        {textSummary}
      </div>

      {/* Main View: Visual Bars or Accessible Table */}
      {viewMode === 'chart' ? (
        <div className="space-y-3 pt-2">
          {data.map((item, idx) => {
            const pct = Math.round((item.value / maxValue) * 100);
            const secPct = item.secondaryValue
              ? Math.round((item.secondaryValue / maxValue) * 100)
              : 0;

            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#18181A] truncate">
                    {item.label}
                  </span>
                  <div className="flex items-center gap-2 font-mono tabular-nums">
                    <span className="font-medium text-[#18181A]">
                      {item.value} {unit}
                    </span>
                    {item.secondaryValue !== undefined && (
                      <span className="text-[#78766E] text-xs">
                        (Ref: {item.secondaryValue} {unit})
                      </span>
                    )}
                  </div>
                </div>

                {/* Accessible Dual Progress Bar */}
                <div className="relative h-3.5 rounded-md bg-[#EFECE5] overflow-hidden flex items-center">
                  {/* Secondary Benchmark Bar */}
                  {secPct > 0 && (
                    <div
                      style={{ width: `${secPct}%` }}
                      className="absolute inset-y-0 left-0 bg-[#18181A]/20 rounded-md"
                      title={`${secondaryLabel}: ${item.secondaryValue} ${unit}`}
                    />
                  )}
                  {/* Primary Measured Bar */}
                  <div
                    style={{ width: `${pct}%` }}
                    className="relative h-full bg-[#059669] rounded-md transition-[width] duration-300"
                    title={`${primaryLabel}: ${item.value} ${unit}`}
                  />
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div className="flex items-center gap-4 pt-2 text-xs font-mono text-[#55544E]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#059669]" />
              <span>{primaryLabel}</span>
            </div>
            {data.some((d) => d.secondaryValue !== undefined) && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#18181A]/25" />
                <span>{secondaryLabel}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Accessible HTML Data Table View */
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-xs text-left border-collapse">
            <caption className="sr-only">{title} data table</caption>
            <thead>
              <tr className="border-b border-[#18181A]/10 text-[#55544E] font-mono">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Category / Period
                </th>
                <th scope="col" className="py-2 px-4 font-medium text-right">
                  {primaryLabel} ({unit})
                </th>
                {data.some((d) => d.secondaryValue !== undefined) && (
                  <th scope="col" className="py-2 pl-4 font-medium text-right">
                    {secondaryLabel} ({unit})
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18181A]/10 font-mono tabular-nums">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#F7F5F0]">
                  <td className="py-2.5 pr-4 text-[#18181A] font-medium">
                    {row.label}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium text-[#047857]">
                    {row.value.toLocaleString()} {unit}
                  </td>
                  {row.secondaryValue !== undefined && (
                    <td className="py-2.5 pl-4 text-right text-[#55544E]">
                      {row.secondaryValue.toLocaleString()} {unit}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
