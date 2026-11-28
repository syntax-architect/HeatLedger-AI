import React from 'react';
import { Send, Search, Filter, TrendingUp, TrendingDown, Building2 } from 'lucide-react';
import type { SupplierItem } from './types';

const Sparkline: React.FC<{ data: number[]; color?: string }> = ({ data, color }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 76;
  const height = 22;
  const padding = 3;

  const points = data
    .map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - min) / range) * (height - 2 * padding);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const lastVal = data[data.length - 1] ?? 0;
  const firstVal = data[0] ?? 0;
  const isImproving = lastVal < firstVal;
  const strokeColor = color || (isImproving ? '#059669' : '#DC2626');

  return (
    <div
      className="inline-flex items-center gap-1.5"
      title={`5-Month Defect Trend: ${data.join('% → ')}%`}
    >
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        <circle
          cx={width - padding}
          cy={height - padding - ((lastVal - min) / range) * (height - 2 * padding)}
          r="2.75"
          fill={strokeColor}
        />
      </svg>
      {isImproving ? (
        <TrendingDown className="w-4 h-4 text-[#059669] shrink-0" strokeWidth={1.5} />
      ) : (
        <TrendingUp className="w-4 h-4 text-[#DC2626] shrink-0" strokeWidth={1.5} />
      )}
    </div>
  );
};

export const getRatingBadge = (rating: SupplierItem['rating_grade']) => {
  switch (rating) {
    case 'A':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#ECFDF5] text-[#047857] border border-emerald-200">
          Grade A · Checked
        </span>
      );
    case 'B':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#EFECE5] text-[#18181A] border border-[#18181A]/15">
          Grade B · Standard
        </span>
      );
    case 'C':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
          Grade C · Defect Prone
        </span>
      );
    case 'D':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
          Grade D · High Risk
        </span>
      );
  }
};

interface ScorecardsTabProps {
  suppliers: SupplierItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  gradeFilter: 'ALL' | 'A' | 'B' | 'C' | 'D';
  onGradeFilterChange: (g: 'ALL' | 'A' | 'B' | 'C' | 'D') => void;
  onOpenFixModal: (sup: SupplierItem) => void;
  loading?: boolean;
}

export const ScorecardsTab: React.FC<ScorecardsTabProps> = ({
  suppliers,
  searchQuery,
  onSearchChange,
  gradeFilter,
  onGradeFilterChange,
  onOpenFixModal,
  loading = false,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#78766E] absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search mills, locations, grades..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-xs text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-[#55544E] mr-1 inline-flex items-center gap-1">
            <Filter className="w-4 h-4" strokeWidth={1.5} /> Rating:
          </span>
          {(['ALL', 'A', 'B', 'C', 'D'] as const).map((grade) => (
            <button
              key={grade}
              type="button"
              onClick={() => onGradeFilterChange(grade)}
              className={`h-8 px-2.5 rounded-lg text-xs font-medium transition-colors duration-150 border cursor-pointer ${
                gradeFilter === grade
                  ? 'bg-[#18181A] text-[#FCFBF8] border-[#18181A]'
                  : 'bg-[#FCFBF8] text-[#55544E] hover:text-[#18181A] border-[#18181A]/12 hover:bg-[#EFECE5]'
              }`}
            >
              {grade === 'ALL' ? 'All' : `Grade ${grade}`}
            </button>
          ))}
        </div>
      </div>

      {suppliers.length === 0 ? (
        <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-8 text-center space-y-2">
          <Building2 className="w-6 h-6 text-[#78766E] mx-auto" strokeWidth={1.5} />
          <p className="text-sm font-medium text-[#18181A]">
            {loading ? 'Loading supplier scorecards...' : 'No supplier scorecards yet'}
          </p>
          <p className="text-xs text-[#55544E]">
            Upload Mill Test Certificates in the MTC Workbench to build mill quality scorecards automatically.
          </p>
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {suppliers.map((sup) => (
              <div
                key={sup.id}
                className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-[#18181A]">{sup.name}</h3>
                    <p className="text-xs text-[#55544E] mt-0.5">{sup.plant_location}</p>
                  </div>
                  {getRatingBadge(sup.rating_grade)}
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-center text-xs">
                  <div>
                    <span className="text-xs text-[#55544E] block">Missing Origin</span>
                    <span
                      className={`font-mono tabular-nums font-medium ${
                        sup.missing_melt_pour_pct > 10 ? 'text-[#DC2626]' : 'text-[#047857]'
                      }`}
                    >
                      {sup.missing_melt_pour_pct}%
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[#55544E] block">Low OCR</span>
                    <span
                      className={`font-mono tabular-nums font-medium ${
                        sup.low_confidence_ocr_pct > 15 ? 'text-[#B45309]' : 'text-[#18181A]'
                      }`}
                    >
                      {sup.low_confidence_ocr_pct}%
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[#55544E] block">Lead Time</span>
                    <span className="font-mono tabular-nums font-medium text-[#18181A]">
                      {sup.avg_turnaround_days}d
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="text-[#55544E]">5-Month Defect Trend</span>
                  <Sparkline data={sup.trend_monthly_defect_pct} />
                </div>

                <button
                  type="button"
                  onClick={() => onOpenFixModal(sup)}
                  className="w-full h-9 px-3 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium transition-colors duration-150 flex items-center justify-center gap-2 border border-[#18181A]/12 cursor-pointer"
                >
                  <Send className="w-4 h-4 text-[#B45309]" strokeWidth={1.5} />
                  <span>Request MTC Amendment</span>
                </button>
              </div>
            ))}
          </div>

          <div className="hidden md:block bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#18181A]/10 bg-[#F7F5F0] text-[#55544E]">
                  <th className="py-3 px-4 font-medium">Supplier &amp; Mill</th>
                  <th className="py-3 px-3 font-medium">Rating</th>
                  <th className="py-3 px-3 font-medium">Processed</th>
                  <th className="py-3 px-3 font-medium">Missing Melt/Pour</th>
                  <th className="py-3 px-3 font-medium">Low OCR (&lt;85%)</th>
                  <th className="py-3 px-3 font-medium">Avg Lead Time</th>
                  <th className="py-3 px-4 font-medium">5-Mo Trend</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181A]/10">
                {suppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-[#F7F5F0] transition-colors duration-150">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#18181A] text-sm">{sup.name}</div>
                      <div className="text-xs text-[#55544E] mt-0.5">{sup.plant_location}</div>
                      <div className="text-xs text-[#78766E] font-mono mt-0.5">
                        {sup.layout_fingerprint}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">{getRatingBadge(sup.rating_grade)}</td>
                    <td className="py-3.5 px-3 font-mono tabular-nums font-medium text-[#18181A]">
                      {sup.total_certs_processed} certs
                    </td>
                    <td className="py-3.5 px-3 font-mono tabular-nums">
                      <span
                        className={`font-medium ${
                          sup.missing_melt_pour_pct > 10 ? 'text-[#DC2626]' : 'text-[#047857]'
                        }`}
                      >
                        {sup.missing_melt_pour_pct}%
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono tabular-nums">
                      <span
                        className={`font-medium ${
                          sup.low_confidence_ocr_pct > 15 ? 'text-[#B45309]' : 'text-[#18181A]'
                        }`}
                      >
                        {sup.low_confidence_ocr_pct}%
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono tabular-nums text-[#18181A]">
                      {sup.avg_turnaround_days} days
                    </td>
                    <td className="py-3.5 px-4">
                      <Sparkline data={sup.trend_monthly_defect_pct} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenFixModal(sup)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium border border-[#18181A]/12 transition-colors duration-150 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 text-[#B45309]" strokeWidth={1.5} />
                        <span>Ask to Fix</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
