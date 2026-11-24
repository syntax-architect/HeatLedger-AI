import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Download,
  MessageSquare,
  FileQuestion,
  CheckCircle,
  Clock,
  Building,
  Anchor,
  FileText,
  Send,
  ExternalLink,
  Lock,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const ImporterPortalPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [packData, setPackData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [requiresPin, setRequiresPin] = useState(false);

  // Seal Verification
  const [verifyingSeal, setVerifyingSeal] = useState(false);
  const [sealResult, setSealResult] = useState<any>(null);

  // Actions
  const [commentText, setCommentText] = useState('');
  const [commenterName, setCommenterName] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [missingItem, setMissingItem] = useState('');
  const [missingHeat, setMissingHeat] = useState('');
  const [missingNote, setMissingNote] = useState('');
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);

  const [isMarkingReceived, setIsMarkingReceived] = useState(false);
  const [receivedSuccess, setReceivedSuccess] = useState(false);

  // Supplier Invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSupplierName, setInviteSupplierName] = useState('');
  const [inviteConsent, setInviteConsent] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  const fetchPack = async (pinCode?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = pinCode ? `/api/importer-portal/${token}?pin=${pinCode}` : `/api/importer-portal/${token}`;
      const res = await fetch(url);
      if (res.status === 403) {
        setRequiresPin(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        throw new Error('This evidence pack share link has expired, was revoked, or does not exist.');
      }
      const data = await res.json();
      setPackData(data);
      setRequiresPin(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchPack();
  }, [token]);

  const handleVerifySeal = async () => {
    if (!token) return;
    setVerifyingSeal(true);
    try {
      const res = await fetch(`/api/importer-portal/${token}/verify-seal`, { method: 'POST' });
      const data = await res.json();
      setSealResult(data);
    } catch {
      setSealResult({ verified: false, match: false, reason: 'Failed to verify cryptographic seal.' });
    } finally {
      setVerifyingSeal(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !token) return;
    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/importer-portal/${token}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: commenterName || 'Importer Team', message: commentText }),
      });
      if (res.ok) {
        setCommentText('');
        fetchPack();
      }
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleRequestMissingDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!missingItem.trim() || !missingHeat.trim() || !token) return;
    setIsSubmittingReq(true);
    try {
      const res = await fetch(`/api/importer-portal/${token}/request-missing-doc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heat_number: missingHeat,
          missing_item: missingItem,
          note: missingNote,
        }),
      });
      if (res.ok) {
        setMissingItem('');
        setMissingHeat('');
        setMissingNote('');
        fetchPack();
      }
    } finally {
      setIsSubmittingReq(false);
    }
  };

  const handleMarkReceived = async () => {
    if (!token) return;
    setIsMarkingReceived(true);
    try {
      const res = await fetch(`/api/importer-portal/${token}/mark-received`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ received_by: commenterName || 'Customs Clearance Team' }),
      });
      if (res.ok) {
        setReceivedSuccess(true);
        fetchPack();
      }
    } finally {
      setIsMarkingReceived(false);
    }
  };

  const handleInviteSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteConsent || !token) return;
    setInviteStatus('sending');
    try {
      const res = await fetch(`/api/importer-portal/${token}/invite-supplier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_email: inviteEmail,
          supplier_name: inviteSupplierName || 'Supplier Executive',
          importer_consent: inviteConsent,
          importer_name: packData?.pack?.importer_name,
        }),
      });
      if (res.ok) {
        setInviteStatus('sent');
        setInviteEmail('');
        setInviteSupplierName('');
      } else {
        setInviteStatus('error');
      }
    } catch {
      setInviteStatus('error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="text-xs font-mono tracking-widest text-slate-400">LOADING EVIDENCE PACK...</span>
        </div>
      </div>
    );
  }

  if (requiresPin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-left shadow-2xl border border-slate-200">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Email-Protected Evidence Pack</h2>
          <p className="text-xs text-slate-500 mt-1">
            This shipment evidence pack is protected. Enter the 6-digit access PIN sent to your email.
          </p>
          <div className="mt-4 space-y-3">
            <input
              type="text"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter 6-digit PIN"
              className="w-full text-center tracking-widest text-2xl font-mono px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={() => fetchPack(pin)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Unlock Dossier
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error || !packData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900">Link Unavailable</h2>
          <p className="text-xs text-slate-500 mt-1">{error || 'Unable to open evidence pack.'}</p>
          <Link
            to="/"
            className="mt-5 inline-block px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
          >
            Go to HeatLedger Home
          </Link>
        </div>
      </div>
    );
  }

  const pack = packData.pack;
  const isSealed = pack.is_sealed || !!pack.seal_details || !!pack.seal_hash;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans text-left pb-16">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-mono">EU CUSTOMS EVIDENCE DOSSIER</span>
            <span className="text-sm font-semibold text-white tracking-tight">{pack.plant_name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/importer-portal/${token}/download-pdf`}
            download={`${pack.shipment_id}_dossier.pdf`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download Sealed PDF
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 mt-8 space-y-8">
        {/* Dossier Header Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  REG (EU) 2026/1384 &amp; 2026/1963
                </span>
                <span className="text-xs text-slate-400 font-mono">Shipment #{pack.shipment_id}</span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Melt-and-Pour Pre-Clearance Dossier
              </h1>
              <p className="text-xs text-slate-400">
                Prepared by {pack.plant_name} for designated importer {pack.importer_name}
              </p>
            </div>

            {/* Seal Re-verify Action */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 min-w-[280px]">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400">Cryptographic Seal</span>
                <span className="text-emerald-400 font-mono font-medium">
                  {isSealed ? 'SEALED & HASHED' : 'UNSEALED'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleVerifySeal}
                disabled={verifyingSeal}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 border border-slate-700 transition-colors"
              >
                {verifyingSeal ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                Check Seal Integrity
              </button>

              {sealResult && (
                <div
                  className={`mt-2.5 p-2 rounded-lg text-[11px] ${
                    sealResult.verified
                      ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300'
                      : 'bg-rose-950/60 border border-rose-800/60 text-rose-300'
                  }`}
                >
                  <div className="font-semibold">{sealResult.verified ? '✓ Seal Signature Valid' : '✕ Tamper Detected'}</div>
                  <div className="text-[10px] opacity-80 mt-0.5">{sealResult.disclaimer}</div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 text-xs">
            <div>
              <span className="text-slate-500 block">Exporting Plant</span>
              <span className="font-medium text-slate-200 mt-0.5 block">{pack.plant_name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Designated Importer</span>
              <span className="font-medium text-slate-200 mt-0.5 block">{pack.importer_name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Destination Port</span>
              <span className="font-medium text-slate-200 mt-0.5 block">{pack.destination_country || 'EU Port'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Receipt Confirmation</span>
              <span className="font-medium text-emerald-400 mt-0.5 block">
                {packData.receipt_status === 'ACCEPTED' || receivedSuccess ? 'Accepted by Importer' : 'Pending Review'}
              </span>
            </div>
          </div>
        </div>

        {/* Heat Evidence Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Heat-Level Provenance &amp; Mill Origins</h2>
            <span className="text-xs text-slate-400 font-mono">
              {(pack.heats_evidence || pack.heat_summary || []).length} Verified Heats
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-mono uppercase text-[10px]">
                <tr>
                  <th className="px-6 py-3">Heat Number</th>
                  <th className="px-6 py-3">Melt Country</th>
                  <th className="px-6 py-3">Pour Country</th>
                  <th className="px-6 py-3">Document Source</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(pack.heats_evidence || pack.heat_summary || []).map((h: any, i: number) => {
                  const status = h.status || 'Evidence present';
                  const isOk = status === 'Evidence present';
                  return (
                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-medium text-white">{h.heat_number}</td>
                      <td className="px-6 py-3.5 text-slate-300">{h.country_of_melt || '-'}</td>
                      <td className="px-6 py-3.5 text-slate-300">{h.country_of_pour || '-'}</td>
                      <td className="px-6 py-3.5 text-slate-400 font-mono">{h.source || 'EN 10204 3.1 MTC'}</td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            isOk
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Importer Actions Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Action 1: Request Missing Document */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <FileQuestion className="w-4 h-4 text-amber-400" />
              <span>Request Missing Document</span>
            </div>
            <p className="text-xs text-slate-400">
              Need a mill letter for continuous casting or an amended MTC? Submit directly to the plant's QA ledger.
            </p>
            <form onSubmit={handleRequestMissingDoc} className="space-y-3">
              <input
                type="text"
                placeholder="Heat Number (e.g. HT-101)"
                value={missingHeat}
                onChange={(e) => setMissingHeat(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                type="text"
                placeholder="Missing Item (e.g. Ladle pour letter)"
                value={missingItem}
                onChange={(e) => setMissingItem(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <textarea
                placeholder="Reason or Customs request note..."
                value={missingNote}
                onChange={(e) => setMissingNote(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={isSubmittingReq}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
              >
                <Send className="w-3 h-3" />
                {isSubmittingReq ? 'Sending...' : 'Send Request to Plant QA'}
              </button>
            </form>
          </div>

          {/* Action 2: Mark Received & Comment */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Mark Consignment Received</span>
              </div>
              <button
                type="button"
                onClick={handleMarkReceived}
                disabled={isMarkingReceived || receivedSuccess || packData.receipt_status === 'ACCEPTED'}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors"
              >
                {receivedSuccess || packData.receipt_status === 'ACCEPTED' ? '✓ Accepted' : 'Confirm Receipt'}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Leave review comments or questions for the exporter's shipping team.
            </p>
            <form onSubmit={handlePostComment} className="space-y-3">
              <input
                type="text"
                placeholder="Your Name / Organization"
                value={commenterName}
                onChange={(e) => setCommenterName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <textarea
                placeholder="Write your note or question..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={isSubmittingComment}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
              >
                <MessageSquare className="w-3 h-3" />
                {isSubmittingComment ? 'Posting...' : 'Post Importer Comment'}
              </button>
            </form>
          </div>
        </div>

        {/* Task C3 Item 5: Supplier Invite Banner */}
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/20 rounded-2xl p-6 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Supplier Network Acceleration
              </div>
              <h3 className="text-base font-bold text-white">
                Do your other suppliers send you packs like this? Invite them.
              </h3>
              <p className="text-xs text-slate-400 max-w-xl">
                Eliminate customs query delays across your entire supply chain. Invite your steel rolling mills and exporters to provide tamper-evident melt-and-pour dossiers.
              </p>
            </div>
          </div>

          <form onSubmit={handleInviteSupplier} className="mt-4 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Supplier Company Name"
              value={inviteSupplierName}
              onChange={(e) => setInviteSupplierName(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <input
              type="email"
              placeholder="supplier.export@steelmill.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={!inviteConsent || inviteStatus === 'sending'}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors shrink-0"
            >
              {inviteStatus === 'sending' ? 'Sending...' : 'Send Free Invitation'}
            </button>
          </form>

          <label className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={inviteConsent}
              onChange={(e) => setInviteConsent(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-0"
            />
            <span>I agree to send this invitation referencing {pack.importer_name} as the requesting buyer.</span>
          </label>

          {inviteStatus === 'sent' && (
            <div className="mt-2 text-xs text-emerald-400 font-medium">✓ Invitation email dispatched via Resend.</div>
          )}
        </div>

        {/* Footer Disclaimer */}
        <div className="text-center text-[11px] text-slate-500 pt-6">
          Prepares documents for review. Not legal advice. This seal shows the file has not changed since sealing.
        </div>
      </main>
    </div>
  );
};

export default ImporterPortalPage;
