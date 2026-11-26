import React from 'react';
import { Check, Leaf, Sliders, SlidersHorizontal, Zap } from 'lucide-react';
import { CbamEnergyBill, CbamFuelType } from './cbamCalculations';

interface CbamInputsColumnProps {
  mobileStep: 1 | 2 | 3;
  monthlyGridKwh: number;
  onMonthlyGridKwhChange: (v: number) => void;
  monthlyFuelLiters: number;
  onMonthlyFuelLitersChange: (v: number) => void;
  monthlyProductionMT: number;
  onMonthlyProductionMTChange: (v: number) => void;
  upstreamPrecursorSee: number;
  onUpstreamPrecursorSeeChange: (v: number) => void;
  energyBills: CbamEnergyBill[];
  onConfirmBill: (billId: string) => void;
  gridRenewableSharePct: number;
  onGridRenewableSharePctChange: (v: number) => void;
  scrapContentPct: number;
  onScrapContentPctChange: (v: number) => void;
  fuelType: CbamFuelType;
  onFuelTypeChange: (f: CbamFuelType) => void;
}

export const CbamInputsColumn: React.FC<CbamInputsColumnProps> = ({
  mobileStep,
  monthlyGridKwh,
  onMonthlyGridKwhChange,
  monthlyFuelLiters,
  onMonthlyFuelLitersChange,
  monthlyProductionMT,
  onMonthlyProductionMTChange,
  upstreamPrecursorSee,
  onUpstreamPrecursorSeeChange,
  energyBills,
  onConfirmBill,
  gridRenewableSharePct,
  onGridRenewableSharePctChange,
  scrapContentPct,
  onScrapContentPctChange,
  fuelType,
  onFuelTypeChange,
}) => (
  <div className={`lg:col-span-5 space-y-6 ${mobileStep === 3 ? 'hidden lg:block' : 'block'}`}>
    <div
      className={`bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 sm:p-6 space-y-4 ${
        mobileStep === 2 ? 'hidden lg:block' : 'block'
      }`}
    >
      <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
        <h3 className="text-xs font-medium text-[#18181A] flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#B45309]" strokeWidth={1.5} />
          <span>Installation Energy &amp; Activity Data</span>
        </h3>
        <span className="text-xs font-mono tabular-nums text-[#047857] bg-[#ECFDF5] px-2 py-0.5 rounded border border-emerald-200 font-medium">
          33 kV Feeder
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="text-xs font-medium text-[#55544E] block mb-1">
            Grid Electricity (kWh):
          </label>
          <input
            type="number"
            value={monthlyGridKwh}
            onChange={(e) => onMonthlyGridKwhChange(Number(e.target.value))}
            className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono tabular-nums text-xs font-medium focus:outline-none focus:border-[#059669]"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-[#55544E] block mb-1">
            Monthly Fuel (Liters):
          </label>
          <input
            type="number"
            value={monthlyFuelLiters}
            onChange={(e) => onMonthlyFuelLitersChange(Number(e.target.value))}
            className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono tabular-nums text-xs font-medium focus:outline-none focus:border-[#059669]"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-[#55544E] block mb-1">
            Finished Production (MT):
          </label>
          <input
            type="number"
            value={monthlyProductionMT}
            onChange={(e) => onMonthlyProductionMTChange(Number(e.target.value))}
            className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono tabular-nums text-xs font-medium focus:outline-none focus:border-[#059669]"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-[#55544E] block mb-1">
            Upstream Precursor SEE:
          </label>
          <input
            type="number"
            step="0.01"
            value={upstreamPrecursorSee}
            onChange={(e) => onUpstreamPrecursorSeeChange(Number(e.target.value))}
            className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono tabular-nums text-xs font-medium focus:outline-none focus:border-[#059669]"
          />
        </div>
      </div>

      <div className="pt-3 border-t border-[#18181A]/10 space-y-2">
        <span className="text-xs font-medium text-[#55544E] block">
          OCR Extracted Energy Bills (Human Confirmed):
        </span>
        <div className="space-y-2">
          {energyBills.map((bill) => (
            <div
              key={bill.id}
              className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 flex items-center justify-between gap-2 text-xs"
            >
              <div className="min-w-0">
                <div className="font-medium text-[#18181A] truncate">
                  {bill.provider} ·{' '}
                  <span className="font-mono tabular-nums">
                    {bill.units.toLocaleString()} {bill.measure}
                  </span>
                </div>
                <div className="text-[#55544E] font-mono tabular-nums text-xs mt-0.5 truncate">
                  ₹{bill.amountInr.toLocaleString()} · File: {bill.fileName}
                </div>
              </div>
              {bill.confirmed ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#ECFDF5] text-[#047857] border border-emerald-200 text-xs font-medium shrink-0">
                  <Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
                  Confirmed
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onConfirmBill(bill.id)}
                  className="h-8 px-2.5 rounded bg-[#FFFBEB] hover:bg-amber-100 text-[#B45309] border border-[#FDE68A] text-xs font-medium transition-colors duration-150 shrink-0 cursor-pointer"
                >
                  Confirm OCR
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>

    <div
      className={`bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 sm:p-6 space-y-5 ${
        mobileStep === 1 ? 'hidden lg:block' : 'block'
      }`}
    >
      <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-3">
        <h3 className="text-xs font-medium text-[#18181A] flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          <span>What-If Decarbonization Sliders</span>
        </h3>
        <span className="text-xs font-mono text-[#047857] bg-[#ECFDF5] px-2 py-0.5 rounded font-medium border border-emerald-200">
          Live Simulation
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-medium text-[#18181A] flex items-center gap-1.5">
            <Leaf className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
            Grid Renewable Share (Solar/Green PPA):
          </span>
          <span className="font-mono tabular-nums font-medium text-[#047857] bg-[#ECFDF5] px-2 py-0.5 rounded border border-emerald-200">
            {gridRenewableSharePct}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={gridRenewableSharePct}
          onChange={(e) => onGridRenewableSharePctChange(Number(e.target.value))}
          className="w-full accent-[#059669] cursor-pointer"
        />
        <div className="flex justify-between text-xs font-mono text-[#78766E]">
          <span>0% (Full Grid)</span>
          <span>50% (Green Tariff)</span>
          <span>100% (Zero Indirect)</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-medium text-[#18181A] flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
            Recycled Scrap Input Content:
          </span>
          <span className="font-mono tabular-nums font-medium text-[#18181A] bg-[#EFECE5] px-2 py-0.5 rounded border border-[#18181A]/12">
            {scrapContentPct}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="0.5"
          value={scrapContentPct}
          onChange={(e) => onScrapContentPctChange(Number(e.target.value))}
          className="w-full accent-[#18181A] cursor-pointer"
        />
        <div className="flex justify-between text-xs font-mono text-[#78766E]">
          <span>0% Primary Pig Iron</span>
          <span>50% Circular Blend</span>
          <span>100% EAF Scrap Route</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-[#18181A] block">
          Furnace Reheating Fuel Mix:
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onFuelTypeChange('LIGHT_FUEL_OIL')}
            className={`p-2 rounded-lg text-xs font-medium text-center border transition-colors duration-150 cursor-pointer ${
              fuelType === 'LIGHT_FUEL_OIL'
                ? 'bg-[#18181A] text-[#FCFBF8] border-[#18181A]'
                : 'bg-[#F7F5F0] text-[#55544E] border-[#18181A]/12 hover:bg-[#EFECE5] hover:text-[#18181A]'
            }`}
          >
            Light Fuel Oil
            <span className="block font-mono tabular-nums text-xs opacity-80 mt-0.5">2.68 kg/L</span>
          </button>

          <button
            type="button"
            onClick={() => onFuelTypeChange('NATURAL_GAS')}
            className={`p-2 rounded-lg text-xs font-medium text-center border transition-colors duration-150 cursor-pointer ${
              fuelType === 'NATURAL_GAS'
                ? 'bg-[#18181A] text-[#FCFBF8] border-[#18181A]'
                : 'bg-[#F7F5F0] text-[#55544E] border-[#18181A]/12 hover:bg-[#EFECE5] hover:text-[#18181A]'
            }`}
          >
            Natural Gas
            <span className="block font-mono tabular-nums text-xs opacity-80 mt-0.5">1.98 kg/m³</span>
          </button>

          <button
            type="button"
            onClick={() => onFuelTypeChange('GREEN_HYDROGEN')}
            className={`p-2 rounded-lg text-xs font-medium text-center border transition-colors duration-150 cursor-pointer ${
              fuelType === 'GREEN_HYDROGEN'
                ? 'bg-[#059669] text-white border-[#059669]'
                : 'bg-[#ECFDF5] text-[#047857] border-emerald-200 hover:bg-emerald-100/70'
            }`}
          >
            Green H₂
            <span className="block font-mono tabular-nums text-xs opacity-80 mt-0.5">0.00 kg/kg</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);
