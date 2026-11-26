import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  api,
  ConsultantPortfolio,
  AtRiskShipmentCrossClient,
  CrossClientReviewItem,
  WhiteLabelConfig,
  ConsolidatedInvoice,
  ConsultantReferralInfo,
} from '../../../services/api';
import { useToast } from '../../ui/ToastContext';
import {
  ConsultantOverviewAndTabs,
  ConsultantTab,
} from './consultant/ConsultantOverviewAndTabs';
import {
  ConsultantPlantsTab,
  ConsultantAtRiskTab,
  ConsultantReviewQueueTab,
} from './consultant/ConsultantPortfolioTabs';
import {
  ConsultantWhiteLabelTab,
  ConsultantBillingReferralsTab,
} from './consultant/ConsultantBrandingAndBillingTabs';
import {
  ConsultantInviteModal,
  ConsultantBulkCsvModal,
  ConsultantRevokeModal,
} from './consultant/ConsultantModals';

export const ConsultantPortalView: React.FC = () => {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<ConsultantTab>('portfolio');
  const [portfolio, setPortfolio] = useState<ConsultantPortfolio | null>(null);
  const [atRiskShipments, setAtRiskShipments] = useState<AtRiskShipmentCrossClient[]>([]);
  const [reviewQueue, setReviewQueue] = useState<CrossClientReviewItem[]>([]);
  const [whiteLabel, setWhiteLabel] = useState<WhiteLabelConfig | null>(null);
  const [invoice, setInvoice] = useState<ConsolidatedInvoice | null>(null);
  const [referrals, setReferrals] = useState<ConsultantReferralInfo | null>(null);

  const [selectedClientPlantId, setSelectedClientPlantId] = useState<string>('ALL');
  const [plantFilter, setPlantFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [isRevokingPlantId, setIsRevokingPlantId] = useState<string | null>(null);

  const [inviteName, setInviteName] = useState<string>('');
  const [inviteCode, setInviteCode] = useState<string>('');
  const [inviteGst, setInviteGst] = useState<string>('');
  const [inviteLocation, setInviteLocation] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<string>('QA_CONSULTANT');
  const [inviteDays, setInviteDays] = useState<number>(365);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState<boolean>(false);

  const [bulkCsvText, setBulkCsvText] = useState<string>(
    'client_name,plant_code,gst_or_pan,location,role,duration_days\n' +
      'Asansol Steel Castings,ASC-01,19AACCA1234A1Z1,Asansol West Bengal,QA_CONSULTANT,365\n' +
      'Bhilai Heavy Forgings,BHF-02,22AACCB5678B1Z2,Bhilai Chhattisgarh,COMPLIANCE_MANAGER,365\n'
  );
  const [isSubmittingBulk, setIsSubmittingBulk] = useState<boolean>(false);

  const [wlFirmName, setWlFirmName] = useState<string>('');
  const [wlLogoUrl, setWlLogoUrl] = useState<string>('');
  const [wlPrimaryColor, setWlPrimaryColor] = useState<string>('#047857');
  const [wlSecondaryColor, setWlSecondaryColor] = useState<string>('#065f46');
  const [wlCustomDomain, setWlCustomDomain] = useState<string>('');
  const [wlTagline, setWlTagline] = useState<string>('');
  const [wlShowPdf, setWlShowPdf] = useState<boolean>(true);
  const [wlShowPortal, setWlShowPortal] = useState<boolean>(true);
  const [isSavingWl, setIsSavingWl] = useState<boolean>(false);

  const loadConsultantData = useCallback(async () => {
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
    }
  }, [addToast]);

  useEffect(() => {
    loadConsultantData();
  }, [loadConsultantData]);

  const handleSwitchClient = async (plantId: string) => {
    setSelectedClientPlantId(plantId);
    try {
      const filtered = await api.fetchCrossClientAtRiskShipments(
        plantId === 'ALL' ? undefined : plantId
      );
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

  const handleBulkOnboard = async () => {
    if (!bulkCsvText.trim()) return;
    setIsSubmittingBulk(true);
    try {
      const res = await api.bulkOnboardClientsCsv(bulkCsvText);
      addToast(
        `Bulk onboarding complete: ${res.successfully_onboarded_count} plants attached, ${res.error_count} errors.`,
        'success'
      );
      setIsBulkModalOpen(false);
      await loadConsultantData();
    } catch (err: any) {
      addToast(err.message || 'Bulk onboarding failed', 'error');
    } finally {
      setIsSubmittingBulk(false);
    }
  };

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

  const filteredAtRisk = useMemo(
    () =>
      atRiskShipments.filter(
        (s) => selectedClientPlantId === 'ALL' || s.plant_id === selectedClientPlantId
      ),
    [atRiskShipments, selectedClientPlantId]
  );

  return (
    <div className="space-y-6 font-sans text-left">
      <ConsultantOverviewAndTabs
        whiteLabel={whiteLabel}
        portfolio={portfolio}
        selectedClientPlantId={selectedClientPlantId}
        onSwitchClient={handleSwitchClient}
        onOpenBulkModal={() => setIsBulkModalOpen(true)}
        onOpenInviteModal={() => setIsInviteModalOpen(true)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        atRiskCount={atRiskShipments.length}
        reviewQueueCount={reviewQueue.length}
      />

      {activeTab === 'portfolio' && (
        <ConsultantPlantsTab
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          plantFilter={plantFilter}
          onPlantFilterChange={setPlantFilter}
          filteredPlants={filteredPlants}
          onRevokeAccess={handleRevokeAccess}
        />
      )}

      {activeTab === 'at-risk' && <ConsultantAtRiskTab filteredAtRisk={filteredAtRisk} />}

      {activeTab === 'review-queue' && (
        <ConsultantReviewQueueTab
          reviewQueue={reviewQueue}
          onInspectItem={(id) => addToast(`Opening verification workbench for ${id}`, 'info')}
        />
      )}

      {activeTab === 'white-label' && (
        <ConsultantWhiteLabelTab
          wlFirmName={wlFirmName}
          onWlFirmNameChange={setWlFirmName}
          wlLogoUrl={wlLogoUrl}
          onWlLogoUrlChange={setWlLogoUrl}
          wlPrimaryColor={wlPrimaryColor}
          onWlPrimaryColorChange={setWlPrimaryColor}
          wlSecondaryColor={wlSecondaryColor}
          onWlSecondaryColorChange={setWlSecondaryColor}
          wlCustomDomain={wlCustomDomain}
          onWlCustomDomainChange={setWlCustomDomain}
          wlTagline={wlTagline}
          onWlTaglineChange={setWlTagline}
          wlShowPdf={wlShowPdf}
          onWlShowPdfChange={setWlShowPdf}
          wlShowPortal={wlShowPortal}
          onWlShowPortalChange={setWlShowPortal}
          isSavingWl={isSavingWl}
          onSubmit={handleSaveWhiteLabel}
        />
      )}

      {activeTab === 'billing-referrals' && (
        <ConsultantBillingReferralsTab
          referrals={referrals}
          invoice={invoice}
          onCopy={copyToClipboard}
        />
      )}

      {isInviteModalOpen && (
        <ConsultantInviteModal
          inviteName={inviteName}
          onInviteNameChange={setInviteName}
          inviteCode={inviteCode}
          onInviteCodeChange={setInviteCode}
          inviteGst={inviteGst}
          onInviteGstChange={setInviteGst}
          inviteLocation={inviteLocation}
          onInviteLocationChange={setInviteLocation}
          inviteRole={inviteRole}
          onInviteRoleChange={setInviteRole}
          inviteDays={inviteDays}
          onInviteDaysChange={setInviteDays}
          isSubmittingInvite={isSubmittingInvite}
          onClose={() => setIsInviteModalOpen(false)}
          onSubmit={handleInviteClient}
        />
      )}

      {isBulkModalOpen && (
        <ConsultantBulkCsvModal
          bulkCsvText={bulkCsvText}
          onBulkCsvTextChange={setBulkCsvText}
          isSubmittingBulk={isSubmittingBulk}
          onClose={() => setIsBulkModalOpen(false)}
          onSubmit={handleBulkOnboard}
        />
      )}

      {isRevokingPlantId && (
        <ConsultantRevokeModal
          plantId={isRevokingPlantId}
          onClose={() => setIsRevokingPlantId(null)}
          onConfirm={async () => {
            const pid = isRevokingPlantId;
            setIsRevokingPlantId(null);
            await handleRevokeAccess(pid);
          }}
        />
      )}
    </div>
  );
};
