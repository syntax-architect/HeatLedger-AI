import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Phone,
  Mail,
  FileText,
  X,
} from 'lucide-react';
import { Logo } from '../components/brand/Logo';

export interface WhatWeRead {
  mill_name: string;
  heat_number: string;
  grade: string;
  certificate_number: string;
  chemistry_elements_count: number;
  chemistry_elements?: Record<string, string>;
  dimensions: string;
}

export interface MeltAndPourEvidence {
  status: 'COMPLETE' | 'NEEDS_POUR' | 'NEEDS_MELT' | 'MISSING_ORIGIN';
  badge: string;
  summary: string;
  heat_number_present: boolean;
  country_of_melt: string;
  country_of_pour: string;
  regulatory_reference: string;
}

export interface PlausibilityCheck {
  check_id: string;
  name: string;
  status: 'PASS' | 'REVIEW';
  finding: string;
  details: string;
  action: string;
}

export interface CheckReport {
  check_id: string;
  filename: string;
  what_we_read: WhatWeRead;
  melt_and_pour_evidence: MeltAndPourEvidence;
  plausibility_checks: PlausibilityCheck[];
  suggestions: string[];
  remaining_checks: number;
  call_to_action: {
    headline: string;
    subheadline: string;
    signup_url: string;
    keeps_result: boolean;
  };
  footer_disclaimer: string;
}

interface CheckPageProps {
  embeddedSlug?: string;
}

export const CheckPage: React.FC<CheckPageProps> = ({ embeddedSlug }) => {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<CheckReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: '',
    company: '',
    work_email: '',
    phone: '',
    consent: false,
  });
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState<string | null>(null);

  const trackAnalytics = (eventName: string, checkId?: string) => {
    try {
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: eventName,
          check_id: checkId || report?.check_id,
          source_page: embeddedSlug ? `/seo/${embeddedSlug}` : '/check',
        }),
      }).catch(() => {});
    } catch {}
  };

  const handleFileUpload = async (uploadedFile: File) => {
    if (uploadedFile.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5 MB limit.');
      return;
    }
    setFile(uploadedFile);
    setError(null);
    setAnalyzing(true);
    trackAnalytics('check_started');

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const res = await fetch('/api/check/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Analysis failed. Check the file and try again.');
      }

      const data = await res.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Network error occurred during check.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.consent) {
      setError('Check the consent box to continue.');
      return;
    }
    setLeadSubmitting(true);
    try {
      const res = await fetch('/api/check/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadForm.name,
          company: leadForm.company,
          work_email: leadForm.work_email,
          phone: leadForm.phone,
          check_id: report?.check_id,
          consent: leadForm.consent,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed sending report.');
      }

      const resData = await res.json();
      setLeadSuccess('Report queued. Our technical specialist will follow up shortly.');
      trackAnalytics('signup', report?.check_id);

      if (resData.whatsapp_booking_url) {
        window.open(resData.whatsapp_booking_url, '_blank');
      }
    } catch (err: any) {
      setError(err.message || 'Error capturing contact details.');
    } finally {
      setLeadSubmitting(false);
    }
  };

  return (
    <div
      className={`text-[#EAEAEA] flex flex-col justify-between selection:bg-[#059669] selection:text-white ${
        embeddedSlug ? 'bg-transparent' : 'min-h-screen bg-[#121316]'
      }`}
    >
      {/* Top Bar (standalone only) */}
      {!embeddedSlug && (
        <header className="sticky top-0 z-30 border-b border-[#EAEAEA]/[0.08] bg-[#121316]/95 backdrop-blur-md">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <Link to="/" aria-label="HeatLedger Home">
              <Logo size="sm" />
            </Link>
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-xs font-medium text-[#9FA3AD] hover:text-[#EAEAEA] transition-colors"
              >
                Sign in
              </Link>
              <a
                href="https://wa.me/919830088888?text=Hi%20HeatLedger%2C%20I%20have%20an%20MTC%20question"
                target="_blank"
                rel="noreferrer"
                onClick={() => trackAnalytics('pilot_request')}
                className="hidden sm:inline-flex items-center gap-2 h-8 px-3 rounded-lg bg-[#181A1F] hover:bg-[#22252B] text-xs font-medium text-[#EAEAEA] border border-[#EAEAEA]/12 transition-colors"
              >
                <Phone className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
                <span>WhatsApp help</span>
              </a>
            </div>
          </div>
        </header>
      )}

      {/* Main Container */}
      <main
        className={`flex-1 w-full mx-auto flex flex-col justify-center ${
          embeddedSlug ? 'p-0' : 'max-w-2xl px-4 py-10 sm:px-6 sm:py-12'
        }`}
      >
        {!report ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="text-xs font-mono text-[#10B981]">
                Free Instant MTC Evaluator
              </div>
              <h1 className="text-2xl sm:text-3xl font-medium text-[#EAEAEA] tracking-[-0.025em]">
                Check EU Melt-and-Pour Evidence
              </h1>
              <p className="text-xs sm:text-sm text-[#9FA3AD] max-w-md mx-auto leading-relaxed">
                Upload 1 Mill Test Certificate for heat traceability, chemistry checks, and an EU
                2026/1384 origin audit
              </p>
            </div>

            {/* Upload Dropzone (no animate-pulse) */}
            <div
              className={`border border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
                analyzing
                  ? 'border-[#10B981]/60 bg-[#181A1F]'
                  : 'border-[#EAEAEA]/20 hover:border-[#EAEAEA]/35 bg-[#181A1F] hover:bg-[#22252B]/60'
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => {
                if (!analyzing) document.getElementById('mtc-file-input')?.click();
              }}
            >
              <input
                id="mtc-file-input"
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                }}
              />

              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#121316] border border-[#EAEAEA]/10 flex items-center justify-center text-[#10B981]">
                  <UploadCloud className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#EAEAEA]">
                    {analyzing
                      ? 'Reading certificate and checking limits...'
                      : 'Tap or drop your MTC here'}
                  </p>
                  <p className="text-xs text-[#9FA3AD] mt-1">
                    PDF or mobile scan (max 5 MB) · No login required
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 text-[#F87171] text-xs flex items-center gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span>{error}</span>
              </div>
            )}

            <div className="text-center">
              <p className="text-xs text-[#6F7480]">
                3 free checks per IP per day · Files automatically deleted after 24 hours
              </p>
            </div>
          </div>
        ) : (
          /* Report Scorecard */
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAEAEA]/[0.08] pb-4 gap-4">
              <div className="min-w-0">
                <span className="text-xs font-mono text-[#6F7480] block">
                  Evaluation scorecard
                </span>
                <h2 className="text-lg font-medium text-[#EAEAEA] truncate">{report.filename}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReport(null);
                  setFile(null);
                }}
                className="text-xs font-medium text-[#9FA3AD] hover:text-[#EAEAEA] transition-colors shrink-0 cursor-pointer"
              >
                Check another
              </button>
            </div>

            {/* 1. What We Read */}
            <div className="p-5 rounded-xl bg-[#181A1F] border border-[#EAEAEA]/10 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#EAEAEA] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
                  <span>What we read</span>
                </span>
                <span className="text-xs font-mono tabular-nums text-[#6F7480]">
                  Ref: {report.what_we_read?.certificate_number}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-[#121316] border border-[#EAEAEA]/[0.08]">
                  <span className="text-[#6F7480] block">Manufacturer mill</span>
                  <span className="font-medium text-[#EAEAEA] truncate block mt-1">
                    {report.what_we_read?.mill_name}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#121316] border border-[#EAEAEA]/[0.08]">
                  <span className="text-[#6F7480] block">Heat / cast #</span>
                  <span className="font-mono tabular-nums font-medium text-[#10B981] block mt-1">
                    {report.what_we_read?.heat_number}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#121316] border border-[#EAEAEA]/[0.08]">
                  <span className="text-[#6F7480] block">Steel grade</span>
                  <span className="font-medium text-[#EAEAEA] truncate block mt-1">
                    {report.what_we_read?.grade}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. EU Melt-and-Pour Evidence Status */}
            <div
              className={`p-5 rounded-xl border ${
                report.melt_and_pour_evidence?.status === 'COMPLETE'
                  ? 'bg-[#181A1F] border-[#10B981]/30 text-[#EAEAEA]'
                  : 'bg-[#181A1F] border-[#F59E0B]/30 text-[#EAEAEA]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {report.melt_and_pour_evidence?.status === 'COMPLETE' ? (
                    <CheckCircle2
                      className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5"
                      strokeWidth={1.5}
                    />
                  ) : (
                    <AlertTriangle
                      className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5"
                      strokeWidth={1.5}
                    />
                  )}
                  <div>
                    <span className="font-medium text-xs text-[#EAEAEA] block">
                      EU melt-and-pour origin status
                    </span>
                    <span className="text-xs text-[#9FA3AD] block mt-1">
                      {report.melt_and_pour_evidence?.summary}
                    </span>
                    <span className="text-xs font-mono text-[#6F7480] block mt-1">
                      {report.melt_and_pour_evidence?.regulatory_reference} · Mandatory from 1 Oct
                      2026
                    </span>
                  </div>
                </div>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded bg-[#121316] border shrink-0 ${
                    report.melt_and_pour_evidence?.status === 'COMPLETE'
                      ? 'border-[#10B981]/30 text-[#10B981]'
                      : 'border-[#F59E0B]/30 text-[#F59E0B]'
                  }`}
                >
                  {report.melt_and_pour_evidence?.badge}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-[#EAEAEA]/[0.08] text-xs">
                <div>
                  <span className="text-xs text-[#6F7480] block">Country of melt</span>
                  <span className="font-mono font-medium text-[#EAEAEA] mt-0.5 block">
                    {report.melt_and_pour_evidence?.country_of_melt}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#6F7480] block">Country of pour</span>
                  <span className="font-mono font-medium text-[#EAEAEA] mt-0.5 block">
                    {report.melt_and_pour_evidence?.country_of_pour}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Three Plausibility Checks */}
            <div className="p-5 rounded-xl bg-[#181A1F] border border-[#EAEAEA]/10 space-y-3">
              <span className="text-xs font-medium text-[#EAEAEA] block">
                3 metallurgical and authenticity plausibility checks
              </span>
              <div className="space-y-2">
                {report.plausibility_checks?.map((chk) => (
                  <div
                    key={chk.check_id}
                    className="p-3 rounded-lg bg-[#121316] border border-[#EAEAEA]/[0.08] flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-medium text-[#EAEAEA]">
                        {chk.status === 'PASS' ? (
                          <CheckCircle2
                            className="w-4 h-4 text-[#10B981] shrink-0"
                            strokeWidth={1.5}
                          />
                        ) : (
                          <AlertTriangle
                            className="w-4 h-4 text-[#F59E0B] shrink-0"
                            strokeWidth={1.5}
                          />
                        )}
                        <span>{chk.name}</span>
                      </div>
                      <p className="text-xs text-[#9FA3AD]">{chk.details}</p>
                    </div>
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded shrink-0 bg-[#181A1F] border ${
                        chk.status === 'PASS'
                          ? 'text-[#10B981] border-[#10B981]/25'
                          : 'text-[#F59E0B] border-[#F59E0B]/25'
                      }`}
                    >
                      {chk.status === 'PASS' ? 'Pass' : 'Review'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggestions */}
            <div className="p-4 rounded-xl bg-[#181A1F] border border-[#EAEAEA]/[0.08] space-y-2 text-xs">
              <span className="font-medium text-[#EAEAEA] block">Next actions</span>
              <ul className="space-y-1.5 text-[#9FA3AD]">
                {report.suggestions?.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] mt-1.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Call To Action Card (no gradient wash or colored glow) */}
            <div className="p-6 rounded-2xl bg-[#181A1F] border border-[#EAEAEA]/12 text-center space-y-2">
              <h3 className="text-sm font-medium text-[#EAEAEA]">
                {report.call_to_action?.headline || 'Get the full pack for your next shipment'}
              </h3>
              <p className="text-xs text-[#9FA3AD] max-w-md mx-auto leading-relaxed">
                {report.call_to_action?.subheadline ||
                  'Generate tamper-evident EU melt-and-pour dossiers with cryptographic seals, CBAM exposure sheets, and mill requests.'}
              </p>
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to={
                    report.call_to_action?.signup_url ||
                    `/app?action=signup&source=free_check&check_id=${report.check_id}`
                  }
                  onClick={() => trackAnalytics('signup', report.check_id)}
                  className="w-full sm:w-auto h-11 px-5 flex items-center justify-center gap-2 rounded-lg bg-[#EAEAEA] hover:bg-white text-[#121316] font-medium text-xs transition-colors active:scale-[0.98]"
                >
                  <span>Sign Up &amp; Keep This Result</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </Link>
                <button
                  type="button"
                  onClick={() => setShowLeadModal(true)}
                  className="w-full sm:w-auto h-11 px-4 flex items-center justify-center gap-2 rounded-lg bg-[#22252B] hover:bg-[#2A2E35] text-[#EAEAEA] font-medium text-xs border border-[#EAEAEA]/12 transition-colors cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-[#9FA3AD]" strokeWidth={1.5} />
                  <span>Email me report</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lead Capture Modal */}
        {showLeadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/80 backdrop-blur-sm">
            <div className="bg-[#181A1F] border border-[#EAEAEA]/12 rounded-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-[#EAEAEA]">Email audit report</h3>
                <button
                  type="button"
                  onClick={() => setShowLeadModal(false)}
                  aria-label="Close modal"
                  className="p-1.5 rounded-lg text-[#9FA3AD] hover:text-[#EAEAEA] hover:bg-[#22252B] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              {leadSuccess ? (
                <div className="p-4 bg-[#10B981]/10 border border-[#10B981]/25 rounded-xl text-[#10B981] text-xs">
                  {leadSuccess}
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[#9FA3AD] mb-1">Your name</label>
                    <input
                      required
                      type="text"
                      className="w-full h-11 px-3 rounded-lg bg-[#121316] border border-[#EAEAEA]/12 text-[#EAEAEA] focus:border-[#10B981] outline-none"
                      placeholder="Ramesh Ghosh"
                      value={leadForm.name}
                      onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[#9FA3AD] mb-1">Company / plant name</label>
                    <input
                      required
                      type="text"
                      className="w-full h-11 px-3 rounded-lg bg-[#121316] border border-[#EAEAEA]/12 text-[#EAEAEA] focus:border-[#10B981] outline-none"
                      placeholder="Howrah Forgings Pvt Ltd"
                      value={leadForm.company}
                      onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[#9FA3AD] mb-1">Work email</label>
                    <input
                      required
                      type="email"
                      className="w-full h-11 px-3 rounded-lg bg-[#121316] border border-[#EAEAEA]/12 text-[#EAEAEA] focus:border-[#10B981] outline-none"
                      placeholder="ramesh@company.com"
                      value={leadForm.work_email}
                      onChange={(e) => setLeadForm({ ...leadForm, work_email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[#9FA3AD] mb-1">Phone / WhatsApp</label>
                    <input
                      required
                      type="tel"
                      className="w-full h-11 px-3 rounded-lg bg-[#121316] border border-[#EAEAEA]/12 text-[#EAEAEA] focus:border-[#10B981] outline-none"
                      placeholder="+91 98300 00000"
                      value={leadForm.phone}
                      onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    />
                  </div>

                  <label className="flex items-start gap-2 pt-1 cursor-pointer">
                    <input
                      required
                      type="checkbox"
                      className="mt-0.5 rounded border-[#EAEAEA]/20 text-[#10B981] focus:ring-[#10B981]"
                      checked={leadForm.consent}
                      onChange={(e) => setLeadForm({ ...leadForm, consent: e.target.checked })}
                    />
                    <span className="text-xs text-[#9FA3AD] leading-snug">
                      I agree to receive my audit report and walkthrough details
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={leadSubmitting}
                    className="w-full h-11 rounded-lg bg-[#EAEAEA] hover:bg-white text-[#121316] font-medium text-xs transition-colors cursor-pointer"
                  >
                    {leadSubmitting ? 'Sending...' : 'Send my audit report'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer Disclaimer (standalone only) */}
      {!embeddedSlug && (
        <footer className="border-t border-[#EAEAEA]/[0.08] py-4 px-4 text-center text-xs text-[#6F7480]">
          Prepares documents for review. Tamper-evident seal. Not legal advice. ©{' '}
          {new Date().getFullYear()} HeatLedger AI
        </footer>
      )}
    </div>
  );
};

export default CheckPage;
