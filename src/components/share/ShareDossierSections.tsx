import React from 'react';
import { Link } from 'react-router-dom';
import {
  Anchor,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Flame,
  MessageSquare,
  Package,
  QrCode,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { BuyerDossier } from '../../services/api';

interface ShareDossierOverviewCardProps {
  dossier: BuyerDossier;
  isAccepted: boolean;
  onOpenModal: (modalType: 'ACCEPT' | 'QR') => void;
}

export const ShareDossierOverviewCard: React.FC<ShareDossierOverviewCardProps> = ({
  dossier,
  isAccepted,
  onOpenModal,
}) => (
  <section className="bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl overflow-hidden">
    <div className="px-6 py-3.5 bg-[#ECFDF5] border-b border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" strokeWidth={1.5} />
        <span className="text-xs font-medium text-[#065F46]">
          {isAccepted
            ? 'Accepted for EU Customs Clearance — Exporter QA Notified'
            : 'Sealed EU CBAM & Mill Customs Compliance Pack'}
        </span>
      </div>
      <span className="font-mono text-xs text-[#047857]">
        Token {dossier.token.slice(0, 12)}… · Expires{' '}
        {new Date(dossier.expires_at).toLocaleDateString()}
      </span>
    </div>

    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-medium tracking-[-0.025em] text-[#18181A]">
            Shipment {dossier.shipment_id}
          </h1>
          <p className="text-xs text-[#55544E] flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 font-medium text-[#18181A]">
              <Building2 className="w-3.5 h-3.5 text-[#55544E]" strokeWidth={1.5} />
              {dossier.exporter_name}
            </span>
            <span className="text-[#18181A]/25">/</span>
            <span>
              Origin:{' '}
              <strong className="font-medium text-[#18181A]">{dossier.exporter_country}</strong>
            </span>
            <span className="text-[#18181A]/25">/</span>
            <span>
              Destination:{' '}
              <strong className="font-medium text-[#18181A]">{dossier.destination_port}</strong>
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAccepted ? (
            <div className="h-9 px-3.5 rounded-lg bg-[#ECFDF5] border border-emerald-200 text-[#047857] text-xs font-medium inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Customs Cleared</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenModal('ACCEPT')}
              className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-medium text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Accept for Customs Clearance</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenModal('QR')}
            className="h-9 px-3 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium border border-[#18181A]/15 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            title="Inspect Verification QR Code"
          >
            <QrCode className="w-3.5 h-3.5 text-[#55544E]" strokeWidth={1.5} />
            <span>QR Seal</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#18181A]/10 border border-[#18181A]/10 rounded-lg overflow-hidden">
        <div className="p-3.5 bg-[#F7F5F0]">
          <div className="text-xs text-[#55544E] flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-[#55544E]" strokeWidth={1.5} />
            <span>Net Weight</span>
          </div>
          <div className="text-base font-medium font-mono tabular-nums text-[#18181A] mt-1">
            {dossier.net_weight_mt.toFixed(3)} MT
          </div>
          <div className="text-xs font-mono tabular-nums text-[#55544E] mt-0.5">
            Gross: {dossier.gross_weight_mt.toFixed(3)} MT
          </div>
        </div>

        <div className="p-3.5 bg-[#F7F5F0]">
          <div className="text-xs text-[#55544E] flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-[#55544E]" strokeWidth={1.5} />
            <span>CN Tariff Code</span>
          </div>
          <div
            className="text-sm font-medium font-mono text-[#18181A] mt-1 truncate"
            title={dossier.cn_code}
          >
            {dossier.cn_code}
          </div>
          <div className="text-xs text-[#047857] mt-0.5">Mill Test Certificate (MTC)</div>
        </div>

        <div className="p-3.5 bg-[#F7F5F0]">
          <div className="text-xs text-[#55544E] flex items-center gap-1.5">
            <Anchor className="w-3.5 h-3.5 text-[#55544E]" strokeWidth={1.5} />
            <span>Containers</span>
          </div>
          <div
            className="text-sm font-medium font-mono text-[#18181A] mt-1 truncate"
            title={dossier.containers.join(', ')}
          >
            {dossier.containers.join(', ')}
          </div>
          <div className="text-xs text-[#55544E] mt-0.5">
            {dossier.containers.length} FCL Sealed Units
          </div>
        </div>

        <div className="p-3.5 bg-[#F7F5F0]">
          <div className="text-xs text-[#55544E] flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
            <span>Specific Emissions</span>
          </div>
          <div className="text-base font-medium font-mono tabular-nums text-[#047857] mt-1">
            {dossier.emissions_summary.specific_embedded_emissions_tco2_per_t}{' '}
            <span className="text-xs font-normal text-[#55544E]">tCO₂/t</span>
          </div>
          <div className="text-xs font-mono tabular-nums text-[#047857] mt-0.5">
            -{dossier.emissions_summary.emissions_saving_pct}% vs. EU default
          </div>
        </div>
      </div>

      {dossier.custom_note && (
        <div className="p-3.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-xs text-[#18181A] flex items-start gap-2.5">
          <MessageSquare className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <span className="font-medium">Exporter Dispatch Note: </span>
            <span className="text-[#55544E]">{dossier.custom_note}</span>
          </div>
        </div>
      )}
    </div>
  </section>
);

interface ShareDownloadsSectionProps {
  getDownloadUrl: (fileType: 'zip' | 'cbam' | 'pdf') => string;
}

export const ShareDownloadsSection: React.FC<ShareDownloadsSectionProps> = ({ getDownloadUrl }) => (
  <section className="bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl overflow-hidden">
    <div className="px-6 py-4 border-b border-[#18181A]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div>
        <h2 className="text-sm font-medium text-[#18181A]">Customs Dossier Package Downloads</h2>
        <p className="text-xs text-[#55544E] mt-0.5">
          Byte-identical original preservation of upstream mill certificates and tamper-evident mill
          test certificate records.
        </p>
      </div>
    </div>

    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-4 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium text-[#18181A]">
            <FileArchive className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
            <span>Complete Dossier ZIP</span>
          </div>
          <p className="text-xs text-[#55544E] leading-relaxed">
            One-page summary PDF, untouched Mill MTCs, and SHA-256 manifest.
          </p>
        </div>
        <a
          href={getDownloadUrl('zip')}
          download
          className="w-full h-9 px-3 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Download Package (ZIP)</span>
        </a>
      </div>

      <div className="p-4 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium text-[#18181A]">
            <FileSpreadsheet className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
            <span>EU CBAM XML Sheet</span>
          </div>
          <p className="text-xs text-[#55544E] leading-relaxed">
            Structured EU CBAM communication template ready for importer registry filing.
          </p>
        </div>
        <a
          href={getDownloadUrl('cbam')}
          download
          className="w-full h-9 px-3 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium border border-[#18181A]/15 transition-colors inline-flex items-center justify-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5 text-[#55544E]" strokeWidth={1.5} />
          <span>Export XML Data Sheet</span>
        </a>
      </div>

      <div className="p-4 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium text-[#18181A]">
            <FileText className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
            <span>Customs Pack Cover Summary</span>
          </div>
          <p className="text-xs text-[#55544E] leading-relaxed">
            Digitally sealed exporter cover with QR tamper-evidence seal.
          </p>
        </div>
        <a
          href={getDownloadUrl('pdf')}
          download
          className="w-full h-9 px-3 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium border border-[#18181A]/15 transition-colors inline-flex items-center justify-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5 text-[#55544E]" strokeWidth={1.5} />
          <span>Download Cover PDF</span>
        </a>
      </div>
    </div>
  </section>
);

interface ShareDigitalSealSectionProps {
  digitalSignature: BuyerDossier['digital_signature'];
  copiedField: string | null;
  onCopy: (key: string, value: string) => void;
}

export const ShareDigitalSealSection: React.FC<ShareDigitalSealSectionProps> = ({
  digitalSignature,
  copiedField,
  onCopy,
}) => (
  <section className="bg-[#FCFBF8] border border-[#18181A]/10 rounded-xl overflow-hidden">
    <div className="px-6 py-4 border-b border-[#18181A]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <ShieldCheck className="w-4 h-4 text-[#059669] shrink-0" strokeWidth={1.5} />
        <div>
          <h2 className="text-sm font-medium text-[#18181A]">Tamper-Evidence Digital Seal</h2>
          <p className="text-xs text-[#55544E]">
            Sealed by the plant&apos;s authorised inspector. This is a tamper-evidence seal, not a
            legal verification.
          </p>
        </div>
      </div>

      <Link
        to={digitalSignature.verification_url}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#F7F5F0] hover:bg-[#EFECE5] text-[#047857] text-xs font-medium border border-[#18181A]/15 transition-colors self-start sm:self-center"
      >
        <span>Open Public Verifier</span>
        <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
      </Link>
    </div>

    <div className="divide-y divide-[#18181A]/10">
      <div className="px-6 py-3.5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-[#55544E]">Authorised QA Signer</div>
          <div className="text-sm font-medium text-[#18181A] mt-0.5">
            {digitalSignature.signer_name}
          </div>
        </div>
        <div>
          <div className="text-xs text-[#55544E]">Signed At (UTC)</div>
          <div className="text-sm font-mono tabular-nums text-[#18181A] mt-0.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#55544E]" strokeWidth={1.5} />
            <span>{digitalSignature.signed_at}</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-[#55544E]">
            Annex A Original Mill MTC SHA-256 ({digitalSignature.algorithm} · Key{' '}
            <span className="font-mono">{digitalSignature.public_key_fingerprint}</span>)
          </div>
          <div className="font-mono text-xs text-[#047857] break-all mt-0.5">
            {digitalSignature.annex_a_sha256}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onCopy('annex_sha', digitalSignature.annex_a_sha256)}
          className="self-start sm:self-center inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-[#18181A]/15 bg-[#F7F5F0] hover:bg-[#EFECE5] text-xs font-medium text-[#18181A] transition-colors cursor-pointer shrink-0"
        >
          {copiedField === 'annex_sha' ? (
            <Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
          ) : (
            <Copy className="w-3.5 h-3.5 text-[#55544E]" strokeWidth={1.5} />
          )}
          <span>{copiedField === 'annex_sha' ? 'Copied' : 'Copy SHA-256'}</span>
        </button>
      </div>
    </div>
  </section>
);
