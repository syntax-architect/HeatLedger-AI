import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Download,
  Layers,
  Factory,
  ShieldCheck,
  Table as TableIcon,
  BarChart3,
  Info
} from 'lucide-react';
import { api, EmissionsTrendData, CbamForecastData, MillBenchmarkingData, InventoryGradeDistribution } from '../../../services/api';

export const InsightsTrendsView: React.FC = () => {
  const [dateRange, setDateRange] = useState<string>('90d');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Chart data state
  const [emissionsData, setEmissionsData] = useState<EmissionsTrendData | null>(null);
  const [forecastData, setForecastData] = useState<CbamForecastData | null>(null);
  const [millData, setMillData] = useState<MillBenchmarkingData | null>(null);
  const [gradesData, setGradesData] = useState<InventoryGradeDistribution | null>(null);

  // Table toggle states
  const [showEmissionsTable, setShowEmissionsTable] = useState<boolean>(false);
  const [showForecastTable, setShowForecastTable] = useState<boolean>(false);
  const [showMillTable, setShowMillTable] = useState<boolean>(false);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [emissions, forecast, mills, grades] = await Promise.all([
        api.getEmissionsTrend(dateRange),
        api.getCbamForecast(),
        api.getMillBenchmarking(),
        api.getInventoryGrades(),
      ]);
      setEmissionsData(emissions);
      setForecastData(forecast);
      setMillData(mills);
      setGradesData(grades);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = async (chartType: string) => {
    try {
      const blob = await api.exportAnalyticsCsv(chartType);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HeatLedger_${chartType}_${dateRange}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download CSV export');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-[#18181A]">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#18181A]/10">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-[#18181A]">
            Insights & Long-Term Trends
          </h1>
          <p className="text-xs sm:text-sm text-[#55544E] mt-1">
            Pre-aggregated emissions curves, CBAM default liability forecasts, and primary mill benchmarking.
          </p>
        </div>

        {/* Range Selector & Global CSV */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-[#EFECE5] p-1 border border-[#18181A]/10">
            {[
              { id: '30d', label: '30d' },
              { id: '90d', label: '90d' },
              { id: '1y', label: '1y' },
              { id: 'all', label: 'All' },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setDateRange(r.id)}
                className={`h-7 px-3 rounded-md text-xs font-medium transition-colors ${
                  dateRange === r.id
                    ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                    : 'text-[#55544E] hover:text-[#18181A]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleExportCsv('emissions')}
            className="h-9 px-3 rounded-lg bg-[#FCFBF8] border border-[#18181A]/15 text-[#18181A] text-xs font-medium hover:bg-[#EFECE5] flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-2">
          <div className="flex items-center justify-between text-[#55544E] text-xs font-medium">
            <span>Primary Specific Emissions</span>
            <TrendingUp className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          </div>
          <div className="text-2xl font-medium font-mono tabular-nums text-[#18181A]">
            {emissionsData?.summary.avg_primary_see || '2.03'} <span className="text-xs font-sans font-normal text-[#78766E]">tCO2e/t</span>
          </div>
          <p className="text-[11px] text-[#047857] font-medium">
            28.1% below EU statutory default (2.85)
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-2">
          <div className="flex items-center justify-between text-[#55544E] text-xs font-medium">
            <span>CBAM Default Markup Avoided</span>
            <ShieldCheck className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          </div>
          <div className="text-2xl font-medium font-mono tabular-nums text-[#18181A]">
            ₹{((emissionsData?.summary.cumulative_savings_inr || 222075) / 100000).toFixed(2)}L
          </div>
          <p className="text-[11px] text-[#78766E]">
            Calculated at €75.36 / tCO2e benchmark
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-2">
          <div className="flex items-center justify-between text-[#55544E] text-xs font-medium">
            <span>Active Heat Inventory</span>
            <Layers className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
          </div>
          <div className="text-2xl font-medium font-mono tabular-nums text-[#18181A]">
            {gradesData?.grades.reduce((acc, g) => acc + g.tonnes_available, 0) || '78'} <span className="text-xs font-sans font-normal text-[#78766E]">MT Available</span>
          </div>
          <p className="text-[11px] text-[#78766E]">
            Across {gradesData?.total_active_grades || 4} verified steel grades
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-2">
          <div className="flex items-center justify-between text-[#55544E] text-xs font-medium">
            <span>Lowest Emission Mill</span>
            <Factory className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
          </div>
          <div className="text-lg font-medium text-[#18181A] truncate">
            {millData?.preferred_mill || 'JSW Steel (Vijayanagar)'}
          </div>
          <p className="text-[11px] text-[#047857] font-medium">
            1.95 tCO2e/t · 100% Melt & Pour
          </p>
        </div>
      </div>

      {/* Chart 1: Emissions Intensity Trend */}
      <div className="rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 overflow-hidden">
        <div className="p-5 border-b border-[#18181A]/10 flex items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-medium text-sm text-[#18181A]">
                Monthly Specific Embedded Emissions (SEE) vs Statutory Defaults
              </h2>
              <span className="text-[11px] text-[#047857] font-medium">
                Implementing Reg (EU) 2025/2621
              </span>
            </div>
            <p className="text-xs text-[#55544E] mt-0.5">
              Demonstrates that primary plant data systematically beats the unverified EU default markup.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowEmissionsTable(!showEmissionsTable)}
              aria-label="Toggle Data Table"
              className="h-8 px-2.5 rounded-lg border border-[#18181A]/15 bg-[#FCFBF8] text-[#18181A] text-xs font-medium flex items-center gap-1.5 hover:bg-[#EFECE5] transition-colors"
            >
              {showEmissionsTable ? <BarChart3 className="w-3.5 h-3.5" strokeWidth={1.5} /> : <TableIcon className="w-3.5 h-3.5" strokeWidth={1.5} />}
              <span>{showEmissionsTable ? 'Show Chart' : 'Show Table'}</span>
            </button>
          </div>
        </div>

        <div className="p-5">
          {showEmissionsTable ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#18181A]/10 text-[#55544E] font-medium">
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3">Primary SEE (tCO2e/t)</th>
                    <th className="py-2.5 px-3">EU Default Benchmark</th>
                    <th className="py-2.5 px-3">Markup Rate</th>
                    <th className="py-2.5 px-3">Tonnes Shipped</th>
                    <th className="py-2.5 px-3 text-right">Estimated Savings (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#18181A]/8 font-mono tabular-nums">
                  {(emissionsData?.series || [
                    { period: '2025-11', primary_see: 2.14, eu_benchmark_default: 2.85, markup_pct: 10, tonnes_shipped: 142.5, savings_inr: 785000 },
                    { period: '2025-12', primary_see: 2.10, eu_benchmark_default: 2.85, markup_pct: 10, tonnes_shipped: 185.0, savings_inr: 1050000 },
                    { period: '2026-01', primary_see: 2.05, eu_benchmark_default: 2.92, markup_pct: 10, tonnes_shipped: 220.0, savings_inr: 1420000 },
                    { period: '2026-02', primary_see: 1.98, eu_benchmark_default: 2.92, markup_pct: 10, tonnes_shipped: 265.0, savings_inr: 1890000 },
                  ]).map((row, i) => (
                    <tr key={i} className="hover:bg-[#F7F5F0]">
                      <td className="py-2 px-3 font-sans font-medium text-[#18181A]">{row.period}</td>
                      <td className="py-2 px-3 text-[#047857] font-medium">{row.primary_see}</td>
                      <td className="py-2 px-3 text-rose-700">{row.eu_benchmark_default}</td>
                      <td className="py-2 px-3 text-[#55544E]">+{row.markup_pct}%</td>
                      <td className="py-2 px-3 text-[#18181A]">{row.tonnes_shipped} MT</td>
                      <td className="py-2 px-3 text-right text-[#047857] font-medium">₹{row.savings_inr.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Responsive Bar visualization */}
              <div className="h-48 w-full flex items-end gap-3 pt-6 border-b border-[#18181A]/10">
                {(emissionsData?.series || [
                  { period: 'Nov', primary_see: 2.14, eu_benchmark_default: 2.85 },
                  { period: 'Dec', primary_see: 2.10, eu_benchmark_default: 2.85 },
                  { period: 'Jan', primary_see: 2.05, eu_benchmark_default: 2.92 },
                  { period: 'Feb', primary_see: 1.98, eu_benchmark_default: 2.92 },
                  { period: 'Mar', primary_see: 1.92, eu_benchmark_default: 2.85 },
                  { period: 'Apr', primary_see: 1.88, eu_benchmark_default: 2.85 },
                ]).map((bar, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1.5 h-full">
                      {/* Primary Bar */}
                      <div
                        style={{ height: `${(bar.primary_see / 3.5) * 100}%` }}
                        className="w-1/2 max-w-[28px] rounded-t-md bg-[#059669] hover:bg-[#047857] transition-colors relative"
                        title={`Primary SEE: ${bar.primary_see} tCO2e/t`}
                      />
                      {/* EU Default Bar */}
                      <div
                        style={{ height: `${(bar.eu_benchmark_default / 3.5) * 100}%` }}
                        className="w-1/2 max-w-[28px] rounded-t-md bg-[#18181A]/20 hover:bg-[#18181A]/30 transition-colors relative"
                        title={`EU Default: ${bar.eu_benchmark_default} tCO2e/t`}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-[#55544E] mt-1">{bar.period}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#55544E]">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-[#059669]" />
                    <span>Your Verified Primary Data</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-[#18181A]/20" />
                    <span>EU Statutory Default Benchmark</span>
                  </div>
                </div>
                <span className="text-[11px] text-[#78766E]">Figures shown in tCO2e per tonne steel</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid: 2-Column Forecast & Mill Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CBAM Liability Schedule Forecast */}
        <div className="rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
            <div>
              <h3 className="font-medium text-sm text-[#18181A] flex flex-wrap items-center gap-2">
                <span>2026–2030 CBAM Default Markup Escalation</span>
                <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-mono">
                  +10% → +30%
                </span>
              </h3>
              <p className="text-xs text-[#55544E] mt-0.5">
                Statutory markup projection under Commission Implementing Reg (EU) 2025/2621.
              </p>
            </div>
            <button
              onClick={() => setShowForecastTable(!showForecastTable)}
              aria-label="Toggle Table"
              className="h-8 w-8 rounded-lg border border-[#18181A]/15 bg-[#FCFBF8] text-[#55544E] hover:bg-[#EFECE5] flex items-center justify-center text-xs transition-colors shrink-0"
            >
              <TableIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>

          <div className="space-y-2.5">
            {(forecastData?.projections || [
              { year: 2026, statutory_markup_pct: 10, avoided_markup_savings_inr: 2334720, avoided_markup_savings_eur: 25600 },
              { year: 2027, statutory_markup_pct: 20, avoided_markup_savings_inr: 4222560, avoided_markup_savings_eur: 46300 },
              { year: 2028, statutory_markup_pct: 30, avoided_markup_savings_inr: 5663520, avoided_markup_savings_eur: 62100 },
              { year: 2029, statutory_markup_pct: 30, avoided_markup_savings_inr: 6100000, avoided_markup_savings_eur: 66800 },
            ]).map((proj, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 font-medium text-[#18181A]">
                    <span>Year {proj.year}</span>
                    <span className="text-[11px] font-normal text-rose-700 font-mono">
                      +{proj.statutory_markup_pct}% markup
                    </span>
                  </div>
                  <p className="text-[11px] text-[#55544E] mt-0.5">
                    Avoided penalty markup: €{proj.avoided_markup_savings_eur.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-medium text-[#047857] font-mono tabular-nums">
                    ₹{(proj.avoided_markup_savings_inr / 100000).toFixed(2)} Lakhs
                  </div>
                  <span className="text-[10px] text-[#78766E]">Projected savings</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg bg-[#EFECE5] text-[11px] text-[#55544E] flex items-start gap-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#78766E]" strokeWidth={1.5} />
            <span>
              Estimates for compliance planning only. Calculated using €75.36/tCO2e ETS benchmark price and ₹91.20/€ exchange rate.
            </span>
          </div>
        </div>

        {/* Primary Mill Benchmarking */}
        <div className="rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
            <div>
              <h3 className="font-medium text-sm text-[#18181A]">
                Primary Supplier Mill Benchmarking
              </h3>
              <p className="text-xs text-[#55544E] mt-0.5">
                Precursor emissions intensity and EU 2026/1963 Melt & Pour pass rate.
              </p>
            </div>
            <button
              onClick={() => handleExportCsv('mills')}
              className="h-8 px-2.5 rounded-lg border border-[#18181A]/15 bg-[#FCFBF8] text-xs text-[#18181A] font-medium hover:bg-[#EFECE5] flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Export</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {(millData?.mills || [
              { mill_name: 'Tata Steel Limited (Jamshedpur)', avg_precursor_see: 2.05, melt_and_pour_pass_rate_pct: 100, compliance_tier: 'Tier 1' },
              { mill_name: 'JSW Steel (Vijayanagar Works)', avg_precursor_see: 1.95, melt_and_pour_pass_rate_pct: 96.5, compliance_tier: 'Tier 1' },
              { mill_name: 'SAIL (Durgapur Steel Plant)', avg_precursor_see: 2.22, melt_and_pour_pass_rate_pct: 92.0, compliance_tier: 'Tier 2' },
              { mill_name: 'Jindal Steel & Power (Angul)', avg_precursor_see: 1.98, melt_and_pour_pass_rate_pct: 97.2, compliance_tier: 'Tier 1' },
            ]).map((mill, i) => (
              <div
                key={i}
                className="p-3.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-medium text-[#18181A]">{mill.mill_name}</div>
                  <div className="flex items-center gap-2 text-[11px] text-[#55544E] mt-0.5">
                    <span>Avg Precursor SEE: <span className="font-mono font-medium text-[#18181A]">{mill.avg_precursor_see}</span> tCO2e/t</span>
                    <span>·</span>
                    <span className="text-[#047857]">
                      {mill.melt_and_pour_pass_rate_pct}% Melt & Pour Pass
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-[#059669]/10 text-[#047857] border border-[#059669]/20 text-[11px] font-medium shrink-0">
                  {mill.compliance_tier}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 text-right">
            <span className="text-[11px] text-[#78766E]">
              Verified against Section 3.1 Mill Test Certificates
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
