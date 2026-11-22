import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, Server, ArrowLeft, CheckCircle2, Lock } from 'lucide-react';

export const LegalPage: React.FC<{ initialTab?: 'privacy' | 'terms' | 'dpa' }> = ({ initialTab = 'privacy' }) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'dpa'>(initialTab);

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>HeatLedger Legal & Compliance Trust Center</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b border-slate-800 mb-8">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'privacy'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'terms'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Terms of Service
          </button>
          <button
            onClick={() => setActiveTab('dpa')}
            className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'dpa'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            Data Processing & Sub-Processors
          </button>
        </div>

        {/* Tab 1: Privacy Policy */}
        {activeTab === 'privacy' && (
          <div className="space-y-6 text-sm leading-relaxed text-slate-300 bg-slate-900/60 p-6 sm:p-8 rounded-2xl border border-slate-800">
            <div>
              <h1 className="text-xl font-bold text-white mb-2">Privacy Policy</h1>
              <p className="text-xs text-slate-400">Effective 1 January 2026 · Controller: HeatLedger Technologies Pvt. Ltd., Kolkata, India</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-100">1. What We Collect</h2>
              <p>
                We collect your organization name, plant address, GSTIN, team member email addresses and designated roles.
                When you upload mill test certificates (MTCs), we process heat numbers, chemical compositions, mechanical values,
                and invoice numbers strictly to prepare buyer compliance packs.
              </p>

              <h2 className="text-base font-semibold text-slate-100">2. Zero Model Training Guarantee</h2>
              <p>
                Your mill test certificates and proprietary chemical formulations are <strong>never used to train public AI models</strong>.
                All extraction inferences are performed under enterprise zero-data-retention terms.
              </p>

              <h2 className="text-base font-semibold text-slate-100">3. Who Can See Your Data</h2>
              <p>
                Only team members you explicitly invite can access your records. External buyers can only inspect records if your
                plant generates a time-limited, 128-bit cryptographic share link.
              </p>

              <h2 className="text-base font-semibold text-slate-100">4. Retention & Deletion</h2>
              <p>
                Certificates and buyer packs are retained for 7 years by default (mandated under customs and trade documentation rules).
                Organization owners may request full account deletion at any time with a 30-day statutory grace period.
              </p>

              <h2 className="text-base font-semibold text-slate-100">5. Cookieless Telemetry</h2>
              <p>
                HeatLedger AI uses cookieless, privacy-first session telemetry. We do not use third-party tracking pixels or advertising beacons.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Terms of Service */}
        {activeTab === 'terms' && (
          <div className="space-y-6 text-sm leading-relaxed text-slate-300 bg-slate-900/60 p-6 sm:p-8 rounded-2xl border border-slate-800">
            <div>
              <h1 className="text-xl font-bold text-white mb-2">Terms of Service</h1>
              <p className="text-xs text-slate-400">Effective 1 January 2026 · HeatLedger Technologies Pvt. Ltd.</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-100">1. Nature of Service</h2>
              <p>
                HeatLedger AI prepares trade compliance documentation, reconciles mill test certificate data, and generates digital tamper-evidence seals.
                <strong> Prepares documents for review. Not legal advice.</strong> Actual EU CBAM declarations and emissions verifications require accredited bodies.
              </p>

              <h2 className="text-base font-semibold text-slate-100">2. Account Responsibility</h2>
              <p>
                Plants must maintain accurate authorized inspector credentials. The plant authorized QA inspector must enroll their own multi-factor
                authentication token. Account sharing is strictly prohibited.
              </p>

              <h2 className="text-base font-semibold text-slate-100">3. Commercial Terms & GST Invoicing</h2>
              <p>
                Subscription plans are billed in Indian Rupees (INR) excluding 18% GST (SAC 998313). Sequential tax invoices are issued upon successful payment.
                A 7-day grace period is provided following payment failures before read-only mode takes effect. Data is never deleted due to non-payment.
              </p>

              <h2 className="text-base font-semibold text-slate-100">4. Limitation of Liability</h2>
              <p>
                Users remain solely responsible for the physical accuracy of mill test certificate contents provided by upstream mills.
                HeatLedger provides digital tamper-evidence tools and automated validation against published regulatory standards.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Data Processing Note & Sub-Processors */}
        {activeTab === 'dpa' && (
          <div className="space-y-6 text-sm leading-relaxed text-slate-300 bg-slate-900/60 p-6 sm:p-8 rounded-2xl border border-slate-800">
            <div>
              <h1 className="text-xl font-bold text-white mb-2">Data Processing Note & Sub-Processors</h1>
              <p className="text-xs text-slate-400">Infrastructure Sovereignty, Row-Level Security & Authorized Providers</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-100">1. Data Sovereignty & Isolation</h2>
              <p>
                Every customer database record is partitioned using PostgreSQL Row-Level Security (RLS) keyed to your <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400 font-mono">organization_id</code>.
                Unauthenticated or cross-tenant data requests strictly return HTTP 404.
              </p>

              <h2 className="text-base font-semibold text-slate-100">2. List of Authorized Sub-Processors</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-800 text-xs">
                  <thead>
                    <tr className="bg-slate-800/60 text-slate-200">
                      <th className="p-2.5 border border-slate-700">Sub-Processor</th>
                      <th className="p-2.5 border border-slate-700">Role & Purpose</th>
                      <th className="p-2.5 border border-slate-700">Data Transferred</th>
                      <th className="p-2.5 border border-slate-700">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    <tr>
                      <td className="p-2.5 font-semibold text-white">Supabase Postgres</td>
                      <td className="p-2.5">Database storage, vault, RLS</td>
                      <td className="p-2.5">Encrypted records & files</td>
                      <td className="p-2.5">Mumbai, IN / Frankfurt, EU</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-white">Cloudflare</td>
                      <td className="p-2.5">Edge CDN, DDoS & WAF Firewall</td>
                      <td className="p-2.5">Transit encrypted traffic</td>
                      <td className="p-2.5">Global Edge (India PoPs)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-white">Google Gemini</td>
                      <td className="p-2.5">Visual MTC table extraction</td>
                      <td className="p-2.5">Certificate image bytes (no training)</td>
                      <td className="p-2.5">Global Secure Cloud</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-white">Razorpay</td>
                      <td className="p-2.5">Subscription billing & payments</td>
                      <td className="p-2.5">Plan status, GSTIN, payment ID</td>
                      <td className="p-2.5">Bangalore, India</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-white">Resend</td>
                      <td className="p-2.5">Transactional email delivery</td>
                      <td className="p-2.5">Recipient email, notification links</td>
                      <td className="p-2.5">EU / US Cloud</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-white">Sentry</td>
                      <td className="p-2.5">Error tracking & diagnostics</td>
                      <td className="p-2.5">Redacted crash telemetry (no PII)</td>
                      <td className="p-2.5">EU Cloud</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h2 className="text-base font-semibold text-slate-100">3. AI Consent Override</h2>
              <p>
                Organization owners may switch off AI extraction consent in Organization Settings at any time. When disabled,
                certificates are parsed entirely on-premise/locally using the PyMuPDF vector text engine with zero external API calls.
              </p>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-8 text-center text-xs text-slate-400">
          <p>Prepares trade compliance documents for review. Not legal advice.</p>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
