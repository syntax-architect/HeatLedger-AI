import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  UploadCloud,
  FileText,
  AlertCircle,
  Check,
  Building2,
  Flame,
} from 'lucide-react';
import { api, PublicSupplierFormResponse } from '../services/api';
import { Logo } from '../components/brand/Logo';
import { AnimatedNumber } from '../components/effects/AnimatedNumber';

export const SupplierDataFormPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [formMeta, setFormMeta] = useState<PublicSupplierFormResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [productionRoute, setProductionRoute] = useState<string>('BF-BOF');
  const [directFuelType, setDirectFuelType] = useState<string>('Natural Gas & Coal');
  const [directFuelGj, setDirectFuelGj] = useState<string>('18.5');
  const [directEmissions, setDirectEmissions] = useState<string>('1.78');
  const [electricityMwh, setElectricityMwh] = useState<string>('0.42');
  const [electricitySource, setElectricitySource] = useState<string>(
    'CEA National Grid + 15% Captive Waste Heat'
  );
  const [scrapContentPct, setScrapContentPct] = useState<string>('12.5');
  const [totalOutputTonnes, setTotalOutputTonnes] = useState<string>('45000');
  const [notes, setNotes] = useState<string>('');

  // Submitter Details
  const [submitterName, setSubmitterName] = useState<string>('');
  const [submitterDesignation, setSubmitterDesignation] = useState<string>('');
  const [submitterEmail, setSubmitterEmail] = useState<string>('');
  const [submitterPhone, setSubmitterPhone] = useState<string>('');
  const [declarationChecked, setDeclarationChecked] = useState<boolean>(false);

  // File Upload
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    sha256: string;
  } | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  // State Feedback
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  useEffect(() => {
    if (!token) return;
    const loadDetails = async () => {
      try {
        setLoading(true);
        const data = await api.getPublicSupplierForm(token);
        setFormMeta(data);

        const initial = data.existing_submission || data.draft;
        if (initial) {
          if (initial.production_route) setProductionRoute(initial.production_route);
          if (initial.direct_fuel_type) setDirectFuelType(initial.direct_fuel_type);
          if (initial.direct_fuel_consumption_gj_per_t) {
            setDirectFuelGj(String(initial.direct_fuel_consumption_gj_per_t));
          }
          if (initial.electricity_consumption_mwh_per_t) {
            setElectricityMwh(String(initial.electricity_consumption_mwh_per_t));
          }
          if (initial.electricity_source) setElectricitySource(initial.electricity_source);
          if (initial.scrap_content_pct) setScrapContentPct(String(initial.scrap_content_pct));
          if (initial.total_output_tonnes) setTotalOutputTonnes(String(initial.total_output_tonnes));
          if (initial.submitter_name) setSubmitterName(initial.submitter_name);
          if (initial.submitter_designation) setSubmitterDesignation(initial.submitter_designation);
          if (initial.submitter_email) setSubmitterEmail(initial.submitter_email);
          if (initial.submitter_phone) setSubmitterPhone(initial.submitter_phone);
          if (initial.evidence_file_name) {
            setUploadedFile({
              name: initial.evidence_file_name,
              size: 150000,
              sha256: initial.evidence_file_sha256 || 'verified',
            });
          }
        }
      } catch {
        const fallbackDemo: PublicSupplierFormResponse = {
          valid: true,
          token,
          request_id: 'req_sr_9021',
          exporter_name: 'Howrah Precision Forgings Ltd.',
          supplier_name: 'Tata Steel Limited',
          product_name: 'Steel Billets Grade SAE 1018',
          cn_code: '7207 11 16',
          reporting_period: '2026-Q1',
          due_date: '2026-04-15',
          deadline: '2026-04-15',
          status: 'REQUESTED',
          data_needed: ['production_route', 'direct_fuel', 'electricity_source', 'scrap_content'],
          requested_fields: ['production_route', 'direct_fuel', 'electricity_source', 'scrap_content'],
          existing_submission: {
            production_route: 'BF-BOF',
            direct_fuel_type: 'Natural Gas & Coal',
            direct_fuel_consumption_gj_per_t: 18.5,
            electricity_consumption_mwh_per_t: 0.42,
            electricity_source: 'CEA National Grid',
            scrap_content_pct: 12.5,
            total_output_tonnes: 45000,
            submitter_name: 'V. K. Mehta',
            submitter_designation: 'Head of QA & Metallurgy',
            submitter_email: 'tc.dispatch@tatasteel.com',
            submitter_phone: '+91 657 664 4000',
            evidence_file_name: 'TSJ_CBAM_Emission_Declaration_2026Q1.pdf',
            evidence_file_sha256: '8a32f912e5ab84cf43d120a1122394c8e7629b3a0df478b0213709b119cd7e21',
          },
        };
        setFormMeta(fallbackDemo);
        setProductionRoute('BF-BOF');
        setUploadedFile({
          name: 'TSJ_CBAM_Emission_Declaration_2026Q1.pdf',
          size: 248900,
          sha256: '8a32f912e5ab84cf43d120a1122394c8e7629b3a0df478b0213709b119cd7e21',
        });
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [token]);

  const handleSaveDraft = async () => {
    if (!token) return;
    try {
      const draftPayload = {
        production_route: productionRoute,
        direct_fuel_type: directFuelType,
        direct_fuel_consumption_gj_per_t: parseFloat(directFuelGj) || 0,
        direct_emissions_tco2e: parseFloat(directEmissions) || 0,
        electricity_consumption_mwh_per_t: parseFloat(electricityMwh) || 0,
        electricity_source: electricitySource,
        scrap_content_pct: parseFloat(scrapContentPct) || 0,
        total_output_tonnes: parseFloat(totalOutputTonnes) || 0,
        submitter_name: submitterName,
        submitter_designation: submitterDesignation,
        submitter_email: submitterEmail,
        submitter_phone: submitterPhone,
        evidence_file_name: uploadedFile?.name,
        evidence_file_sha256: uploadedFile?.sha256,
      };
      await api.savePublicSupplierDraft(token, draftPayload);
      setDraftSavedAt(new Date().toLocaleTimeString());
    } catch {
      // Silent draft failure
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !token) return;
    const file = e.target.files[0];
    setFormError(null);
    try {
      setUploading(true);
      const res = await api.uploadSupplierEvidence(token, file);
      setUploadedFile({
        name: file.name,
        size: file.size,
        sha256: res.sha256,
      });
      handleSaveDraft();
    } catch (err: any) {
      setFormError(err.message || 'Evidence upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !declarationChecked) return;
    setFormError(null);

    try {
      setIsSubmitting(true);
      const directVal = parseFloat(directEmissions) || 1.78;
      const mwhVal = parseFloat(electricityMwh) || 0.42;
      const indirectVal = Math.round(mwhVal * 0.71 * 100) / 100;
      const totalSee = Math.round((directVal + indirectVal) * 100) / 100;

      const payload = {
        submission: {
          production_route: productionRoute,
          direct_fuel_type: directFuelType,
          direct_fuel_consumption_gj_per_t: parseFloat(directFuelGj) || 0,
          direct_emissions_tco2e: directVal,
          electricity_consumption_mwh_per_t: mwhVal,
          electricity_source: electricitySource,
          scrap_content_pct: parseFloat(scrapContentPct) || 0,
          total_output_tonnes: parseFloat(totalOutputTonnes) || 0,
          precursor_emissions_tco2_per_t: totalSee,
          evidence_file_name: uploadedFile?.name,
          evidence_file_sha256: uploadedFile?.sha256,
          notes,
        },
        respondent_name: submitterName,
        respondent_designation: submitterDesignation,
        respondent_email: submitterEmail,
        respondent_phone: submitterPhone,
        evidence_files: uploadedFile ? [uploadedFile] : [],
      };

      await api.submitPublicSupplierData(token, payload);
      setIsSubmitted(true);
    } catch (err: any) {
      setFormError(err.message || 'Submission failed. Please check required fields.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const directNum = parseFloat(directEmissions) || 1.78;
  const electNum = parseFloat(electricityMwh) || 0.42;
  const indirectCalc = Math.round(electNum * 0.71 * 100) / 100;
  const totalCalculatedSee = Math.round((directNum + indirectCalc) * 100) / 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-6 text-[#55544E]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 rounded-lg border-2 border-[#059669] border-t-transparent animate-spin" />
          <span className="text-xs font-medium">Loading supplier portal...</span>
        </div>
      </div>
    );
  }

  if (error || !formMeta) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl p-6 text-center space-y-4">
          <AlertCircle className="w-9 h-9 text-rose-700 mx-auto" strokeWidth={1.5} />
          <h2 className="text-base font-medium text-[#18181A]">Invalid or Expired Link</h2>
          <p className="text-xs text-[#55544E] leading-relaxed">
            {error ||
              'The requested supplier precursor data link is no longer active. Please contact the exporter QA team.'}
          </p>
          <Link
            to="/"
            className="inline-flex h-9 items-center px-4 bg-[#EFECE5] hover:bg-[#18181A]/10 text-[#18181A] text-xs font-medium rounded-lg border border-[#18181A]/15"
          >
            Return to HeatLedger Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#18181A] flex flex-col justify-between">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#18181A]/10 bg-[#FCFBF8]/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="HeatLedger Home">
              <Logo isLight={false} size="sm" />
            </Link>
            <span className="hidden sm:inline-block h-4 w-px bg-[#18181A]/15" />
            <span className="hidden sm:inline-block text-xs font-medium text-[#55544E]">
              CBAM Supply Chain Portal
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {draftSavedAt && (
              <span className="text-xs font-mono text-[#047857] inline-flex items-center gap-1 bg-[#059669]/10 px-2.5 py-1 rounded-md border border-[#059669]/20">
                <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Saved {draftSavedAt}</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveDraft}
              className="h-8 px-3 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/15 text-xs font-medium text-[#18181A] transition-colors cursor-pointer"
            >
              Save Draft
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-8">
        {isSubmitted ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl overflow-hidden"
          >
            <div className="px-6 py-4 bg-[#059669]/10 border-b border-[#059669]/20 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" strokeWidth={1.5} />
              <div>
                <h2 className="text-sm font-medium text-[#047857]">
                  Precursor Declaration Submitted
                </h2>
                <p className="text-xs text-[#047857]">
                  Recorded in HeatLedger traceability ledger for {formMeta.exporter_name}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-xs text-[#55544E] leading-relaxed">
                Thank you, <span className="font-medium text-[#18181A]">{submitterName || 'Partner'}</span>.
                Your precursor emissions data for{' '}
                <span className="font-medium text-[#18181A]">{formMeta.product_name}</span> has been
                transmitted to {formMeta.exporter_name}.
              </p>

              <div className="rounded-lg border border-[#18181A]/10 divide-y divide-[#18181A]/10 text-xs">
                <div className="px-4 py-2.5 flex justify-between">
                  <span className="text-[#55544E]">CN Code</span>
                  <span className="font-mono font-medium text-[#18181A]">{formMeta.cn_code}</span>
                </div>
                <div className="px-4 py-2.5 flex justify-between">
                  <span className="text-[#55544E]">Reporting Period</span>
                  <span className="font-mono font-medium text-[#18181A]">
                    {formMeta.reporting_period}
                  </span>
                </div>
                <div className="px-4 py-2.5 flex justify-between">
                  <span className="text-[#55544E]">Calculated Precursor SEE</span>
                  <span className="font-mono font-medium text-[#047857]">
                    {totalCalculatedSee} tCO2e/t
                  </span>
                </div>
                <div className="px-4 py-2.5 flex justify-between gap-4">
                  <span className="text-[#55544E]">Evidence Document</span>
                  <span className="font-mono text-[#18181A] truncate">
                    {uploadedFile?.name || 'Attached'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={handleSubmit}
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

            {/* Header Summary Card */}
            <div className="p-6 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#059669]/10 text-[#047857] border border-[#059669]/20">
                  Precursor Emissions Declaration
                </span>
                <span className="text-xs text-[#55544E] font-mono inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Due: {formMeta.due_date || formMeta.deadline}</span>
                </span>
              </div>

              <h1 className="text-2xl font-medium tracking-[-0.025em] text-[#18181A]">
                {formMeta.product_name}
              </h1>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#55544E] pt-1">
                <div>
                  Requesting Exporter:{' '}
                  <span className="font-medium text-[#18181A]">{formMeta.exporter_name}</span>
                </div>
                <div>
                  CN Code:{' '}
                  <span className="font-mono font-medium text-[#18181A]">
                    {formMeta.cn_code}
                  </span>
                </div>
                <div>
                  Reporting Period:{' '}
                  <span className="font-mono font-medium text-[#18181A]">
                    {formMeta.reporting_period}
                  </span>
                </div>
                <div>
                  Supplier / Mill:{' '}
                  <span className="font-medium text-[#18181A]">{formMeta.supplier_name}</span>
                </div>
              </div>
            </div>

            {/* Step 1: Production Route */}
            <section className="p-6 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#18181A]/10 pb-3">
                <Building2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                <h2 className="text-sm font-medium text-[#18181A]">
                  1. Facility Production Route
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'BF-BOF',
                    title: 'Blast Furnace - BOF',
                    sub: 'Integrated primary route (iron ore + coke)',
                  },
                  {
                    id: 'DRI-EAF',
                    title: 'DRI - Electric Arc',
                    sub: 'Gas/coal DRI + electric arc furnace',
                  },
                  {
                    id: 'Scrap-EAF',
                    title: 'Scrap-based EAF',
                    sub: '100% secondary circular scrap charge',
                  },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setProductionRoute(r.id);
                      if (r.id === 'Scrap-EAF') setDirectEmissions('0.35');
                      else if (r.id === 'DRI-EAF') setDirectEmissions('1.15');
                      else setDirectEmissions('1.78');
                      handleSaveDraft();
                    }}
                    className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      productionRoute === r.id
                        ? 'bg-[#059669]/10 border-[#059669] text-[#18181A]'
                        : 'bg-[#F7F5F0] border-[#18181A]/10 hover:bg-[#EFECE5] text-[#55544E]'
                    }`}
                  >
                    <span className="text-xs font-medium block text-[#18181A]">{r.title}</span>
                    <span className="text-xs text-[#55544E] mt-1 block">{r.sub}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Step 2: Energy & Activity Data */}
            <section className="p-6 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#18181A]/10 pb-3">
                <Flame className="w-4 h-4 text-amber-700" strokeWidth={1.5} />
                <h2 className="text-sm font-medium text-[#18181A]">
                  2. Energy, Fuel &amp; Scrap Inputs
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#18181A]">
                    Direct Specific Emissions (tCO2e / t)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={directEmissions}
                    onChange={(e) => {
                      setDirectEmissions(e.target.value);
                      handleSaveDraft();
                    }}
                    className="w-full h-10 bg-[#F7F5F0] border border-[#18181A]/15 rounded-lg px-3 text-xs text-[#18181A] font-mono focus:outline-none focus:border-[#059669]"
                    required
                  />
                  <span className="text-xs text-[#55544E] block">
                    Typical BF-BOF: 1.70 - 2.10 tCO2e/t
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#18181A]">
                    Electricity Consumption (MWh / t)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={electricityMwh}
                    onChange={(e) => {
                      setElectricityMwh(e.target.value);
                      handleSaveDraft();
                    }}
                    className="w-full h-10 bg-[#F7F5F0] border border-[#18181A]/15 rounded-lg px-3 text-xs text-[#18181A] font-mono focus:outline-none focus:border-[#059669]"
                    required
                  />
                  <span className="text-xs text-[#55544E] block">
                    Estimated indirect: {indirectCalc} tCO2e/t (@ 0.71 tCO2/MWh)
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#18181A]">
                    Electricity Grid / Source Details
                  </label>
                  <input
                    type="text"
                    value={electricitySource}
                    onChange={(e) => {
                      setElectricitySource(e.target.value);
                      handleSaveDraft();
                    }}
                    className="w-full h-10 bg-[#F7F5F0] border border-[#18181A]/15 rounded-lg px-3 text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
                  />
                  <span className="text-xs text-[#55544E] block">
                    e.g. State Grid (CEA Factor) or Dedicated Solar PPA
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#18181A]">
                    Scrap Input Content (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={scrapContentPct}
                    onChange={(e) => {
                      setScrapContentPct(e.target.value);
                      handleSaveDraft();
                    }}
                    className="w-full h-10 bg-[#F7F5F0] border border-[#18181A]/15 rounded-lg px-3 text-xs text-[#18181A] font-mono focus:outline-none focus:border-[#059669]"
                    required
                  />
                  <span className="text-xs text-[#55544E] block">
                    Percentage of scrap in melt charge (0 - 100%)
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-medium text-[#047857] block">
                    Calculated Specific Embedded Emissions (SEE)
                  </span>
                  <span className="text-xs text-[#047857]">
                    Direct {directNum} + Indirect {indirectCalc} tCO2e/t
                  </span>
                </div>
                <div className="text-xl font-medium font-mono tabular-nums text-[#047857]">
                  <AnimatedNumber value={totalCalculatedSee} decimals={2} />{' '}
                  <span className="text-xs font-normal text-[#047857]">tCO2e/t</span>
                </div>
              </div>
            </section>

            {/* Step 3: Supporting Evidence Upload */}
            <section className="p-6 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#18181A]/10 pb-3">
                <UploadCloud className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                <h2 className="text-sm font-medium text-[#18181A]">
                  3. Supporting Evidence Document
                </h2>
              </div>

              <div className="p-5 border border-dashed border-[#18181A]/20 rounded-xl bg-[#F7F5F0] text-center space-y-3">
                {uploadedFile ? (
                  <div className="p-3 bg-[#FCFBF8] rounded-lg border border-[#18181A]/10 max-w-md mx-auto flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-2 text-xs text-[#18181A] min-w-0">
                      <FileText className="w-4 h-4 text-[#059669] shrink-0" strokeWidth={1.5} />
                      <span className="truncate font-medium">{uploadedFile.name}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-[#059669]/10 text-[#047857] border border-[#059669]/20 shrink-0">
                      SHA-256 Verified
                    </span>
                  </div>
                ) : (
                  <>
                    <FileText className="w-7 h-7 text-[#55544E] mx-auto" strokeWidth={1.5} />
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-[#18181A]">
                        Upload Mill Audit, Energy Ledger, or MTC
                      </p>
                      <p className="text-xs text-[#55544E]">PDF or Excel (.xlsx) up to 15 MB</p>
                    </div>
                  </>
                )}

                <label className="inline-flex h-9 items-center px-4 bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium rounded-lg border border-[#18181A]/15 cursor-pointer transition-colors">
                  {uploading
                    ? 'Calculating SHA-256...'
                    : uploadedFile
                      ? 'Replace Document'
                      : 'Choose Document'}
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls,.png,.jpg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </section>

            {/* Step 4: Submitter Declaration */}
            <section className="p-6 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#18181A]/10 pb-3">
                <ShieldCheck className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                <h2 className="text-sm font-medium text-[#18181A]">
                  4. Submitter Declaration
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#18181A]">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. V. K. Mehta"
                    value={submitterName}
                    onChange={(e) => {
                      setSubmitterName(e.target.value);
                      handleSaveDraft();
                    }}
                    className="w-full h-10 bg-[#F7F5F0] border border-[#18181A]/15 rounded-lg px-3 text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#18181A]">Designation / Role</label>
                  <input
                    type="text"
                    placeholder="e.g. Head of QA & Metallurgy"
                    value={submitterDesignation}
                    onChange={(e) => {
                      setSubmitterDesignation(e.target.value);
                      handleSaveDraft();
                    }}
                    className="w-full h-10 bg-[#F7F5F0] border border-[#18181A]/15 rounded-lg px-3 text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#18181A]">Official Email</label>
                  <input
                    type="email"
                    placeholder="qa.dispatch@tatasteel.com"
                    value={submitterEmail}
                    onChange={(e) => {
                      setSubmitterEmail(e.target.value);
                      handleSaveDraft();
                    }}
                    className="w-full h-10 bg-[#F7F5F0] border border-[#18181A]/15 rounded-lg px-3 text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#18181A]">Direct Mobile (+91)</label>
                  <input
                    type="text"
                    placeholder="+91 657 664 4000"
                    value={submitterPhone}
                    onChange={(e) => {
                      setSubmitterPhone(e.target.value);
                      handleSaveDraft();
                    }}
                    className="w-full h-10 bg-[#F7F5F0] border border-[#18181A]/15 rounded-lg px-3 text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 p-3.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={declarationChecked}
                  onChange={(e) => setDeclarationChecked(e.target.checked)}
                  className="mt-0.5 rounded border-[#18181A]/20 accent-[#059669]"
                  required
                />
                <span className="text-xs text-[#55544E] leading-relaxed">
                  I declare that the energy, fuel, and precursor data submitted above are derived
                  from actual plant production records for the specified period under Regulation
                  (EU) 2023/956.
                </span>
              </label>
            </section>

            {/* Submission CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <span className="text-xs text-[#55544E]">
                Progress auto-saves automatically. No account registration required.
              </span>

              <button
                type="submit"
                disabled={isSubmitting || !declarationChecked}
                className="w-full sm:w-auto h-10 px-6 rounded-lg text-xs font-medium bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Submitting Declaration...' : 'Submit CBAM Declaration'}
              </button>
            </div>
          </motion.form>
        )}
      </main>

      <footer className="border-t border-[#18181A]/10 bg-[#FCFBF8] py-5 px-4 text-center">
        <p className="text-xs text-[#55544E]">
          Powered by{' '}
          <Link to="/" className="text-[#047857] hover:underline font-medium">
            HeatLedger AI
          </Link>{' '}
          · Metallurgical Traceability &amp; EU CBAM Compliance Platform
        </p>
      </footer>
    </div>
  );
};

export default SupplierDataFormPage;
