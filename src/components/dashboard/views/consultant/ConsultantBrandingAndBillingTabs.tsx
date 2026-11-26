import React from 'react';
import { Copy, FileText, Palette, ShieldCheck } from 'lucide-react';
import { ConsolidatedInvoice, ConsultantReferralInfo } from '../../../../services/api';

interface ConsultantWhiteLabelTabProps {
  wlFirmName: string;
  onWlFirmNameChange: (v: string) => void;
  wlLogoUrl: string;
  onWlLogoUrlChange: (v: string) => void;
  wlPrimaryColor: string;
  onWlPrimaryColorChange: (v: string) => void;
  wlSecondaryColor: string;
  onWlSecondaryColorChange: (v: string) => void;
  wlCustomDomain: string;
  onWlCustomDomainChange: (v: string) => void;
  wlTagline: string;
  onWlTaglineChange: (v: string) => void;
  wlShowPdf: boolean;
  onWlShowPdfChange: (v: boolean) => void;
  wlShowPortal: boolean;
  onWlShowPortalChange: (v: boolean) => void;
  isSavingWl: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const ConsultantWhiteLabelTab: React.FC<ConsultantWhiteLabelTabProps> = ({
  wlFirmName,
  onWlFirmNameChange,
  wlLogoUrl,
  onWlLogoUrlChange,
  wlPrimaryColor,
  onWlPrimaryColorChange,
  wlSecondaryColor,
  onWlSecondaryColorChange,
  wlCustomDomain,
  onWlCustomDomainChange,
  wlTagline,
  onWlTaglineChange,
  wlShowPdf,
  onWlShowPdfChange,
  wlShowPortal,
  onWlShowPortalChange,
  isSavingWl,
  onSubmit,
}) => (
  <div className="space-y-6 max-w-3xl">
    <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#18181A]/12 flex items-start gap-3">
      <ShieldCheck className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" strokeWidth={1.5} />
      <div className="text-xs text-[#55544E] space-y-1">
        <strong className="font-medium text-[#18181A]">
          Statutory White-Label Governance Policy:
        </strong>
        <p>
          Your firm&apos;s brand, logo, and theme colours are automatically applied to exported PDF
          compliance dossiers and client-facing verification portals. In strict conformance with{' '}
          <strong className="font-medium text-[#18181A]">
            Regulation (EU) 2023/956 Article 25 and EN 10204 Clause 6
          </strong>
          , all verification metadata remains cryptographically sealed.
        </p>
      </div>
    </div>

    <form
      onSubmit={onSubmit}
      className="bg-[#FCFBF8] p-6 rounded-xl border border-[#18181A]/10 space-y-5 text-xs"
    >
      <h3 className="text-sm font-medium text-[#18181A] flex items-center gap-2">
        <Palette className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
        <span>White-Label Identity &amp; Portal Styling</span>
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="font-medium text-[#18181A] block">Advisory Firm Name</label>
          <input
            type="text"
            value={wlFirmName}
            onChange={(e) => onWlFirmNameChange(e.target.value)}
            placeholder="e.g. Singhania Global Advisory"
            className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-medium text-[#18181A] block">Logo URL (PNG / SVG)</label>
          <input
            type="url"
            value={wlLogoUrl}
            onChange={(e) => onWlLogoUrlChange(e.target.value)}
            placeholder="https://yourfirm.com/logo.png"
            className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-medium text-[#18181A] block">Primary Theme Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={wlPrimaryColor}
              onChange={(e) => onWlPrimaryColorChange(e.target.value)}
              className="w-9 h-9 rounded-lg cursor-pointer border border-[#18181A]/15"
            />
            <input
              type="text"
              value={wlPrimaryColor}
              onChange={(e) => onWlPrimaryColorChange(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono text-xs focus:outline-none focus:border-[#059669]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-medium text-[#18181A] block">Secondary Accent Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={wlSecondaryColor}
              onChange={(e) => onWlSecondaryColorChange(e.target.value)}
              className="w-9 h-9 rounded-lg cursor-pointer border border-[#18181A]/15"
            />
            <input
              type="text"
              value={wlSecondaryColor}
              onChange={(e) => onWlSecondaryColorChange(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] font-mono text-xs focus:outline-none focus:border-[#059669]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-medium text-[#18181A] block">Custom Domain Alias</label>
          <input
            type="text"
            value={wlCustomDomain}
            onChange={(e) => onWlCustomDomainChange(e.target.value)}
            placeholder="cbam.yourfirm.com"
            className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] text-xs font-mono focus:outline-none focus:border-[#059669]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-medium text-[#18181A] block">Custom Header Tagline</label>
          <input
            type="text"
            value={wlTagline}
            onChange={(e) => onWlTaglineChange(e.target.value)}
            placeholder="Authorised Customs & CBAM Compliance Auditors"
            className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] text-xs focus:outline-none focus:border-[#059669]"
          />
        </div>
      </div>

      <div className="p-4 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 space-y-3">
        <label className="flex items-center justify-between cursor-pointer gap-3">
          <div>
            <span className="font-medium text-[#18181A] block">
              Show Firm Branding on Generated PDF Reports
            </span>
            <span className="text-[#55544E] text-xs">
              Places your logo and color header on client audit memoranda.
            </span>
          </div>
          <input
            type="checkbox"
            checked={wlShowPdf}
            onChange={(e) => onWlShowPdfChange(e.target.checked)}
            className="w-4 h-4 accent-[#059669] cursor-pointer shrink-0"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer pt-2.5 border-t border-[#18181A]/10 gap-3">
          <div>
            <span className="font-medium text-[#18181A] block">
              Show Firm Branding on Buyer Share Portal
            </span>
            <span className="text-[#55544E] text-xs">
              European buyers view your firm banner on shared shipment dossiers.
            </span>
          </div>
          <input
            type="checkbox"
            checked={wlShowPortal}
            onChange={(e) => onWlShowPortalChange(e.target.checked)}
            className="w-4 h-4 accent-[#059669] cursor-pointer shrink-0"
          />
        </label>
      </div>

      <div className="p-4 rounded-lg border border-[#18181A]/10 bg-[#F7F5F0] space-y-1.5">
        <div className="text-xs font-mono text-[#55544E] font-medium">
          Statutory Verification Seal:
        </div>
        <div className="text-xs text-[#18181A] font-medium">
          Prepared with HeatLedger AI · Cryptographic Clause 6 Verification Intact
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSavingWl}
          className="h-9 px-5 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] font-medium text-xs transition-colors duration-150 cursor-pointer disabled:opacity-50"
        >
          {isSavingWl ? 'Saving Changes...' : 'Save White-Label Configuration'}
        </button>
      </div>
    </form>
  </div>
);

interface ConsultantBillingReferralsTabProps {
  referrals: ConsultantReferralInfo | null;
  invoice: ConsolidatedInvoice | null;
  onCopy: (text: string, label: string) => void;
}

export const ConsultantBillingReferralsTab: React.FC<ConsultantBillingReferralsTabProps> = ({
  referrals,
  invoice,
  onCopy,
}) => (
  <div className="space-y-6">
    {referrals && (
      <div className="p-5 rounded-xl bg-[#121316] border border-[#2C303A] text-[#EAEAEA] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
              <span className="text-xs text-[#10B981] font-medium">
                Consultant Referral &amp; Commission Program
              </span>
            </div>
            <h3 className="text-lg font-medium tracking-[-0.01em] mt-0.5 text-[#EAEAEA]">
              Earn {referrals.consultant_commission_pct}% Monthly Recurring Credits per Client Factory
            </h3>
            <p className="text-xs text-[#9FA3AD] mt-1 max-w-xl">
              Share your partner code with factories. Your clients receive{' '}
              {referrals.client_discount_pct}% off their subscription, and your consultancy earns
              ₹1,999.80 monthly recurring credit per active plant.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto bg-[#181A1F] p-2.5 rounded-lg border border-[#2C303A]">
            <div className="font-mono font-medium text-sm text-[#10B981]">
              {referrals.referral_code}
            </div>
            <button
              type="button"
              onClick={() => onCopy(referrals.share_url, 'Referral Link')}
              className="p-1.5 rounded-md bg-[#22252B] hover:bg-[#2C303A] text-[#10B981] cursor-pointer"
              title="Copy referral link"
            >
              <Copy className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-[#2C303A] text-xs font-mono tabular-nums">
          <div>
            <span className="text-[#9FA3AD] font-sans">Active Referred Plants: </span>
            <span className="font-medium text-[#EAEAEA]">
              {referrals.active_referred_plants_count}
            </span>
          </div>
          <div>
            <span className="text-[#9FA3AD] font-sans">Monthly Commission Accrual: </span>
            <span className="font-medium text-[#10B981]">
              ₹{referrals.monthly_recurring_commission_inr.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    )}

    {invoice && (
      <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden text-xs">
        <div className="p-4 border-b border-[#18181A]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-medium text-[#18181A] text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
              <span>Consolidated Monthly Tax Invoice: {invoice.invoice_number}</span>
            </h3>
            <p className="text-xs text-[#55544E] mt-0.5">
              Billed to {invoice.firm_name} for period {invoice.billing_month} (
              {invoice.total_active_plants} active client factories).
            </p>
          </div>

          <span className="px-2.5 py-1 rounded-md bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] font-mono text-xs font-medium self-start sm:self-auto">
            SAC 998313 · GST 18%
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F7F5F0] border-b border-[#18181A]/10 text-[#55544E]">
              <tr>
                <th className="py-3 px-4 font-medium">Client Factory</th>
                <th className="py-3 px-4 font-medium">Service Description</th>
                <th className="py-3 px-4 font-medium text-right">Base Fee (INR)</th>
                <th className="py-3 px-4 font-medium text-right">GST @ 18%</th>
                <th className="py-3 px-4 font-medium text-right">Total (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18181A]/10 text-[#18181A]">
              {invoice.line_items.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#F7F5F0]">
                  <td className="py-3 px-4 font-medium text-[#18181A]">
                    {item.plant_name} ({item.plant_code})
                  </td>
                  <td className="py-3 px-4 text-[#55544E]">{item.service_description}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    ₹{item.monthly_rate_inr.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#55544E]">
                    ₹{item.gst_18_pct.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-[#18181A]">
                    ₹{item.total_inr.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[#F7F5F0] font-mono tabular-nums border-t border-[#18181A]/10">
              <tr>
                <td colSpan={4} className="py-2.5 px-4 text-right text-[#55544E] font-medium font-sans">
                  Subtotal:
                </td>
                <td className="py-2.5 px-4 text-right font-medium text-[#18181A]">
                  ₹{invoice.subtotal_inr.toLocaleString('en-IN')}
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="py-2.5 px-4 text-right text-[#55544E] font-medium font-sans">
                  Total GST (18%):
                </td>
                <td className="py-2.5 px-4 text-right font-medium text-[#18181A]">
                  ₹{invoice.gst_18_pct_total_inr.toLocaleString('en-IN')}
                </td>
              </tr>
              <tr className="text-[#047857]">
                <td colSpan={4} className="py-2.5 px-4 text-right font-medium font-sans">
                  Less Consultant Partner Commission ({invoice.consultant_commission_pct}% Credit):
                </td>
                <td className="py-2.5 px-4 text-right font-medium">
                  -₹{invoice.commission_credit_inr.toLocaleString('en-IN')}
                </td>
              </tr>
              <tr className="text-sm font-medium border-t border-[#18181A]/20 text-[#18181A]">
                <td colSpan={4} className="py-3 px-4 text-right font-sans">
                  Net Payable Retainer (INR):
                </td>
                <td className="py-3 px-4 text-right text-[#047857]">
                  ₹{invoice.net_payable_inr.toLocaleString('en-IN')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    )}
  </div>
);
