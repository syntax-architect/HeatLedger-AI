import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
  AlertCircle,
  Save,
  Send,
  ShieldCheck,
  Flame,
  Zap,
  RefreshCw,
  Info,
} from 'lucide-react';
import { ApiService, PublicSupplierFormResponse } from '../services/api';
import { Logo } from '../components/brand/Logo';

export const SupplierRequestPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<PublicSupplierFormResponse | null>(null);

  // Form Fields State
  const [productionRoute, setProductionRoute] = useState<string>('BF-BOF');
  const [directFuelType, setDirectFuelType] = useState<string>('Coking Coal & Natural Gas');
  const [directFuelGj, setDirectFuelGj] = useState<string>('14.2');
  const [electricityMwh, setElectricityMwh] = useState<string>('0.48');
  const [electricitySource, setElectricitySource] = useState<string>('CEA Central Regional Grid');
  const [scrapContentPct, setScrapContentPct] = useState<string>('12.5');
  const [totalOutputTonnes, setTotalOutputTonnes] = useState<string>('45000');
  const [precursorSee, setPrecursorSee] = useState<string>('1.825');
  const [notes, setNotes] = useState<string>('');

  // Submitter Info
  const [respondentName, setRespondentName] = useState<string>('');
  const [respondentDesignation, setRespondentDesignation] = useState<string>('');
  const [respondentEmail, setRespondentEmail] = useState<string>('');
  const [respondentPhone, setRespondentPhone] = useState<string>('');

  // Evidence File
  const [evidenceFileInfo, setEvidenceFileInfo] = useState<{
    filename: string;
    sha256: string;
  } | null>(null);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);

  // Submission Status
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [draftSavedMsg, setDraftSavedMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (token) {
      loadRequestData(token);
    }
  }, [token]);

  const loadRequestData = async (reqToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiService.getPublicSupplierForm(reqToken);
      if (data && data.valid) {
        setFormData(data);

        const prev = data.draft || data.existing_submission;
        if (prev) {
          if (prev.production_route) setProductionRoute(prev.production_route);
          if (prev.direct_fuel_type) setDirectFuelType(prev.direct_fuel_type);
          if (prev.direct_fuel_consumption_gj_per_t != null) {
            setDirectFuelGj(String(prev.direct_fuel_consumption_gj_per_t));
          }
          if (prev.electricity_consumption_mwh_per_t != null) {
            setElectricityMwh(String(prev.electricity_consumption_mwh_per_t));
          }
          if (prev.electricity_source) setElectricitySource(prev.electricity_source);
          if (prev.scrap_content_pct != null) setScrapContentPct(String(prev.scrap_content_pct));
          if (prev.total_output_tonnes != null) {
            setTotalOutputTonnes(String(prev.total_output_tonnes));
          }
          if (prev.precursor_emissions_tco2_per_t != null) {
            setPrecursorSee(String(prev.precursor_emissions_tco2_per_t));
          }
          if (prev.notes) setNotes(prev.notes);

          if (prev.submitter_name) setRespondentName(prev.submitter_name);
          if (prev.submitter_designation) setRespondentDesignation(prev.submitter_designation);
          if (prev.submitter_email) setRespondentEmail(prev.submitter_email);
          if (prev.submitter_phone) setRespondentPhone(prev.submitter_phone);

          if (prev.evidence_file_name) {
            setEvidenceFileInfo({
              filename: prev.evidence_file_name,
              sha256: prev.evidence_file_sha256 || 'Calculated on upload',
            });
          }
        }
      } else {
        setError(data?.error || 'Invalid or expired supplier data request link.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load supplier request form.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!token || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setFormError(null);
    setUploadingFile(true);
    try {
      const res = await ApiService.uploadSupplierEvidence(token, file);
      if (res && res.sha256) {
        setEvidenceFileInfo({
          filename: res.filename,
          sha256: res.sha256,
        });
      }
    } catch (err: any) {
      setFormError(err?.message || 'Failed to process evidence file.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!token) return;
    setIsSavingDraft(true);
    setDraftSavedMsg(null);
    setFormError(null);
    try {
      const draftPayload = {
        production_route: productionRoute,
        direct_fuel_type: directFuelType,
        direct_fuel_consumption_gj_per_t: parseFloat(directFuelGj) || 0,
        electricity_consumption_mwh_per_t: parseFloat(electricityMwh) || 0,
        electricity_source: electricitySource,
        scrap_content_pct: parseFloat(scrapContentPct) || 0,
        total_output_tonnes: parseFloat(totalOutputTonnes) || 0,
        precursor_emissions_tco2_per_t: parseFloat(precursorSee) || 0,
        evidence_file_name: evidenceFileInfo?.filename,
        evidence_file_sha256: evidenceFileInfo?.sha256,
        notes,
        respondent_name: respondentName,
        respondent_designation: respondentDesignation,
        respondent_email: respondentEmail,
        respondent_phone: respondentPhone,
      };

      await ApiService.savePublicSupplierDraft(token, draftPayload);
      setDraftSavedMsg('Draft auto-saved successfully at ' + new Date().toLocaleTimeString());
      setTimeout(() => setDraftSavedMsg(null), 3500);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save draft.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormError(null);

    if (!respondentName.trim() || !respondentEmail.trim()) {
      setFormError('Please provide your full name and professional work email.');
      return;
    }

    if (!precursorSee || parseFloat(precursorSee) <= 0) {
      setFormError('Please enter a valid Specific Embedded Emissions (SEE) value.');
      return;
    }

    setIsSubmitting(true);
    try {
      const submitPayload = {
        respondent_name: respondentName.trim(),
        respondent_designation: respondentDesignation.trim() || 'Quality Desk',
        respondent_email: respondentEmail.trim(),
        respondent_phone: respondentPhone.trim() || undefined,
        submission: {
          production_route: productionRoute,
          direct_fuel_type: directFuelType,
          direct_fuel_consumption_gj_per_t: parseFloat(directFuelGj) || 0,
          electricity_consumption_mwh_per_t: parseFloat(electricityMwh) || 0,
          electricity_source: electricitySource,
          scrap_content_pct: parseFloat(scrapContentPct) || 0,
          total_output_tonnes: parseFloat(totalOutputTonnes) || 0,
          precursor_emissions_tco2_per_t: parseFloat(precursorSee),
          evidence_file_name: evidenceFileInfo?.filename,
          evidence_file_sha256: evidenceFileInfo?.sha256,
          notes,
        },
        evidence_files: evidenceFileInfo ? [evidenceFileInfo] : undefined,
      };

      await ApiService.submitPublicSupplierData(token, submitPayload);
      setSubmittedSuccess(true);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit precursor declaration. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#09090B] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E4E4E7]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="HeatLedger Home">
              <Logo isLight={false} size="sm" />
            </Link>
            <span className="hidden sm:inline-block h-4 w-px bg-[#E4E4E7]" />
            <span className="hidden sm:inline-block text-xs font-medium text-[#52525B]">
              EU CBAM Precursor Data Intake
            </span>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#FAFAFA] text-[#52525B] border border-[#E4E4E7]">
            <Building2 className="w-3.5 h-3.5 text-[#059669]" />
            <span>No Login Required</span>
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {loading && (
          <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl py-20 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-[#059669] animate-spin mx-auto" />
            <p className="text-xs text-[#52525B]">Loading supplier data request parameters...</p>
          </div>
        )}

        {!loading && error && (
          <div className="max-w-md mx-auto my-8 bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl p-6 text-center space-y-3 shadow-xs">
            <AlertCircle className="w-9 h-9 text-[#DC2626] mx-auto" />
            <h2 className="text-base font-semibold text-[#09090B]">Request Link Unavailable</h2>
            <p className="text-xs text-[#52525B] leading-relaxed">{error}</p>
          </div>
        )}

        {!loading && submittedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-lg mx-auto my-8 bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl overflow-hidden shadow-xs"
          >
            <div className="px-6 py-4 bg-[#ECFDF5] border-b border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
              <div>
                <h2 className="text-sm font-semibold text-[#065F46]">
                  Precursor Declaration Received
                </h2>
                <p className="text-xs text-[#047857]">Logged in Howrah Precision Forgings ledger</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-[#52525B] leading-relaxed">
                Thank you, <strong className="text-[#09090B]">{respondentName}</strong>. Your actual
                precursor emissions data for{' '}
                <strong className="text-[#09090B]">{formData?.product_name}</strong> (
                {formData?.reporting_period}) has been submitted to the exporter QA team.
              </p>
              <div className="p-3.5 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7] text-xs font-mono space-y-1">
                <div className="text-[#52525B]">SUBMISSION RECEIPT</div>
                <div className="text-[#09090B] font-semibold">
                  SEE: {precursorSee} tCO₂e/t (Supplier Precursor)
                </div>
                <div className="text-[#047857]">
                  Route: {productionRoute} · Scrap: {scrapContentPct}%
                </div>
              </div>
              <p className="text-xs text-[#52525B]">
                Confirmation logged for <span className="font-mono text-[#09090B]">{respondentEmail}</span>.
              </p>
            </div>
          </motion.div>
        )}

        {!loading && !submittedSuccess && formData && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <AnimatePresence>
              {formError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  role="alert"
                  className="p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626] flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header Card */}
            <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4E4E7] pb-4">
                <div>
                  <span className="text-xs font-mono font-semibold text-[#047857] block mb-1">
                    CBAM PRECURSOR EMISSIONS INTAKE
                  </span>
                  <h1 className="text-xl font-semibold tracking-[-0.02em] text-[#09090B]">
                    {formData.product_name}
                  </h1>
                  <p className="text-xs text-[#52525B] mt-0.5">
                    Supplier: <strong className="font-medium text-[#09090B]">{formData.supplier_name}</strong>
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xs text-[#52525B]">Reporting Period</div>
                  <div className="text-base font-semibold text-[#047857] font-mono">
                    {formData.reporting_period}
                  </div>
                  <div className="text-xs font-mono text-[#52525B]">Due: {formData.due_date}</div>
                </div>
              </div>

              {formData.status === 'RETURNED' && formData.review_notes && (
                <div className="p-3.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Reviewer Notes: </span>
                    <span>{formData.review_notes}</span>
                  </div>
                </div>
              )}

              {formData.custom_note && (
                <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7] text-xs text-[#52525B] flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#09090B]">Note from Exporter: </span>
                    <span>{formData.custom_note}</span>
                  </div>
                </div>
              )}

              <p className="text-xs text-[#52525B] leading-relaxed">
                Under Regulation (EU) 2023/956 Annex III Section 3.1, downstream steel exporters
                report actual verified embedded emissions of upstream precursor goods. Provide
                operational figures for the product and reporting period above.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Metallurgy & Route */}
              <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl p-6 space-y-4">
                <h2 className="text-sm font-semibold text-[#09090B] flex items-center gap-2 border-b border-[#E4E4E7] pb-3">
                  <Flame className="w-4 h-4 text-[#059669]" />
                  <span>1. Production Route &amp; Primary Fuel</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#09090B]">
                      Production Route *
                    </label>
                    <select
                      value={productionRoute}
                      onChange={(e) => setProductionRoute(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] text-xs font-mono focus:outline-none focus:border-[#059669]"
                    >
                      <option value="BF-BOF">BF-BOF (Blast Furnace - Basic Oxygen Furnace)</option>
                      <option value="DRI-EAF">DRI-EAF (Direct Reduced Iron - Electric Arc)</option>
                      <option value="Scrap-EAF">Scrap-EAF (100% Scrap Electric Arc)</option>
                      <option value="Corex / BOF-CC">Corex / BOF-CC (Smelting Reduction)</option>
                    </select>
                    <span className="text-xs text-[#52525B] block">
                      Primary crude steel casting route at mill
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#09090B]">
                      Direct Fuel Types Consumed *
                    </label>
                    <input
                      type="text"
                      value={directFuelType}
                      onChange={(e) => setDirectFuelType(e.target.value)}
                      placeholder="e.g. Coking Coal, Natural Gas"
                      className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] text-xs focus:outline-none focus:border-[#059669]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#09090B]">
                      Direct Fuel Energy (GJ / metric tonne) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={directFuelGj}
                      onChange={(e) => setDirectFuelGj(e.target.value)}
                      placeholder="14.2"
                      className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] text-xs font-mono focus:outline-none focus:border-[#059669]"
                    />
                    <span className="text-xs text-[#52525B] block">
                      Net calorific consumption per tonne of precursor
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#09090B]">
                      Scrap Charge Content (% Weight) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={scrapContentPct}
                      onChange={(e) => setScrapContentPct(e.target.value)}
                      placeholder="12.5"
                      className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] text-xs font-mono focus:outline-none focus:border-[#059669]"
                    />
                    <span className="text-xs text-[#52525B] block">
                      Percentage of scrap consumed in furnace charge
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Electricity & Embedded Emissions */}
              <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl p-6 space-y-4">
                <h2 className="text-sm font-semibold text-[#09090B] flex items-center gap-2 border-b border-[#E4E4E7] pb-3">
                  <Zap className="w-4 h-4 text-[#2563EB]" />
                  <span>2. Electricity &amp; Specific Embedded Emissions</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#09090B]">
                      Electricity Consumption (MWh / tonne) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={electricityMwh}
                      onChange={(e) => setElectricityMwh(e.target.value)}
                      placeholder="0.480"
                      className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] text-xs font-mono focus:outline-none focus:border-[#059669]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#09090B]">
                      Electricity Source &amp; Grid Factor *
                    </label>
                    <input
                      type="text"
                      value={electricitySource}
                      onChange={(e) => setElectricitySource(e.target.value)}
                      placeholder="CEA Central Regional Grid (0.71 tCO2/MWh)"
                      className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] text-xs focus:outline-none focus:border-[#059669]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#09090B]">
                      Total Period Output Tonnes (MT) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={totalOutputTonnes}
                      onChange={(e) => setTotalOutputTonnes(e.target.value)}
                      placeholder="45000"
                      className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] text-xs font-mono focus:outline-none focus:border-[#059669]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#047857]">
                      Specific Embedded Emissions (tCO₂e / t) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={precursorSee}
                      onChange={(e) => setPrecursorSee(e.target.value)}
                      placeholder="1.825"
                      className="w-full h-10 px-3 rounded-lg bg-[#ECFDF5]/50 border border-[#059669] text-[#047857] font-semibold text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
                    />
                    <span className="text-xs text-[#047857] block">
                      Actual precursor SEE for this reporting period
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Evidence Upload */}
              <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl p-6 space-y-4">
                <h2 className="text-sm font-semibold text-[#09090B] flex items-center gap-2 border-b border-[#E4E4E7] pb-3">
                  <FileSpreadsheet className="w-4 h-4 text-[#059669]" />
                  <span>3. Supporting Evidence Document</span>
                </h2>

                <div className="p-5 rounded-xl bg-[#FAFAFA] border border-dashed border-[#D4D4D8] text-center space-y-3">
                  <Upload className="w-7 h-7 text-[#52525B] mx-auto" />
                  <div className="text-xs text-[#09090B]">
                    <label className="cursor-pointer text-[#047857] hover:underline font-semibold">
                      <span>Choose evidence file</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>{' '}
                    <span className="text-[#52525B]">or drag and drop</span>
                  </div>
                  <p className="text-xs text-[#52525B]">
                    Excel (.xlsx, .xls, .csv) production summaries or GHG audit statements (.pdf) up
                    to 15 MB.
                  </p>

                  {uploadingFile && (
                    <div className="text-xs text-[#047857] font-mono inline-flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Calculating SHA-256...</span>
                    </div>
                  )}

                  {evidenceFileInfo && !uploadingFile && (
                    <div className="p-3 rounded-lg bg-[#ECFDF5] border border-emerald-200 text-left text-xs font-mono max-w-md mx-auto">
                      <div className="text-[#065F46] font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                        <span className="truncate">{evidenceFileInfo.filename}</span>
                      </div>
                      <div className="text-xs text-[#047857] truncate mt-0.5">
                        SHA-256: {evidenceFileInfo.sha256}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#09090B]">
                    Metallurgical Notes &amp; Methodology
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Verified under ISO 14064 GHG audit for primary melting works."
                    className="w-full p-3 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] text-xs placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#059669]"
                  />
                </div>
              </div>

              {/* Section 4: Respondent Sign-off */}
              <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl p-6 space-y-4">
                <h2 className="text-sm font-semibold text-[#09090B] flex items-center gap-2 border-b border-[#E4E4E7] pb-3">
                  <ShieldCheck className="w-4 h-4 text-[#059669]" />
                  <span>4. Respondent Sign-off &amp; Identification</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#09090B]">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={respondentName}
                      onChange={(e) => setRespondentName(e.target.value)}
                      placeholder="e.g. Dr. P. Sen"
                      className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] text-xs focus:outline-none focus:border-[#059669]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#09090B]">
                      Designation / Department *
                    </label>
                    <input
                      type="text"
                      required
                      value={respondentDesignation}
                      onChange={(e) => setRespondentDesignation(e.target.value)}
                      placeholder="e.g. Head of Decarbonization & Energy"
                      className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] text-xs focus:outline-none focus:border-[#059669]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#09090B]">
                      Professional Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={respondentEmail}
                      onChange={(e) => setRespondentEmail(e.target.value)}
                      placeholder="e.g. p.sen@tatasteel.com"
                      className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] text-xs focus:outline-none focus:border-[#059669]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#09090B]">
                      Contact Phone (WhatsApp / Mobile)
                    </label>
                    <input
                      type="tel"
                      value={respondentPhone}
                      onChange={(e) => setRespondentPhone(e.target.value)}
                      placeholder="+91 98301 12233"
                      className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] text-xs focus:outline-none focus:border-[#059669]"
                    />
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <div className="text-xs">
                  {draftSavedMsg && (
                    <span className="text-[#047857] font-mono inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{draftSavedMsg}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft}
                    className="flex-1 sm:flex-none h-10 px-4 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#09090B] text-xs font-medium border border-[#E4E4E7] transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-[#52525B]" />
                    <span>{isSavingDraft ? 'Saving...' : 'Save Draft'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none h-10 px-5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-medium text-xs transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Precursor Declaration</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </main>

      <footer className="mt-auto border-t border-[#E4E4E7] bg-[#FFFFFF] py-5 text-xs text-[#52525B]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Prepared with HeatLedger AI · EU CBAM Precursor Verification</span>
          <span className="font-mono text-[#047857]">Regulation (EU) 2023/956</span>
        </div>
      </footer>
    </div>
  );
};

export default SupplierRequestPage;
