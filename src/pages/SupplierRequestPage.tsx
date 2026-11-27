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
    <div className="min-h-screen bg-[#F7F5F0] text-[#18181A] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#FCFBF8]/95 backdrop-blur-md border-b border-[#18181A]/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="HeatLedger Home">
              <Logo isLight={false} size="sm" />
            </Link>
            <span className="hidden sm:inline-block h-4 w-px bg-[#18181A]/15" />
            <span className="hidden sm:inline-block text-xs font-medium text-[#55544E]">
              EU CBAM Precursor Data Intake
            </span>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#F7F5F0] text-[#55544E] border border-[#18181A]/10">
            <Building2 className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
            <span>No Login Required</span>
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {loading && (
          <div className="bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl py-20 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-[#059669] animate-spin mx-auto" strokeWidth={1.5} />
            <p className="text-xs text-[#55544E]">Loading supplier data request parameters...</p>
          </div>
        )}

        {!loading && error && (
          <div className="max-w-md mx-auto my-8 bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl p-6 text-center space-y-3">
            <AlertCircle className="w-9 h-9 text-rose-700 mx-auto" strokeWidth={1.5} />
            <h2 className="text-base font-medium text-[#18181A]">Request Link Unavailable</h2>
            <p className="text-xs text-[#55544E] leading-relaxed">{error}</p>
          </div>
        )}

        {!loading && submittedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-lg mx-auto my-8 bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl overflow-hidden"
          >
            <div className="px-6 py-4 bg-[#059669]/10 border-b border-[#059669]/20 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" strokeWidth={1.5} />
              <div>
                <h2 className="text-sm font-medium text-[#047857]">
                  Precursor Declaration Received
                </h2>
                <p className="text-xs text-[#047857]">Logged in Howrah Precision Forgings ledger</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-[#55544E] leading-relaxed">
                Thank you, <span className="font-medium text-[#18181A]">{respondentName}</span>. Your actual
                precursor emissions data for{' '}
                <span className="font-medium text-[#18181A]">{formData?.product_name}</span> (
                {formData?.reporting_period}) has been submitted to the exporter QA team.
              </p>
              <div className="p-3.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-xs font-mono space-y-1">
                <div className="text-[#78766E]">Submission Receipt</div>
                <div className="text-[#18181A] font-medium">
                  SEE: {precursorSee} tCO₂e/t (Supplier Precursor)
                </div>
                <div className="text-[#047857]">
                  Route: {productionRoute} · Scrap: {scrapContentPct}%
                </div>
              </div>
              <p className="text-xs text-[#55544E]">
                Confirmation logged for <span className="font-mono text-[#18181A]">{respondentEmail}</span>.
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
                  className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  <span>{formError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header Card */}
            <div className="bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#18181A]/10 pb-4">
                <div>
                  <span className="text-xs font-mono font-medium text-[#047857] block mb-1">
                    CBAM Precursor Emissions Intake
                  </span>
                  <h1 className="text-xl font-medium tracking-[-0.02em] text-[#18181A]">
                    {formData.product_name}
                  </h1>
                  <p className="text-xs text-[#55544E] mt-0.5">
                    Supplier: <span className="font-medium text-[#18181A]">{formData.supplier_name}</span>
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xs text-[#55544E]">Reporting Period</div>
                  <div className="text-base font-medium text-[#047857] font-mono">
                    {formData.reporting_period}
                  </div>
                  <div className="text-xs font-mono text-[#55544E]">Due: {formData.due_date}</div>
                </div>
              </div>

              {formData.status === 'RETURNED' && formData.review_notes && (
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <span className="font-medium">Reviewer Notes: </span>
                    <span>{formData.review_notes}</span>
                  </div>
                </div>
              )}

              {formData.custom_note && (
                <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-xs text-[#55544E] flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <span className="font-medium text-[#18181A]">Note from Exporter: </span>
                    <span>{formData.custom_note}</span>
                  </div>
                </div>
              )}

              <p className="text-xs text-[#55544E] leading-relaxed">
                Under Regulation (EU) 2023/956 Annex III Section 3.1, downstream steel exporters
                report actual verified embedded emissions of upstream precursor goods. Provide
                operational figures for the product and reporting period above.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Metallurgy & Route */}
              <div className="bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl p-6 space-y-4">
                <h2 className="text-sm font-medium text-[#18181A] flex items-center gap-2 border-b border-[#18181A]/10 pb-3">
                  <Flame className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                  <span>1. Production Route &amp; Primary Fuel</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#18181A]">
                      Production Route *
                    </label>
                    <select
                      value={productionRoute}
                      onChange={(e) => setProductionRoute(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs font-mono focus:outline-none focus:border-[#059669]"
                    >
                      <option value="BF-BOF">BF-BOF (Blast Furnace - Basic Oxygen Furnace)</option>
                      <option value="DRI-EAF">DRI-EAF (Direct Reduced Iron - Electric Arc)</option>
                      <option value="Scrap-EAF">Scrap-EAF (100% Scrap Electric Arc)</option>
                      <option value="Corex / BOF-CC">Corex / BOF-CC (Smelting Reduction)</option>
                    </select>
                    <span className="text-xs text-[#55544E] block">
                      Primary crude steel casting route at mill
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#18181A]">
                      Direct Fuel Types Consumed *
                    </label>
                    <input
                      type="text"
                      value={directFuelType}
                      onChange={(e) => setDirectFuelType(e.target.value)}
                      placeholder="e.g. Coking Coal, Natural Gas"
                      className="w-full h-10 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#18181A]">
                      Direct Fuel Energy (GJ / metric tonne) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={directFuelGj}
                      onChange={(e) => setDirectFuelGj(e.target.value)}
                      placeholder="14.2"
                      className="w-full h-10 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs font-mono focus:outline-none focus:border-[#059669]"
                    />
                    <span className="text-xs text-[#55544E] block">
                      Net calorific consumption per tonne of precursor
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#18181A]">
                      Scrap Charge Content (% Weight) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={scrapContentPct}
                      onChange={(e) => setScrapContentPct(e.target.value)}
                      placeholder="12.5"
                      className="w-full h-10 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs font-mono focus:outline-none focus:border-[#059669]"
                    />
                    <span className="text-xs text-[#55544E] block">
                      Percentage of scrap consumed in furnace charge
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Electricity & Embedded Emissions */}
              <div className="bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl p-6 space-y-4">
                <h2 className="text-sm font-medium text-[#18181A] flex items-center gap-2 border-b border-[#18181A]/10 pb-3">
                  <Zap className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                  <span>2. Electricity &amp; Specific Embedded Emissions</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#18181A]">
                      Electricity Consumption (MWh / tonne) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={electricityMwh}
                      onChange={(e) => setElectricityMwh(e.target.value)}
                      placeholder="0.480"
                      className="w-full h-10 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs font-mono focus:outline-none focus:border-[#059669]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#18181A]">
                      Electricity Source &amp; Grid Factor *
                    </label>
                    <input
                      type="text"
                      value={electricitySource}
                      onChange={(e) => setElectricitySource(e.target.value)}
                      placeholder="CEA Central Regional Grid (0.71 tCO2/MWh)"
                      className="w-full h-10 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#18181A]">
                      Total Period Output Tonnes (MT) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={totalOutputTonnes}
                      onChange={(e) => setTotalOutputTonnes(e.target.value)}
                      placeholder="45000"
                      className="w-full h-10 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs font-mono focus:outline-none focus:border-[#059669]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#047857]">
                      Specific Embedded Emissions (tCO₂e / t) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={precursorSee}
                      onChange={(e) => setPrecursorSee(e.target.value)}
                      placeholder="1.825"
                      className="w-full h-10 px-3 rounded-lg bg-[#059669]/10 border border-[#059669] text-[#047857] font-medium text-sm font-mono focus:outline-none"
                    />
                    <span className="text-xs text-[#047857] block">
                      Actual precursor SEE for this reporting period
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Evidence Upload */}
              <div className="bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl p-6 space-y-4">
                <h2 className="text-sm font-medium text-[#18181A] flex items-center gap-2 border-b border-[#18181A]/10 pb-3">
                  <FileSpreadsheet className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                  <span>3. Supporting Evidence Document</span>
                </h2>

                <div className="p-5 rounded-xl bg-[#F7F5F0] border border-dashed border-[#18181A]/20 text-center space-y-3">
                  <Upload className="w-6 h-6 text-[#55544E] mx-auto" strokeWidth={1.5} />
                  <div className="text-xs text-[#18181A]">
                    <label className="cursor-pointer text-[#047857] hover:underline font-medium">
                      <span>Choose evidence file</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>{' '}
                    <span className="text-[#55544E]">or drag and drop</span>
                  </div>
                  <p className="text-xs text-[#55544E]">
                    Excel (.xlsx, .xls, .csv) production summaries or GHG audit statements (.pdf) up
                    to 15 MB.
                  </p>

                  {uploadingFile && (
                    <div className="text-xs text-[#047857] font-mono inline-flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                      <span>Calculating SHA-256...</span>
                    </div>
                  )}

                  {evidenceFileInfo && !uploadingFile && (
                    <div className="p-3 rounded-lg bg-[#059669]/10 border border-[#059669]/20 text-left text-xs font-mono max-w-md mx-auto">
                      <div className="text-[#047857] font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                        <span className="truncate">{evidenceFileInfo.filename}</span>
                      </div>
                      <div className="text-xs text-[#047857] truncate mt-0.5">
                        SHA-256: {evidenceFileInfo.sha256}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#18181A]">
                    Metallurgical Notes &amp; Methodology
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Verified under ISO 14064 GHG audit for primary melting works."
                    className="w-full p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs placeholder:text-[#78766E] focus:outline-none focus:border-[#059669]"
                  />
                </div>
              </div>

              {/* Section 4: Respondent Sign-off */}
              <div className="bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl p-6 space-y-4">
                <h2 className="text-sm font-medium text-[#18181A] flex items-center gap-2 border-b border-[#18181A]/10 pb-3">
                  <ShieldCheck className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                  <span>4. Respondent Sign-off &amp; Identification</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#18181A]">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={respondentName}
                      onChange={(e) => setRespondentName(e.target.value)}
                      placeholder="e.g. Dr. P. Sen"
                      className="w-full h-10 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#18181A]">
                      Designation / Department *
                    </label>
                    <input
                      type="text"
                      required
                      value={respondentDesignation}
                      onChange={(e) => setRespondentDesignation(e.target.value)}
                      placeholder="e.g. Head of Decarbonization & Energy"
                      className="w-full h-10 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#18181A]">
                      Professional Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={respondentEmail}
                      onChange={(e) => setRespondentEmail(e.target.value)}
                      placeholder="e.g. p.sen@tatasteel.com"
                      className="w-full h-10 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#18181A]">
                      Contact Phone (WhatsApp / Mobile)
                    </label>
                    <input
                      type="tel"
                      value={respondentPhone}
                      onChange={(e) => setRespondentPhone(e.target.value)}
                      placeholder="+91 98301 12233"
                      className="w-full h-10 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
                    />
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <div className="text-xs">
                  {draftSavedMsg && (
                    <span className="text-[#047857] font-mono inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>{draftSavedMsg}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft}
                    className="flex-1 sm:flex-none h-10 px-4 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium border border-[#18181A]/15 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-[#55544E]" strokeWidth={1.5} />
                    <span>{isSavingDraft ? 'Saving...' : 'Save Draft'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none h-10 px-5 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] font-medium text-xs transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
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

      <footer className="mt-auto border-t border-[#18181A]/10 bg-[#FCFBF8] py-5 text-xs text-[#55544E]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Prepared with HeatLedger AI · EU CBAM Precursor Verification</span>
          <span className="font-mono text-[#047857]">Regulation (EU) 2023/956</span>
        </div>
      </footer>
    </div>
  );
};

export default SupplierRequestPage;
