import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  UserPlus,
  DollarSign,
  Palette,
  FileSpreadsheet,
  FileText,
  Copy,
  ChevronRight,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';
import {
  api,
  ConsultantPortfolio,
  ClientPlantAccess,
  AtRiskShipmentCrossClient,
  CrossClientReviewItem,
  WhiteLabelConfig,
  ConsolidatedInvoice,
  ConsultantReferralInfo,
} from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../ui/ToastContext';

type ConsultantTab = 'portfolio' | 'at-risk' | 'review-queue' | 'white-label' | 'billing-referrals';

export const ConsultantPortalView: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<ConsultantTab>('portfolio');
  const [loading, setLoading] = useState<boolean>(true);

  // Data states
  const [portfolio, setPortfolio] = useState<ConsultantPortfolio | null>(null);
  const [atRiskShipments, setAtRiskShipments] = useState<AtRiskShipmentCrossClient[]>([]);
  const [reviewQueue, setReviewQueue] = useState<CrossClientReviewItem[]>([]);
  const [whiteLabel, setWhiteLabel] = useState<WhiteLabelConfig | null>(null);
  const [invoice, setInvoice] = useState<ConsolidatedInvoice | null>(null);
  const [referrals, setReferrals] = useState<ConsultantReferralInfo | null>(null);

  // Filters & Top Bar Client Switcher
  const [selectedClientPlantId, setSelectedClientPlantId] = useState<string>('ALL');
  const [plantFilter, setPlantFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [isRevokingPlantId, setIsRevokingPlantId] = useState<string | null>(null);

  // Form states for Invite
  const [inviteName, setInviteName] = useState<string>('');
  const [inviteCode, setInviteCode] = useState<string>('');
  const [inviteGst, setInviteGst] = useState<string>('');
  const [inviteLocation, setInviteLocation] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<string>('QA_CONSULTANT');
  const [inviteDays, setInviteDays] = useState<number>(365);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState<boolean>(false);

  // Form states for Bulk Onboarding
  const [bulkCsvText, setBulkCsvText] = useState<string>(
    'client_name,plant_code,gst_or_pan,location,role,duration_days\n' +
    'Asansol Steel Castings,ASC-01,19AACCA1234A1Z1,Asansol West Bengal,QA_CONSULTANT,365\n' +
    'Bhilai Heavy Forgings,BHF-02,22AACCB5678B1Z2,Bhilai Chhattisgarh,COMPLIANCE_MANAGER,365\n'
  );
  const [isSubmittingBulk, setIsSubmittingBulk] = useState<boolean>(false);

  // White label edit state
  const [wlFirmName, setWlFirmName] = useState<string>('');
  const [wlLogoUrl, setWlLogoUrl] = useState<string>('');
  const [wlPrimaryColor, setWlPrimaryColor] = useState<string>('#047857');
  const [wlSecondaryColor, setWlSecondaryColor] = useState<string>('#065f46');
  const [wlCustomDomain, setWlCustomDomain] = useState<string>('');
  const [wlTagline, setWlTagline] = useState<string>('');
  const [wlShowPdf, setWlShowPdf] = useState<boolean>(true);
  const [wlShowPortal, setWlShowPortal] = useState<boolean>(true);
  const [isSavingWl, setIsSavingWl] = useState<boolean>(false);

  // Load Main Portfolio Data
  const loadConsultantData = useCallback(async () => {
    setLoading(true);
    try {
      const [portData, riskData, queueData, wlData, refData, invData] = await Promise.all([
        api.fetchConsultantPortfolio(),
        api.fetchCrossClientAtRiskShipments(),
        api.fetchCrossClientReviewQueue(),
        api.fetchWhiteLabelConfig(),
        api.fetchConsultantReferrals(),
        api.fetchConsolidatedInvoice('2026-04'),
      ]);

      setPortfolio(portData);
      setAtRiskShipments(riskData);
      setReviewQueue(queueData);
      setWhiteLabel(wlData);
      setReferrals(refData);
      setInvoice(invData);

      // Seed white label editing state
      if (wlData) {
        setWlFirmName(wlData.firm_name || '');
        setWlLogoUrl(wlData.logo_url || '');
        setWlPrimaryColor(wlData.primary_color || '#047857');
        setWlSecondaryColor(wlData.secondary_color || '#065f46');
        setWlCustomDomain(wlData.custom_domain || '');
        setWlTagline(wlData.tagline || '');
        setWlShowPdf(wlData.show_consultant_brand_on_pdf);
        setWlShowPortal(wlData.show_consultant_brand_on_portal);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to load consultant data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadConsultantData();
  }, [loadConsultantData]);

  // Client plant switcher handler
  const handleSwitchClient = async (plantId: string) => {
    setSelectedClientPlantId(plantId);
    try {
      const filtered = await api.fetchCrossClientAtRiskShipments(plantId === 'ALL' ? undefined : plantId);
      setAtRiskShipments(filtered);
      addToast(
        plantId === 'ALL'
          ? 'Switched to Consolidated View (All Clients)'
          : `Switched context to client plant: ${plantId}`,
        'info'
      );
    } catch (err: any) {
      addToast(err.message || 'Failed to switch client plant context', 'error');
    }
  };

  // Invite client plant submission
  const handleInviteClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteCode.trim()) {
      addToast('Plant name and code are mandatory', 'error');
      return;
    }
    setIsSubmittingInvite(true);
    try {
      const plantId = `PLANT-${inviteCode.trim().replace(/\s+/g, '-').toUpperCase()}`;
      await api.inviteClientPlant({
        plant_id: plantId,
        plant_name: inviteName.trim(),
        plant_code: inviteCode.trim(),
        gst_or_pan: inviteGst.trim(),
        location: inviteLocation.trim() || 'India',
        role: inviteRole,
        duration_days: inviteDays,
      });
      addToast(`Client plant ${inviteName} invited successfully with 1-year access grant`, 'success');
      setIsInviteModalOpen(false);
      setInviteName('');
      setInviteCode('');
      setInviteGst('');
      setInviteLocation('');
      await loadConsultantData();
    } catch (err: any) {
      addToast(err.message || 'Failed to invite client plant', 'error');
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  // Bulk CSV onboarding submission
  const handleBulkOnboard = async () => {
    if (!bulkCsvText.trim()) return;
    setIsSubmittingBulk(true);
    try {
      const res = await api.bulkOnboardClientsCsv(bulkCsvText);
      addToast(`Bulk onboarding complete: ${res.successfully_onboarded_count} plants attached, ${res.error_count} errors.`, 'success');
      setIsBulkModalOpen(false);
      await loadConsultantData();
    } catch (err: any) {
      addToast(err.message || 'Bulk onboarding failed', 'error');
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  // Revoke client access (Plant Data Sovereignty)
  const handleRevokeAccess = async (plantId: string) => {
    try {
      await api.revokeClientPlantAccess({ plant_id: plantId });
      addToast(`Access to ${plantId} revoked in compliance with Plant Data Sovereignty`, 'success');
      setIsRevokingPlantId(null);
      await loadConsultantData();
    } catch (err: any) {
      addToast(err.message || 'Failed to revoke access', 'error');
    }
  };

  const handleConfirmRevocation = async () => {
    if (!isRevokingPlantId) return;
    await handleRevokeAccess(isRevokingPlantId);
  };

  // Save White-Label settings
  const handleSaveWhiteLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWl(true);
    try {
      const updated = await api.updateWhiteLabelConfig({
        firm_name: wlFirmName,
        logo_url: wlLogoUrl,
        primary_color: wlPrimaryColor,
        secondary_color: wlSecondaryColor,
        custom_domain: wlCustomDomain,
        tagline: wlTagline,
        show_consultant_brand_on_pdf: wlShowPdf,
        show_consultant_brand_on_portal: wlShowPortal,
      });
      setWhiteLabel(updated);
      addToast('White-label branding updated. Mandatory Clause 6 verification footer preserved.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to update branding', 'error');
    } finally {
      setIsSavingWl(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast(`${label} copied to clipboard`, 'success');
  };

  // Filtered plants
  const filteredPlants = useMemo(() => {
    if (!portfolio?.client_plants) return [];
    return portfolio.client_plants.filter((p) => {
      const matchesSearch =
        !searchQuery.trim() ||
        p.plant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.plant_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.location && p.location.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilter =
        plantFilter === 'ALL' ||
        (plantFilter === 'ACTIVE' && p.status === 'ACTIVE') ||
        (plantFilter === 'REVOKED' && p.status === 'REVOKED');
      return matchesSearch && matchesFilter;
    });
  }, [portfolio, searchQuery, plantFilter]);

  // Filtered at-risk shipments
  const filteredAtRisk = useMemo(() => {
    return atRiskShipments.filter((s) => {
      const matchesPlant = selectedClientPlantId === 'ALL' || s.plant_id === selectedClientPlantId;
      return matchesPlant;
    });
  }, [atRiskShipments, selectedClientPlantId]);

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header & Consultant White-Label Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0 font-bold text-sm"
            style={{ backgroundColor: whiteLabel?.primary_color || '#047857' }}
          >
            {whiteLabel?.firm_name ? whiteLabel.firm_name.slice(0, 2).toUpperCase() : 'CA'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {whiteLabel?.firm_name
                  ? `${whiteLabel.firm_name} · Consultant & Multi-Plant Headquarters`
                  : 'Consultant & Multi-Plant Headquarters'}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono text-xs font-bold">
                Multi-Plant RLS Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {whiteLabel?.tagline || 'Manage multiple client factories with strict data isolation, consolidated risk monitoring, and white-label branding.'}
            </p>
          </div>
        </div>

        {/* Action Controls & Top Bar Client Switcher */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Top Bar Client Switcher */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm text-xs">
            <Building2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-slate-500 font-medium">Active Client:</span>
            <select
              value={selectedClientPlantId}
              onChange={(e) => handleSwitchClient(e.target.value)}
              className="font-semibold text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none cursor-pointer"
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
            onClick={() => setIsBulkModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            title="Bulk onboard client plants from CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Bulk CSV Onboard</span>
          </button>

          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            title="Invite Client Plant to advisory portfolio"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400 dark:text-slate-950" />
            <span>Invite Client Plant</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Total Plants */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Active Clients</span>
            <Building2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
            {portfolio ? portfolio.active_clients : '...'}
          </div>
          <div className="text-[11px] text-slate-500">Plants under advisory</div>
        </div>

        {/* Monitored Tonnage */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Monitored Volume</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
            {portfolio ? portfolio.monitored_tonnage_mt.toLocaleString('en-IN') : '...'} MT
          </div>
          <div className="text-[11px] text-slate-500">Across {portfolio?.total_shipments_monitored || 0} shipments</div>
        </div>

        {/* At-Risk Batches */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">At-Risk Batches</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {portfolio ? portfolio.at_risk_shipments_count : '...'}
          </div>
          <div className="text-[11px] text-slate-500">Blockers requiring action</div>
        </div>

        {/* Pending Reviews */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Review Queue</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
            {portfolio ? portfolio.pending_reviews_count : '...'}
          </div>
          <div className="text-[11px] text-slate-500">Pending sign-off</div>
        </div>

        {/* Monthly Retainer */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Monthly Retainer</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            ₹{portfolio ? portfolio.monthly_retainer_inr.toLocaleString('en-IN') : '0'}
          </div>
          <div className="text-[11px] text-slate-500">Consolidated ARR run-rate</div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'portfolio'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Client Factories ({portfolio?.client_plants.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('at-risk')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'at-risk'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>Cross-Client At-Risk Radar ({atRiskShipments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('review-queue')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'review-queue'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-indigo-500" />
          <span>Review Queue ({reviewQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('white-label')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'white-label'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-purple-500" />
          <span>White-Label Branding</span>
        </button>

        <button
          onClick={() => setActiveTab('billing-referrals')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'billing-referrals'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-cyan-500" />
          <span>Invoicing &amp; Referrals</span>
        </button>
      </div>

      {/* 4. Tab Content */}

      {/* TAB 1: CLIENT FACTORIES DIRECTORY */}
      {activeTab === 'portfolio' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search plant name, code, location..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Status:</span>
              <select
                value={plantFilter}
                onChange={(e) => setPlantFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Grants Only</option>
                <option value="REVOKED">Revoked / Inactive</option>
              </select>
            </div>
          </div>

          {/* Plant Directory Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Plant &amp; Code</th>
                    <th className="py-3 px-4">Location &amp; Tax ID</th>
                    <th className="py-3 px-4">Consultant Role</th>
                    <th className="py-3 px-4">Grant Status</th>
                    <th className="py-3 px-4">Access Expiry</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredPlants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-mono">
                        No client factories found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredPlants.map((p) => (
                      <tr key={p.plant_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{p.plant_name}</div>
                          <div className="text-[11px] font-mono text-slate-400">{p.plant_id} ({p.plant_code})</div>
                        </td>
                        <td className="py-3 px-4">
                          <div>{p.location || 'India'}</div>
                          <div className="text-[11px] font-mono text-slate-400">{p.gst_or_pan || 'GST Unregistered'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] border border-indigo-200 dark:border-indigo-800">
                            {p.granted_role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                              p.status === 'ACTIVE'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {p.expires_at ? p.expires_at.slice(0, 10) : 'Indefinite'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {p.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleRevokeAccess(p.plant_id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900 text-[11px] font-semibold transition-colors cursor-pointer"
                              title="Plant data sovereignty: Revoke consultant access"
                            >
                              Revoke Access
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Revoked</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CROSS-CLIENT AT-RISK RADAR */}
      {activeTab === 'at-risk' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <strong>Multi-Plant Compliance Blocker Aggregation:</strong>
              <p>
                The shipments below have been flagged by the automated validation engine for missing precursor emissions factors, exceeded IIW CEV formulas, or missing melt-and-pour country origin affidavits. All client queries are strictly isolated via Row-Level Security.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Client Factory</th>
                    <th className="py-3 px-4">Shipment / Batch</th>
                    <th className="py-3 px-4">Destination &amp; Buyer</th>
                    <th className="py-3 px-4">CBAM Blocker Reasons</th>
                    <th className="py-3 px-4">CBAM Due Date</th>
                    <th className="py-3 px-4 text-right">Tonnage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredAtRisk.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-mono">
                        ✓ Zero at-risk shipments across all active client factories. All batches clean.
                      </td>
                    </tr>
                  ) : (
                    filteredAtRisk.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{item.plant_name}</div>
                          <div className="text-[11px] font-mono text-slate-400">{item.plant_code}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {item.entity_identifier}
                        </td>
                        <td className="py-3 px-4">
                          <div>{item.destination_country}</div>
                          <div className="text-[11px] text-slate-400">{item.importer_name}</div>
                        </td>
                        <td className="py-3 px-4">
                          <ul className="space-y-1">
                            {item.block_reasons.map((r, idx) => (
                              <li key={idx} className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-medium text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="py-3 px-4 font-mono text-rose-600 dark:text-rose-400 font-semibold whitespace-nowrap">
                          {item.cbam_due_date}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {item.total_tonnage} MT
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CROSS-CLIENT REVIEW QUEUE */}
      {activeTab === 'review-queue' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Pending Multi-Plant Review &amp; Dual Sign-Off Queue
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Batch items submitted by plant dispatch officers awaiting consultant approval.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-bold">
                {reviewQueue.length} Pending Actions
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {reviewQueue.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-mono">
                  ✓ Review queue is clear. All submitted batches have been verified and released.
                </div>
              ) : (
                reviewQueue.map((item) => (
                  <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {item.entity_identifier}
                        </span>
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {item.entity_type}
                        </span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300 text-xs">
                          {item.plant_name} ({item.plant_code})
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-3">
                        <span>Destination: {item.destination_country}</span>
                        <span>Importer: {item.importer_name}</span>
                        <span>Volume: {item.total_tonnage} MT</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-mono text-[11px] font-semibold border border-amber-200 dark:border-amber-800">
                        {item.readiness_status}
                      </span>
                      <button
                        onClick={() => addToast(`Opening verification workbench for ${item.entity_identifier}`, 'info')}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <span>Inspect &amp; Sign</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WHITE-LABEL BRANDING STUDIO */}
      {activeTab === 'white-label' && (
        <div className="space-y-6 max-w-3xl">
          {/* Statutory Verification Protection Notice */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
              <strong>Statutory White-Label Governance Policy:</strong>
              <p>
                Your firm&apos;s brand, logo, and theme colours are automatically applied to exported PDF compliance dossiers and client-facing verification portals. In strict conformance with <strong>Regulation (EU) 2023/956 Article 25 and EN 10204 Clause 6</strong>, all verification metadata remains cryptographically sealed.
              </p>
            </div>
          </div>

          {/* White-Label Form */}
          <form onSubmit={handleSaveWhiteLabel} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Palette className="w-4 h-4 text-emerald-500" />
              <span>White-Label Identity &amp; Portal Styling</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Advisory Firm Name
                </label>
                <input
                  type="text"
                  value={wlFirmName}
                  onChange={(e) => setWlFirmName(e.target.value)}
                  placeholder="e.g. Singhania Global Advisory"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Logo URL (PNG / SVG)
                </label>
                <input
                  type="url"
                  value={wlLogoUrl}
                  onChange={(e) => setWlLogoUrl(e.target.value)}
                  placeholder="https://yourfirm.com/logo.png"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Primary Theme Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={wlPrimaryColor}
                    onChange={(e) => setWlPrimaryColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700"
                  />
                  <input
                    type="text"
                    value={wlPrimaryColor}
                    onChange={(e) => setWlPrimaryColor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Secondary Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={wlSecondaryColor}
                    onChange={(e) => setWlSecondaryColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700"
                  />
                  <input
                    type="text"
                    value={wlSecondaryColor}
                    onChange={(e) => setWlSecondaryColor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Custom Domain Alias
                </label>
                <input
                  type="text"
                  value={wlCustomDomain}
                  onChange={(e) => setWlCustomDomain(e.target.value)}
                  placeholder="cbam.yourfirm.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Custom Header Tagline
                </label>
                <input
                  type="text"
                  value={wlTagline}
                  onChange={(e) => setWlTagline(e.target.value)}
                  placeholder="Authorised Customs & CBAM Compliance Auditors"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Display Toggles */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">
                    Show Firm Branding on Generated PDF Reports
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Places your logo and color header on client audit memoranda.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={wlShowPdf}
                  onChange={(e) => setWlShowPdf(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">
                    Show Firm Branding on Buyer Share Portal
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    European buyers view your firm banner on shared shipment dossiers.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={wlShowPortal}
                  onChange={(e) => setWlShowPortal(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </label>
            </div>

            {/* Statutory Seal Preview */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 font-bold">
                Statutory Verification Seal:
              </div>
              <div className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                Prepared with HeatLedger AI · Cryptographic Clause 6 Verification Intact
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingWl}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingWl ? 'Saving Changes...' : 'Save White-Label Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: BILLING & REFERRALS */}
      {activeTab === 'billing-referrals' && (
        <div className="space-y-6">
          {/* Top Referral Commission Banner */}
          {referrals && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900/40 via-slate-900 to-indigo-950/40 border border-emerald-500/30 shadow-lg text-white space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-bold">
                      Consultant Referral &amp; Commission Program
                    </span>
                  </div>
                  <h3 className="text-lg font-black tracking-tight mt-0.5">
                    Earn {referrals.consultant_commission_pct}% Monthly Recurring Credits per Client Factory
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    Share your partner code with factories. Your clients receive {referrals.client_discount_pct}% off their subscription, and your consultancy earns ₹1,999.80 monthly recurring credit per active plant.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-950/60 p-2.5 rounded-xl border border-emerald-500/30">
                  <div className="font-mono font-bold text-sm text-emerald-300 tracking-wider">
                    {referrals.referral_code}
                  </div>
                  <button
                    onClick={() => copyToClipboard(referrals.share_url, 'Referral Link')}
                    className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 cursor-pointer"
                    title="Copy referral link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2 border-t border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-slate-400">Active Referred Plants: </span>
                  <span className="font-bold text-white">{referrals.active_referred_plants_count}</span>
                </div>
                <div>
                  <span className="text-slate-400">Monthly Commission Accrual: </span>
                  <span className="font-bold text-emerald-400">₹{referrals.monthly_recurring_commission_inr.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Consolidated Monthly Invoice Breakdown */}
          {invoice && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden text-xs">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    <span>Consolidated Monthly Tax Invoice: {invoice.invoice_number}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Billed to {invoice.firm_name} for period {invoice.billing_month} ({invoice.total_active_plants} active client factories).
                  </p>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold">
                  SAC 998313 · GST 18%
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-mono text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Client Factory</th>
                      <th className="py-3 px-4">Service Description</th>
                      <th className="py-3 px-4 text-right">Base Fee (INR)</th>
                      <th className="py-3 px-4 text-right">GST @ 18%</th>
                      <th className="py-3 px-4 text-right">Total (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {invoice.line_items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {item.plant_name} ({item.plant_code})
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {item.service_description}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          ₹{item.monthly_rate_inr.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          ₹{item.gst_18_pct.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          ₹{item.total_inr.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50/50 dark:bg-slate-800/40 font-mono border-t border-slate-200 dark:border-slate-800">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-4 text-right text-slate-500 font-semibold">Subtotal:</td>
                      <td className="py-2.5 px-4 text-right font-bold">₹{invoice.subtotal_inr.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="py-2.5 px-4 text-right text-slate-500 font-semibold">Total GST (18%):</td>
                      <td className="py-2.5 px-4 text-right font-bold">₹{invoice.gst_18_pct_total_inr.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="text-emerald-600 dark:text-emerald-400">
                      <td colSpan={4} className="py-2.5 px-4 text-right font-semibold">
                        Less Consultant Partner Commission ({invoice.consultant_commission_pct}% Credit):
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold">-₹{invoice.commission_credit_inr.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="text-sm font-black border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                      <td colSpan={4} className="py-3 px-4 text-right uppercase">Net Payable Retainer (INR):</td>
                      <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                        ₹{invoice.net_payable_inr.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. MODALS */}

      {/* Invite Client Plant Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Invite Client Factory
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-mono px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteClient} className="space-y-3.5">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Client Factory Legal Name
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Asansol Steel Tubes Pvt Ltd"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Plant Identifier Code
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="e.g. AST-01"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono uppercase focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    GSTIN or PAN
                  </label>
                  <input
                    type="text"
                    value={inviteGst}
                    onChange={(e) => setInviteGst(e.target.value)}
                    placeholder="19AABCA1234A1Z1"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono uppercase focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Location (City &amp; State)
                </label>
                <input
                  type="text"
                  value={inviteLocation}
                  onChange={(e) => setInviteLocation(e.target.value)}
                  placeholder="Asansol, West Bengal, India"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Granted Access Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium focus:outline-none"
                  >
                    <option value="QA_CONSULTANT">QA Consultant</option>
                    <option value="COMPLIANCE_MANAGER">Compliance Manager</option>
                    <option value="AUDITOR_READONLY">Auditor (Read-Only)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Grant Duration
                  </label>
                  <select
                    value={inviteDays}
                    onChange={(e) => setInviteDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium focus:outline-none"
                  >
                    <option value={90}>90 Days (Quarterly)</option>
                    <option value={180}>180 Days (Semi-Annual)</option>
                    <option value={365}>365 Days (1 Year)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInvite}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingInvite ? 'Inviting...' : 'Send Access Grant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Onboarding Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Bulk Client Onboarding via CSV
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-mono px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-500 dark:text-slate-400">
              Paste or edit a comma-separated roster with columns: <br />
              <code className="text-emerald-600 dark:text-emerald-400 font-mono">
                client_name, plant_code, gst_or_pan, location, role, duration_days
              </code>
            </p>

            <textarea
              rows={6}
              value={bulkCsvText}
              onChange={(e) => setBulkCsvText(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-[11px] focus:outline-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkOnboard}
                disabled={isSubmittingBulk || !bulkCsvText.trim()}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-semibold cursor-pointer disabled:opacity-50"
              >
                {isSubmittingBulk ? 'Processing...' : 'Process Bulk Onboarding'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revocation Confirmation Dialog */}
      {isRevokingPlantId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Confirm Access Revocation
              </h3>
            </div>

            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to revoke consultant access for <strong>{isRevokingPlantId}</strong>? In conformance with Plant Data Sovereignty, all RLS cross-queries for this factory will immediately be rejected.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRevokingPlantId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (isRevokingPlantId) {
                    const pid = isRevokingPlantId;
                    setIsRevokingPlantId(null);
                    await handleRevokeAccess(pid);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
              >
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
