import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  Phone,
  Mail,
  ShieldCheck,
  Calendar,
  FileText,
  FlaskConical,
  Activity
} from 'lucide-react';

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

  // Lead modal state
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

  // Track privacy-safe event (zero cookies)
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
        throw new Error(errJson.detail || 'Analysis failed. Please check the file and try again.');
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
      setError('Please check the consent box.');
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
      setLeadSuccess('Report queued! Our technical specialist will connect shortly.');
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
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950 ${embeddedSlug ? 'bg-transparent min-h-0' : ''}`}>
      {/* Top Bar (only if not embedded) */}
      {!embeddedSlug && (
        <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-sm">
              HL
            </div>
            <span className="font-bold text-sm tracking-tight text-white">HeatLedger AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <a
              href="https://wa.me/919830099999?text=Hi%20HeatLedger%2C%20I%20have%20an%20MTC%20question"
              target="_blank"
              rel="noreferrer"
              onClick={() => trackAnalytics('pilot_request')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              WhatsApp Help
            </a>
          </div>
        </header>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {!report ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Free Instant MTC Evaluator
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Check EU Melt-and-Pour Evidence
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                Upload 1 Mill Test Certificate. Get heat traceability, chemistry check, and EU 2026/1384 origin audit in 5 seconds.
              </p>
            </div>

            {/* Upload Dropzone */}
            <div
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition cursor-pointer ${
                analyzing
                  ? 'border-emerald-500/50 bg-emerald-950/10 animate-pulse'
                  : 'border-slate-800 hover:border-emerald-500/60 bg-slate-900/40 hover:bg-slate-900/80'
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
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {analyzing ? 'Reading Certificate & Validating Plausibility...' : 'Tap or drop your MTC here'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    PDF or mobile scan (max 5 MB) · No login required
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="text-center">
              <p className="text-[11px] text-slate-400">
                3 free checks per IP per day. Uploaded files automatically deleted after 24 hours.
              </p>
            </div>
          </div>
        ) : (
          /* Report State: What we read, EU Melt-and-pour status, 3 Plausibility checks */
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Evaluation Scorecard</span>
                <h2 className="text-lg font-bold text-white truncate max-w-md">{report.filename}</h2>
              </div>
              <button
                onClick={() => {
                  setReport(null);
                  setFile(null);
                }}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                Check Another
              </button>
            </div>

            {/* 1. What We Read Card */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  What We Read
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Ref: {report.what_we_read?.certificate_number}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-400 block text-[11px]">Manufacturer Mill</span>
                  <span className="font-semibold text-slate-200 truncate block">{report.what_we_read?.mill_name}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-400 block text-[11px]">Heat / Cast #</span>
                  <span className="font-mono font-bold text-emerald-400">{report.what_we_read?.heat_number}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-400 block text-[11px]">Steel Grade</span>
                  <span className="font-semibold text-slate-200 truncate block">{report.what_we_read?.grade}</span>
                </div>
              </div>
            </div>

            {/* 2. EU Melt-and-Pour Evidence Status Card */}
            <div
              className={`p-4 rounded-xl border ${
                report.melt_and_pour_evidence?.status === 'COMPLETE'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {report.melt_and_pour_evidence?.status === 'COMPLETE' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-xs block">
                      EU Melt-and-Pour Origin Status
                    </span>
                    <span className="text-xs opacity-90 block mt-0.5">
                      {report.melt_and_pour_evidence?.summary}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {report.melt_and_pour_evidence?.regulatory_reference} · Mandatory from 1 Oct 2026
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900/60 border border-white/10 shrink-0">
                  {report.melt_and_pour_evidence?.badge}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Country of Melt</span>
                  <span className="font-mono font-semibold">{report.melt_and_pour_evidence?.country_of_melt}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Country of Pour</span>
                  <span className="font-mono font-semibold">{report.melt_and_pour_evidence?.country_of_pour}</span>
                </div>
              </div>
            </div>

            {/* 3. 3 Plausibility Checks */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
              <span className="text-xs font-bold text-slate-300 block">
                3 Metallurgical & Authenticity Plausibility Checks
              </span>
              <div className="space-y-2">
                {report.plausibility_checks?.map((chk) => (
                  <div
                    key={chk.check_id}
                    className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                        {chk.status === 'PASS' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                        <span>{chk.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{chk.details}</p>
                    </div>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded shrink-0 ${
                        chk.status === 'PASS'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {chk.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggestions */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs">
              <span className="font-bold text-slate-300 block text-xs">What to do next</span>
              <ul className="space-y-1 text-slate-400">
                {report.suggestions?.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Call To Action Banner: Prompt Pack v4 Task D1 */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 text-center space-y-2">
              <h3 className="text-sm font-bold text-white">
                {report.call_to_action?.headline || 'Get the full pack for your next shipment'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {report.call_to_action?.subheadline || 'Generate tamper-evident EU melt-and-pour dossiers with cryptographic seals, CBAM exposure sheets, and mill chaser in under 60 seconds.'}
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <Link
                  to={report.call_to_action?.signup_url || `/app?action=signup&source=free_check&check_id=${report.check_id}`}
                  onClick={() => trackAnalytics('signup', report.check_id)}
                  className="w-full sm:w-auto px-5 min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20"
                >
                  Sign Up & Keep This Result
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => setShowLeadModal(true)}
                  className="w-full sm:w-auto px-4 min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Email Me Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lead Capture Modal */}
        {showLeadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white">Email Audit Report</h3>
                <button
                  onClick={() => setShowLeadModal(false)}
                  className="text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {leadSuccess ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
                  {leadSuccess}
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Your Name</label>
                    <input
                      required
                      type="text"
                      className="w-full min-h-[44px] px-3 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 outline-none"
                      placeholder="e.g. Ramesh Ghosh"
                      value={leadForm.name}
                      onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Company / Plant Name</label>
                    <input
                      required
                      type="text"
                      className="w-full min-h-[44px] px-3 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 outline-none"
                      placeholder="e.g. Howrah Forgings Pvt Ltd"
                      value={leadForm.company}
                      onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Work Email</label>
                    <input
                      required
                      type="email"
                      className="w-full min-h-[44px] px-3 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 outline-none"
                      placeholder="ramesh@company.com"
                      value={leadForm.work_email}
                      onChange={(e) => setLeadForm({ ...leadForm, work_email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Phone / WhatsApp</label>
                    <input
                      required
                      type="tel"
                      className="w-full min-h-[44px] px-3 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 outline-none"
                      placeholder="+91 98300 XXXXX"
                      value={leadForm.phone}
                      onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    />
                  </div>

                  <label className="flex items-start gap-2 pt-1 cursor-pointer">
                    <input
                      required
                      type="checkbox"
                      className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                      checked={leadForm.consent}
                      onChange={(e) => setLeadForm({ ...leadForm, consent: e.target.checked })}
                    />
                    <span className="text-[11px] text-slate-400 leading-tight">
                      I agree to receive my audit report and follow-up walkthrough details.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={leadSubmitting}
                    className="w-full min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                  >
                    {leadSubmitting ? 'Sending...' : 'Send My Audit Report'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer Disclaimer (only if not embedded) */}
      {!embeddedSlug && (
        <footer className="border-t border-slate-900 py-3 px-4 text-center text-[11px] text-slate-400">
          Prepares documents for review. Tamper-evident seal. Not legal advice. &copy; {new Date().getFullYear()} HeatLedger AI.
        </footer>
      )}
    </div>
  );
};

export default CheckPage;
