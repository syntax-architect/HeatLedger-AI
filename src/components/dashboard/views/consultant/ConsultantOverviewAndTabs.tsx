import React from 'react';
import {
  AlertTriangle,
  Building2,
  Clock,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Layers,
  Palette,
  UserPlus,
} from 'lucide-react';
import { ConsultantPortfolio, WhiteLabelConfig } from '../../../../services/api';

export type ConsultantTab =
  | 'portfolio'
  | 'at-risk'
  | 'review-queue'
  | 'white-label'
  | 'billing-referrals';

interface ConsultantOverviewAndTabsProps {
  whiteLabel: WhiteLabelConfig | null;
  portfolio: ConsultantPortfolio | null;
  selectedClientPlantId: string;
  onSwitchClient: (plantId: string) => void;
  onOpenBulkModal: () => void;
  onOpenInviteModal: () => void;
  activeTab: ConsultantTab;
  onTabChange: (tab: ConsultantTab) => void;
  atRiskCount: number;
  reviewQueueCount: number;
}

export const ConsultantOverviewAndTabs: React.FC<ConsultantOverviewAndTabsProps> = ({
  whiteLabel,
  portfolio,
  selectedClientPlantId,
  onSwitchClient,
  onOpenBulkModal,
  onOpenInviteModal,
  activeTab,
  onTabChange,
  atRiskCount,
  reviewQueueCount,
}) => (
  <>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#18181A]/10">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 font-mono font-medium text-xs"
          style={{ backgroundColor: whiteLabel?.primary_color || '#047857' }}
        >
          {whiteLabel?.firm_name ? whiteLabel.firm_name.slice(0, 2).toUpperCase() : 'CA'}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg sm:text-xl font-medium text-[#18181A] tracking-[-0.02em]">
              {whiteLabel?.firm_name
                ? `${whiteLabel.firm_name} · Consultant & Multi-Plant Headquarters`
                : 'Consultant & Multi-Plant Headquarters'}
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#047857] border border-emerald-200 font-mono text-xs font-medium">
              Multi-Plant RLS Active
            </span>
          </div>
          <p className="text-xs text-[#55544E] mt-0.5">
            {whiteLabel?.tagline ||
              'Manage multiple client factories with strict data isolation, consolidated risk monitoring, and white-label branding.'}
          </p>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2">
        <div className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-xs">
          <Building2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
          <span className="text-[#55544E] font-medium">Active Client:</span>
          <select
            value={selectedClientPlantId}
            onChange={(e) => onSwitchClient(e.target.value)}
            className="font-medium text-[#18181A] bg-transparent focus:outline-none cursor-pointer"
            aria-label="Active Client Plant Switcher"
          >
            <option value="ALL">All Clients (Consolidated Portfolio)</option>
            {portfolio?.client_plants.map((p) => (
              <option key={p.plant_id} value={p.plant_id}>
                {p.plant_name} ({p.plant_code})
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onOpenBulkModal}
          className="h-9 px-3 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] font-medium text-xs flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
          title="Bulk onboard client plants from CSV"
        >
          <FileSpreadsheet className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
          <span className="hidden sm:inline">Bulk CSV Onboard</span>
        </button>

        <button
          type="button"
          onClick={onOpenInviteModal}
          className="h-9 px-3.5 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] font-medium text-xs flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
          title="Invite Client Plant to advisory portfolio"
        >
          <UserPlus className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
          <span>Invite Client Plant</span>
        </button>
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-1">
        <div className="flex items-center justify-between text-[#55544E]">
          <span className="text-xs font-medium">Active Clients</span>
          <Building2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
        </div>
        <div className="text-2xl font-medium text-[#18181A] font-mono tabular-nums">
          {portfolio ? portfolio.active_clients : '...'}
        </div>
        <div className="text-xs text-[#55544E]">Plants under advisory</div>
      </div>

      <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-1">
        <div className="flex items-center justify-between text-[#55544E]">
          <span className="text-xs font-medium">Monitored Volume</span>
          <Layers className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
        </div>
        <div className="text-2xl font-medium text-[#18181A] font-mono tabular-nums">
          {portfolio ? portfolio.monitored_tonnage_mt.toLocaleString('en-IN') : '...'} MT
        </div>
        <div className="text-xs text-[#55544E]">
          Across {portfolio?.total_shipments_monitored || 0} shipments
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-1">
        <div className="flex items-center justify-between text-[#55544E]">
          <span className="text-xs font-medium">At-Risk Batches</span>
          <AlertTriangle className="w-4 h-4 text-[#D97706]" strokeWidth={1.5} />
        </div>
        <div className="text-2xl font-medium text-[#B45309] font-mono tabular-nums">
          {portfolio ? portfolio.at_risk_shipments_count : '...'}
        </div>
        <div className="text-xs text-[#55544E]">Blockers requiring action</div>
      </div>

      <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-1">
        <div className="flex items-center justify-between text-[#55544E]">
          <span className="text-xs font-medium">Review Queue</span>
          <Clock className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
        </div>
        <div className="text-2xl font-medium text-[#18181A] font-mono tabular-nums">
          {portfolio ? portfolio.pending_reviews_count : '...'}
        </div>
        <div className="text-xs text-[#55544E]">Pending sign-off</div>
      </div>

      <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-1 col-span-2 md:col-span-1">
        <div className="flex items-center justify-between text-[#55544E]">
          <span className="text-xs font-medium">Monthly Retainer</span>
          <DollarSign className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
        </div>
        <div className="text-2xl font-medium text-[#047857] font-mono tabular-nums">
          ₹{portfolio ? portfolio.monthly_retainer_inr.toLocaleString('en-IN') : '0'}
        </div>
        <div className="text-xs text-[#55544E]">Consolidated ARR run-rate</div>
      </div>
    </div>

    <div className="flex items-center gap-2 border-b border-[#18181A]/10 text-xs overflow-x-auto">
      <button
        type="button"
        onClick={() => onTabChange('portfolio')}
        className={`pb-2.5 px-3 font-medium border-b-2 transition-colors duration-150 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
          activeTab === 'portfolio'
            ? 'border-[#059669] text-[#047857]'
            : 'border-transparent text-[#55544E] hover:text-[#18181A]'
        }`}
      >
        <Building2 className="w-4 h-4" strokeWidth={1.5} />
        <span>Client Factories ({portfolio?.client_plants.length || 0})</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('at-risk')}
        className={`pb-2.5 px-3 font-medium border-b-2 transition-colors duration-150 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
          activeTab === 'at-risk'
            ? 'border-[#059669] text-[#047857]'
            : 'border-transparent text-[#55544E] hover:text-[#18181A]'
        }`}
      >
        <AlertTriangle className="w-4 h-4 text-[#D97706]" strokeWidth={1.5} />
        <span>Cross-Client At-Risk Radar ({atRiskCount})</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('review-queue')}
        className={`pb-2.5 px-3 font-medium border-b-2 transition-colors duration-150 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
          activeTab === 'review-queue'
            ? 'border-[#059669] text-[#047857]'
            : 'border-transparent text-[#55544E] hover:text-[#18181A]'
        }`}
      >
        <Clock className="w-4 h-4" strokeWidth={1.5} />
        <span>Review Queue ({reviewQueueCount})</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('white-label')}
        className={`pb-2.5 px-3 font-medium border-b-2 transition-colors duration-150 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
          activeTab === 'white-label'
            ? 'border-[#059669] text-[#047857]'
            : 'border-transparent text-[#55544E] hover:text-[#18181A]'
        }`}
      >
        <Palette className="w-4 h-4" strokeWidth={1.5} />
        <span>White-Label Branding</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('billing-referrals')}
        className={`pb-2.5 px-3 font-medium border-b-2 transition-colors duration-150 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
          activeTab === 'billing-referrals'
            ? 'border-[#059669] text-[#047857]'
            : 'border-transparent text-[#55544E] hover:text-[#18181A]'
        }`}
      >
        <FileText className="w-4 h-4" strokeWidth={1.5} />
        <span>Invoicing &amp; Referrals</span>
      </button>
    </div>
  </>
);
