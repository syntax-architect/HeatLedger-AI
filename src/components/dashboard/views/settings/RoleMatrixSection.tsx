import React from 'react';
import { Shield } from 'lucide-react';

export const RoleMatrixSection: React.FC = () => {
  return (
    <section className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#059669] flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-sm font-medium text-[#18181A]">
            Plant Role Access Matrix
          </h2>
          <p className="text-xs text-[#55544E]">
            Four defined plant roles with strict separation of duties
          </p>
        </div>
      </div>

      <div className="overflow-x-auto border border-[#18181A]/10 rounded-lg">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#F7F5F0] border-b border-[#18181A]/10 text-[#55544E]">
            <tr>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Plant Scope</th>
              <th className="px-4 py-3 font-medium">Key Permissions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#18181A]/10 text-[#18181A]">
            <tr>
              <td className="px-4 py-3 font-mono font-medium text-[#047857]">OWNER</td>
              <td className="px-4 py-3">Factory Administration</td>
              <td className="px-4 py-3 text-[#55544E]">
                Full plant control, team invites &amp; removals, billing, key rotation.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-mono font-medium text-[#18181A]">QA_INSPECTOR</td>
              <td className="px-4 py-3">Quality Lab &amp; Metallurgy</td>
              <td className="px-4 py-3 text-[#55544E]">
                Enrolls private TOTP; authorizes cryptographic tamper-evidence seal.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-mono font-medium text-[#B45309]">DISPATCH</td>
              <td className="px-4 py-3">Logistics &amp; Shipping Floor</td>
              <td className="px-4 py-3 text-[#55544E]">
                Uploads MTCs, links heats to shipments, creates customs packs.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-mono font-medium text-[#55544E]">VIEWER</td>
              <td className="px-4 py-3">Auditors &amp; Finance</td>
              <td className="px-4 py-3 text-[#55544E]">
                Read-only access to packs, audit logs, and compliance records.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};
