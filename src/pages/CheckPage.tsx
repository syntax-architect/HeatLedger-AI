import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { UploadCloud, CheckCircle2, AlertTriangle, Lock, ArrowRight, Phone, Mail, ShieldAlert } from 'lucide-react';

interface CheckReport {
  check_id: string;
  filename: string;
  mill_name: string;
  heat_number: string;
  grade: string;
  melt_and_pour_country: string;
  melt_and_pour_status: 'FOUND' | 'NOT_ON_CERTIFICATE';
  chemistry_within_limits: boolean;
  chemistry_elements_found: number;
  suggestions: string[];
  remaining_checks: number;
  footer_disclaimer: string;
}

export const CheckPage: React.FC = () => {
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

  const handleFileUpload = async (uploadedFile: File) => {
    if (uploadedFile.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5 MB limit.');
      return;
    }
    setFile(uploadedFile);
    setError(null);
    setAnalyzing(true);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Bar */}
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
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            WhatsApp Help
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {!report ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Free Instant MTC Audit
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Check Melt & Pour Compliance
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                Upload 1 Mill Test Certificate. Get heat traceability, chemistry check, and country audit in seconds.
              </p>
            </div>

            {/* Upload Box */}
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
                    {analyzing ? 'Reading Certificate & Validating Limits...' : 'Tap or drop your MTC here'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    PDF or mobile camera photo (max 5 MB)
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
                3 free checks per day. Files automatically deleted after 24 hours.
              </p>
            </div>
          </div>
        ) : (
          /* Report State: One-Screen Summary */
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Audit Scorecard</span>
                <h2 className="text-lg font-bold text-white">{report.filename}</h2>
              </div>
              <button
                onClick={() => {
                  setReport(null);
                  setFile(null);
                }}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Check Another
              </button>
            </div>

            {/* Key Findings Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Heat Number</span>
                <span className="font-mono font-bold text-white text-sm">{report.heat_number}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Grade / Steel Spec</span>
                <span className="font-semibold text-slate-200 text-sm">{report.grade}</span>
              </div>
            </div>

            {/* Melt & Pour Status Banner */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between ${
                report.melt_and_pour_status === 'FOUND'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {report.melt_and_pour_status === 'FOUND' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                )}
                <div>
                  <span className="font-bold text-xs block">Country of Melt and Pour</span>
                  <span className="text-xs opacity-90">{report.melt_and_pour_country}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900/60 border border-white/10">
                {report.melt_and_pour_status === 'FOUND' ? 'Detected' : 'Missing'}
              </span>
            </div>

            {/* Chemistry Status */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200 block">Chemistry Ladle Composition</span>
                <span className="text-[11px] text-slate-400">
                  {report.chemistry_elements_found > 0
                    ? `${report.chemistry_elements_found} elements within EN ladle tolerances`
                    : 'Ladle chemistry not detected'}
                </span>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>

            {/* Plain Suggestions (Max 3) */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 block">Recommended Actions</span>
              <ul className="space-y-1.5 text-xs text-slate-400">
                {report.suggestions.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Blurred Buyer Pack Section */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/40 p-4">
              <div className="filter blur-sm select-none opacity-40 pointer-events-none space-y-2 text-xs">
                <div className="h-4 bg-slate-700 rounded w-1/3" />
                <div className="h-8 bg-slate-800 rounded w-full" />
                <div className="h-8 bg-slate-800 rounded w-full" />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-950/70 backdrop-blur-xs">
                <Lock className="w-5 h-5 text-emerald-400 mb-1" />
                <p className="text-xs font-bold text-white">Full Buyer Customs Pack (4 Pages)</p>
                <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                  Includes digital seal, invoice ladle cross-reference & customs broker QR portal.
                </p>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <a
                href={`https://wa.me/919830099999?text=Hi%2C%20I%20just%20ran%20MTC%20check%20(${report.check_id})%20and%20want%20to%20book%20a%20free%2015-minute%20walkthrough.`}
                target="_blank"
                rel="noreferrer"
                className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20"
              >
                <Phone className="w-3.5 h-3.5" />
                Book Free 15-Min Walkthrough
              </a>
              <button
                onClick={() => setShowLeadModal(true)}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 transition"
              >
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Email Me This Report
              </button>
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
                  className="text-slate-400 hover:text-white text-xs"
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
                    className="w-full min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                  >
                    {leadSubmitting ? 'Sending...' : 'Send My Audit Report'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer Disclaimer */}
      <footer className="border-t border-slate-900 py-3 px-4 text-center text-[11px] text-slate-400">
        Prepares documents for review. Not legal advice. &copy; {new Date().getFullYear()} HeatLedger AI.
      </footer>
    </div>
  );
};

export default CheckPage;
