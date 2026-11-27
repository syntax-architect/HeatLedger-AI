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
      <div className="min-h-screen bg-[#121316] flex items-center justify-center text-[#EAEAEA]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-7 h-7 text-[#10B981] animate-spin" strokeWidth={1.5} />
          <span className="text-xs font-mono text-[#9FA3AD]">Loading evidence pack...</span>
        </div>
      </div>
    );
  }

  if (requiresPin) {
    return (
      <div className="min-h-screen bg-[#121316] flex items-center justify-center p-4">
        <div className="bg-[#181A1F] rounded-xl max-w-md w-full p-6 text-left border border-[#2C303A]">
          <div className="w-10 h-10 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg flex items-center justify-center mb-4">
            <Lock className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-medium text-[#EAEAEA]">Email-Protected Evidence Pack</h2>
          <p className="text-xs text-[#9FA3AD] mt-1">
            This shipment evidence pack is protected. Enter the 6-digit access PIN sent to your email.
          </p>
          <div className="mt-4 space-y-3">
            <input
              type="text"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter 6-digit PIN"
              className="w-full h-11 text-center tracking-widest text-xl font-mono px-4 bg-[#121316] border border-[#2C303A] text-[#EAEAEA] rounded-lg focus:outline-none focus:border-[#10B981]"
            />
            <button
              onClick={() => fetchPack(pin)}
              className="w-full h-9 bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] font-medium rounded-lg text-xs transition-colors"
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
      <div className="min-h-screen bg-[#121316] flex items-center justify-center p-4">
        <div className="bg-[#181A1F] rounded-xl max-w-md w-full p-6 text-center border border-[#2C303A]">
          <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto mb-3" strokeWidth={1.5} />
          <h2 className="text-base font-medium text-[#EAEAEA]">Link Unavailable</h2>
          <p className="text-xs text-[#9FA3AD] mt-1">{error || 'Unable to open evidence pack.'}</p>
          <Link
            to="/"
            className="mt-5 inline-flex h-9 items-center px-4 bg-[#2C303A] text-[#EAEAEA] text-xs font-medium rounded-lg hover:bg-[#3A3F4B] transition-colors"
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
    <div className="min-h-screen bg-[#121316] text-[#EAEAEA] font-sans text-left pb-16">
      {/* Top Bar */}
      <header className="border-b border-[#2C303A] bg-[#121316]/90 backdrop-blur sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 text-[#10B981] flex items-center justify-center border border-[#10B981]/20">
            <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-[11px] text-[#9FA3AD] block font-mono">EU Customs Evidence Dossier</span>
            <span className="text-sm font-medium text-[#EAEAEA] tracking-tight">{pack.plant_name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/importer-portal/${token}/download-pdf`}
            download={`${pack.shipment_id}_dossier.pdf`}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
            Download Sealed PDF
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 mt-8 space-y-6">
        {/* Dossier Header Card */}
        <div className="bg-[#181A1F] border border-[#2C303A] rounded-xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#2C303A]">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                  Reg (EU) 2026/1384 &amp; 2026/1963
                </span>
                <span className="text-xs text-[#9FA3AD] font-mono">Shipment #{pack.shipment_id}</span>
              </div>
              <h1 className="text-2xl font-medium text-[#EAEAEA] tracking-tight">
                Melt-and-Pour Pre-Clearance Dossier
              </h1>
              <p className="text-xs text-[#9FA3AD]">
                Prepared by {pack.plant_name} for designated importer {pack.importer_name}
              </p>
            </div>

            {/* Seal Re-verify Action */}
            <div className="bg-[#121316] border border-[#2C303A] rounded-lg p-4 min-w-[280px]">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-[#9FA3AD]">Cryptographic Seal</span>
                <span className="text-[#10B981] font-mono font-medium">
                  {isSealed ? 'Sealed & Hashed' : 'Unsealed'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleVerifySeal}
                disabled={verifyingSeal}
                className="w-full h-9 bg-[#2C303A] hover:bg-[#3A3F4B] text-[#EAEAEA] text-xs font-medium rounded-lg flex items-center justify-center gap-2 border border-[#3A3F4B] transition-colors"
              >
                {verifyingSeal ? <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} /> : <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" strokeWidth={1.5} />}
                Check Seal Integrity
              </button>

              {sealResult && (
                <div
                  className={`mt-2.5 p-2 rounded-lg text-[11px] border ${
                    sealResult.verified
                      ? 'bg-[#10B981]/10 border-[#10B981]/25 text-[#10B981]'
                      : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                  }`}
                >
                  <div className="font-medium">{sealResult.verified ? '✓ Seal Signature Valid' : '✕ Tamper Detected'}</div>
                  <div className="text-[11px] opacity-80 mt-0.5">{sealResult.disclaimer}</div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 text-xs">
            <div>
              <span className="text-[#9FA3AD] block">Exporting Plant</span>
              <span className="font-medium text-[#EAEAEA] mt-0.5 block">{pack.plant_name}</span>
            </div>
            <div>
              <span className="text-[#9FA3AD] block">Designated Importer</span>
              <span className="font-medium text-[#EAEAEA] mt-0.5 block">{pack.importer_name}</span>
            </div>
            <div>
              <span className="text-[#9FA3AD] block">Destination Port</span>
              <span className="font-medium text-[#EAEAEA] mt-0.5 block">{pack.destination_country || 'EU Port'}</span>
            </div>
            <div>
              <span className="text-[#9FA3AD] block">Receipt Confirmation</span>
              <span className="font-medium text-[#10B981] mt-0.5 block">
                {packData.receipt_status === 'ACCEPTED' || receivedSuccess ? 'Accepted by Importer' : 'Pending Review'}
              </span>
            </div>
          </div>
        </div>

        {/* Heat Evidence Table */}
        <div className="bg-[#181A1F] border border-[#2C303A] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2C303A] flex items-center justify-between">
            <h2 className="text-sm font-medium text-[#EAEAEA]">Heat-Level Provenance &amp; Mill Origins</h2>
            <span className="text-xs text-[#9FA3AD] font-mono">
              {(pack.heats_evidence || pack.heat_summary || []).length} Verified Heats
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#121316] text-[#9FA3AD] border-b border-[#2C303A] font-medium">
                <tr>
                  <th className="px-6 py-3">Heat Number</th>
                  <th className="px-6 py-3">Melt Country</th>
                  <th className="px-6 py-3">Pour Country</th>
                  <th className="px-6 py-3">Document Source</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2C303A]">
                {(pack.heats_evidence || pack.heat_summary || []).map((h: any, i: number) => {
                  const status = h.status || 'Evidence present';
                  const isOk = status === 'Evidence present';
                  return (
                    <tr key={i} className="hover:bg-[#121316]/60 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-medium text-[#EAEAEA]">{h.heat_number}</td>
                      <td className="px-6 py-3.5 text-[#EAEAEA]">{h.country_of_melt || '-'}</td>
                      <td className="px-6 py-3.5 text-[#EAEAEA]">{h.country_of_pour || '-'}</td>
                      <td className="px-6 py-3.5 text-[#9FA3AD] font-mono">{h.source || 'EN 10204 3.1 MTC'}</td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                            isOk
                              ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
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
          <div className="bg-[#181A1F] border border-[#2C303A] rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-[#EAEAEA] font-medium text-sm">
              <FileQuestion className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
              <span>Request Missing Document</span>
            </div>
            <p className="text-xs text-[#9FA3AD]">
              Need a mill letter for continuous casting or an amended MTC? Submit directly to the plant's QA ledger.
            </p>
            <form onSubmit={handleRequestMissingDoc} className="space-y-3">
              <input
                type="text"
                placeholder="Heat Number (e.g. HT-101)"
                value={missingHeat}
                onChange={(e) => setMissingHeat(e.target.value)}
                required
                className="w-full h-9 px-3 bg-[#121316] border border-[#2C303A] rounded-lg text-xs text-[#EAEAEA] focus:outline-none focus:border-[#10B981]"
              />
              <input
                type="text"
                placeholder="Missing Item (e.g. Ladle pour letter)"
                value={missingItem}
                onChange={(e) => setMissingItem(e.target.value)}
                required
                className="w-full h-9 px-3 bg-[#121316] border border-[#2C303A] rounded-lg text-xs text-[#EAEAEA] focus:outline-none focus:border-[#10B981]"
              />
              <textarea
                placeholder="Reason or Customs request note..."
                value={missingNote}
                onChange={(e) => setMissingNote(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-[#121316] border border-[#2C303A] rounded-lg text-xs text-[#EAEAEA] focus:outline-none focus:border-[#10B981]"
              />
              <button
                type="submit"
                disabled={isSubmittingReq}
                className="h-9 px-4 bg-[#2C303A] hover:bg-[#3A3F4B] text-[#EAEAEA] rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
                {isSubmittingReq ? 'Sending...' : 'Send Request to Plant QA'}
              </button>
            </form>
          </div>

          {/* Action 2: Mark Received & Comment */}
          <div className="bg-[#181A1F] border border-[#2C303A] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#EAEAEA] font-medium text-sm">
                <CheckCircle className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
                <span>Mark Consignment Received</span>
              </div>
              <button
                type="button"
                onClick={handleMarkReceived}
                disabled={isMarkingReceived || receivedSuccess || packData.receipt_status === 'ACCEPTED'}
                className="h-8 px-3 bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] rounded-lg text-xs font-medium transition-colors"
              >
                {receivedSuccess || packData.receipt_status === 'ACCEPTED' ? '✓ Accepted' : 'Confirm Receipt'}
              </button>
            </div>
            <p className="text-xs text-[#9FA3AD]">
              Leave review comments or questions for the exporter's shipping team.
            </p>
            <form onSubmit={handlePostComment} className="space-y-3">
              <input
                type="text"
                placeholder="Your Name / Organization"
                value={commenterName}
                onChange={(e) => setCommenterName(e.target.value)}
                className="w-full h-9 px-3 bg-[#121316] border border-[#2C303A] rounded-lg text-xs text-[#EAEAEA] focus:outline-none focus:border-[#10B981]"
              />
              <textarea
                placeholder="Write your note or question..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
                required
                className="w-full px-3 py-2 bg-[#121316] border border-[#2C303A] rounded-lg text-xs text-[#EAEAEA] focus:outline-none focus:border-[#10B981]"
              />
              <button
                type="submit"
                disabled={isSubmittingComment}
                className="h-9 px-4 bg-[#2C303A] hover:bg-[#3A3F4B] text-[#EAEAEA] rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
                {isSubmittingComment ? 'Posting...' : 'Post Importer Comment'}
              </button>
            </form>
          </div>
        </div>

        {/* Supplier Invite Banner */}
        <div className="bg-[#181A1F] border border-[#10B981]/25 rounded-xl p-6 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[#10B981] font-medium text-xs">
                <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Supplier Network Acceleration</span>
              </div>
              <h3 className="text-base font-medium text-[#EAEAEA]">
                Do your other suppliers send you packs like this? Invite them.
              </h3>
              <p className="text-xs text-[#9FA3AD] max-w-xl">
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
              className="h-9 px-3 bg-[#121316] border border-[#2C303A] rounded-lg text-xs text-[#EAEAEA] focus:outline-none focus:border-[#10B981]"
            />
            <input
              type="email"
              placeholder="supplier.export@steelmill.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="flex-1 h-9 px-3 bg-[#121316] border border-[#2C303A] rounded-lg text-xs text-[#EAEAEA] focus:outline-none focus:border-[#10B981]"
            />
            <button
              type="submit"
              disabled={!inviteConsent || inviteStatus === 'sending'}
              className="h-9 px-4 bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-[#FCFBF8] font-medium text-xs rounded-lg transition-colors shrink-0"
            >
              {inviteStatus === 'sending' ? 'Sending...' : 'Send Free Invitation'}
            </button>
          </form>

          <label className="mt-2.5 flex items-center gap-2 text-[11px] text-[#9FA3AD] cursor-pointer">
            <input
              type="checkbox"
              checked={inviteConsent}
              onChange={(e) => setInviteConsent(e.target.checked)}
              className="rounded border-[#2C303A] bg-[#121316] accent-[#10B981]"
            />
            <span>I agree to send this invitation referencing {pack.importer_name} as the requesting buyer.</span>
          </label>

          {inviteStatus === 'sent' && (
            <div className="mt-2 text-xs text-[#10B981] font-medium">✓ Invitation email dispatched via Resend.</div>
          )}
        </div>

        {/* Footer Disclaimer */}
        <div className="text-center text-[11px] text-[#9FA3AD] pt-6">
          Prepares documents for review. Not legal advice. This seal shows the file has not changed since sealing.
        </div>
      </main>
    </div>
  );
};

export default ImporterPortalPage;
