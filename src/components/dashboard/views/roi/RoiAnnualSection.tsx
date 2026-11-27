import React from 'react';
import { Award } from 'lucide-react';
import { AnnualRoiView } from '../../../../services/api';

interface RoiAnnualSectionProps {
  annualView: AnnualRoiView;
}

export const RoiAnnualSection: React.FC<RoiAnnualSectionProps> = ({ annualView }) => (
  <div className="space-y-5">
    <div className="bg-[#121316] border border-[#2C303A] text-[#EAEAEA] rounded-xl p-6 space-y-5">
      <div className="max-w-2xl space-y-2">
        <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-[#10B981] border border-emerald-500/25 font-mono text-xs font-medium inline-block">
          Year 2026 Cumulative Audit
        </span>
        <h3 className="text-xl sm:text-2xl font-medium tracking-[-0.02em] text-[#EAEAEA]">
          Annual Subscription Proof-of-Value &amp; MSME Subsidy Data
        </h3>
        <p className="text-xs text-[#9FA3AD] leading-relaxed">
          Full 12-month aggregated figures for board renewal review and preparation of the Central
          Government 90% Technology Grant application.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-[#2C303A] text-xs">
        <div>
          <span className="text-[#9FA3AD] block">Total MTCs Processed</span>
          <span className="text-xl font-medium font-mono tabular-nums text-[#EAEAEA] mt-1 block">
            {annualView.total_certificates_processed}
          </span>
        </div>
        <div>
          <span className="text-[#9FA3AD] block">Total Labor Hours Saved</span>
          <span className="text-xl font-medium font-mono tabular-nums text-[#10B981] mt-1 block">
            {annualView.total_hours_saved} hrs
          </span>
        </div>
        <div>
          <span className="text-[#9FA3AD] block">Export Tonnage Released</span>
          <span className="text-xl font-medium font-mono tabular-nums text-[#EAEAEA] mt-1 block">
            {annualView.total_tonnage_released} MT
          </span>
        </div>
        <div>
          <span className="text-[#9FA3AD] block">Est. CBAM Duty Avoided</span>
          <span className="text-xl font-medium font-mono tabular-nums text-[#10B981] mt-1 block">
            €{annualView.total_estimated_cbam_duty_avoided_eur.toLocaleString('en-EU')}
          </span>
        </div>
      </div>
    </div>

    <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-6 space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-[#18181A]/10">
        <span className="w-9 h-9 rounded-lg bg-[#F7F5F0] text-[#B45309] flex items-center justify-center border border-[#18181A]/12 shrink-0">
          <Award className="w-4 h-4" strokeWidth={1.5} />
        </span>
        <div>
          <h4 className="font-medium text-[#18181A] text-base">
            Central MSME Clean Technology &amp; Digital Compliance Grant (90% Scheme)
          </h4>
          <p className="text-xs text-[#55544E]">
            Sourced subsidy filing package formatted under Ministry of Micro, Small and Medium
            Enterprises digital adoption guidelines.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 space-y-2">
          <span className="font-medium text-[#18181A] block">Grant Beneficiary Details</span>
          <div className="space-y-1 font-mono text-[#55544E]">
            <p>Enterprise: {annualView.msme_subsidy_application_data.enterprise_name}</p>
            <p>Category: {annualView.msme_subsidy_application_data.enterprise_category}</p>
            <p>Scheme: {annualView.msme_subsidy_application_data.subsidized_software_scheme}</p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#ECFDF5] border border-emerald-200 space-y-2">
          <span className="font-medium text-[#047857] block">Claimable Government Subsidy (90%)</span>
          <div className="space-y-1 text-[#047857]">
            <p className="font-mono tabular-nums">
              Total Incurred Annual Fee: ₹
              {annualView.msme_subsidy_application_data.expenditure_incurred_inr.toLocaleString(
                'en-IN'
              )}
            </p>
            <p className="font-mono tabular-nums text-base font-medium text-[#047857]">
              Net Claimable Grant: ₹
              {annualView.msme_subsidy_application_data.claimable_subsidy_amount_inr.toLocaleString(
                'en-IN'
              )}
            </p>
            <p className="text-xs text-[#55544E]">
              Net Plant Software Cost after Government Reimbursement: ₹11,998.80 / year (~₹999/mo)
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-xs space-y-2">
        <span className="font-medium text-[#18181A] block">
          Statutory Accreditations for Audit Submission
        </span>
        <div className="flex flex-wrap gap-2">
          {annualView.msme_subsidy_application_data.compliance_accreditations.map((acc, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded-md bg-[#FCFBF8] border border-[#18181A]/12 text-[#18181A] font-mono text-xs font-medium"
            >
              {acc}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
);
