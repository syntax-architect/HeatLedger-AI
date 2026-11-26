import React from 'react';
import { AlertTriangle, ChevronRight, Search } from 'lucide-react';
import {
  AtRiskShipmentCrossClient,
  ClientPlantAccess,
  CrossClientReviewItem,
} from '../../../../services/api';

interface ConsultantPlantsTabProps {
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  plantFilter: string;
  onPlantFilterChange: (f: string) => void;
  filteredPlants: ClientPlantAccess[];
  onRevokeAccess: (plantId: string) => void;
}

export const ConsultantPlantsTab: React.FC<ConsultantPlantsTabProps> = ({
  searchQuery,
  onSearchQueryChange,
  plantFilter,
  onPlantFilterChange,
  filteredPlants,
  onRevokeAccess,
}) => (
  <div className="space-y-4">
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs bg-[#FCFBF8] p-3 rounded-xl border border-[#18181A]/10">
      <div className="relative flex-1 max-w-sm">
        <Search className="w-4 h-4 text-[#78766E] absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search plant name, code, location..."
          className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] placeholder:text-[#78766E] text-xs focus:outline-none focus:border-[#059669]"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[#55544E]">Status:</span>
        <select
          value={plantFilter}
          onChange={(e) => onPlantFilterChange(e.target.value)}
          className="h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 font-medium text-[#18181A] focus:outline-none focus:border-[#059669]"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active Grants Only</option>
          <option value="REVOKED">Revoked / Inactive</option>
        </select>
      </div>
    </div>

    <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#F7F5F0] border-b border-[#18181A]/10 text-[#55544E]">
            <tr>
              <th className="py-3 px-4 font-medium">Plant &amp; Code</th>
              <th className="py-3 px-4 font-medium">Location &amp; Tax ID</th>
              <th className="py-3 px-4 font-medium">Consultant Role</th>
              <th className="py-3 px-4 font-medium">Grant Status</th>
              <th className="py-3 px-4 font-medium">Access Expiry</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#18181A]/10 text-[#18181A]">
            {filteredPlants.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#55544E] font-mono">
                  No client factories found matching current filters.
                </td>
              </tr>
            ) : (
              filteredPlants.map((p) => (
                <tr key={p.plant_id} className="hover:bg-[#F7F5F0] transition-colors duration-150">
                  <td className="py-3 px-4">
                    <div className="font-medium text-[#18181A]">{p.plant_name}</div>
                    <div className="text-xs font-mono tabular-nums text-[#55544E]">
                      {p.plant_id} ({p.plant_code})
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>{p.location || 'India'}</div>
                    <div className="text-xs font-mono tabular-nums text-[#55544E]">
                      {p.gst_or_pan || 'GST Unregistered'}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-[#EFECE5] text-[#18181A] font-mono text-xs border border-[#18181A]/12">
                      {p.granted_role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-md font-mono text-xs font-medium border ${
                        p.status === 'ACTIVE'
                          ? 'bg-[#ECFDF5] border-emerald-200 text-[#047857]'
                          : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-[#55544E] whitespace-nowrap">
                    {p.expires_at ? p.expires_at.slice(0, 10) : 'Indefinite'}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {p.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        onClick={() => onRevokeAccess(p.plant_id)}
                        className="h-8 px-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] hover:bg-red-100 text-xs font-medium transition-colors duration-150 cursor-pointer"
                        title="Plant data sovereignty: Revoke consultant access"
                      >
                        Revoke Access
                      </button>
                    ) : (
                      <span className="text-[#78766E] text-xs italic">Revoked</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

interface ConsultantAtRiskTabProps {
  filteredAtRisk: AtRiskShipmentCrossClient[];
}

export const ConsultantAtRiskTab: React.FC<ConsultantAtRiskTabProps> = ({ filteredAtRisk }) => (
  <div className="space-y-4">
    <div className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" strokeWidth={1.5} />
      <div className="text-xs text-[#92400E] space-y-1">
        <strong className="font-medium text-[#B45309]">Multi-Plant Compliance Blocker Aggregation:</strong>
        <p className="text-[#55544E]">
          The shipments below have been flagged by the automated validation engine for missing
          precursor emissions factors, exceeded IIW CEV formulas, or missing melt-and-pour country
          origin affidavits. All client queries are strictly isolated via Row-Level Security.
        </p>
      </div>
    </div>

    <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#F7F5F0] border-b border-[#18181A]/10 text-[#55544E]">
            <tr>
              <th className="py-3 px-4 font-medium">Client Factory</th>
              <th className="py-3 px-4 font-medium">Shipment / Batch</th>
              <th className="py-3 px-4 font-medium">Destination &amp; Buyer</th>
              <th className="py-3 px-4 font-medium">CBAM Blocker Reasons</th>
              <th className="py-3 px-4 font-medium">CBAM Due Date</th>
              <th className="py-3 px-4 font-medium text-right">Tonnage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#18181A]/10 text-[#18181A]">
            {filteredAtRisk.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#55544E] font-mono">
                  Zero at-risk shipments across all active client factories. All batches clean.
                </td>
              </tr>
            ) : (
              filteredAtRisk.map((item) => (
                <tr key={item.id} className="hover:bg-[#F7F5F0] transition-colors duration-150">
                  <td className="py-3 px-4">
                    <div className="font-medium text-[#18181A]">{item.plant_name}</div>
                    <div className="text-xs font-mono text-[#55544E]">{item.plant_code}</div>
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums font-medium text-[#18181A]">
                    {item.entity_identifier}
                  </td>
                  <td className="py-3 px-4">
                    <div>{item.destination_country}</div>
                    <div className="text-xs text-[#55544E]">{item.importer_name}</div>
                  </td>
                  <td className="py-3 px-4">
                    <ul className="space-y-1">
                      {item.block_reasons.map((r, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 text-[#B45309] font-medium text-xs">
                          <span className="w-1.5 h-1.5 rounded-sm bg-[#D97706] shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-[#DC2626] font-medium whitespace-nowrap">
                    {item.cbam_due_date}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-[#18181A] whitespace-nowrap">
                    {item.total_tonnage} MT
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

interface ConsultantReviewQueueTabProps {
  reviewQueue: CrossClientReviewItem[];
  onInspectItem: (entityIdentifier: string) => void;
}

export const ConsultantReviewQueueTab: React.FC<ConsultantReviewQueueTabProps> = ({
  reviewQueue,
  onInspectItem,
}) => (
  <div className="space-y-4">
    <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
      <div className="p-4 border-b border-[#18181A]/10 bg-[#F7F5F0] flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-medium text-[#18181A] text-sm">
            Pending Multi-Plant Review &amp; Dual Sign-Off Queue
          </h3>
          <p className="text-xs text-[#55544E]">
            Batch items submitted by plant dispatch officers awaiting consultant approval.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-md bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] font-mono tabular-nums text-xs font-medium">
          {reviewQueue.length} Pending Actions
        </span>
      </div>

      <div className="divide-y divide-[#18181A]/10 text-xs">
        {reviewQueue.length === 0 ? (
          <div className="py-12 text-center text-[#55544E] font-mono">
            Review queue is clear. All submitted batches have been verified and released.
          </div>
        ) : (
          reviewQueue.map((item) => (
            <div
              key={item.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F7F5F0] transition-colors duration-150"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono tabular-nums font-medium text-[#18181A] text-sm">
                    {item.entity_identifier}
                  </span>
                  <span className="px-2 py-0.5 rounded font-mono text-xs bg-[#EFECE5] border border-[#18181A]/10 text-[#55544E]">
                    {item.entity_type}
                  </span>
                  <span className="font-medium text-[#55544E] text-xs">
                    {item.plant_name} ({item.plant_code})
                  </span>
                </div>
                <div className="text-[#55544E] text-xs flex flex-wrap items-center gap-3">
                  <span>Destination: {item.destination_country}</span>
                  <span>Importer: {item.importer_name}</span>
                  <span className="font-mono tabular-nums">Volume: {item.total_tonnage} MT</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[#FFFBEB] text-[#B45309] font-mono text-xs font-medium border border-[#FDE68A]">
                  {item.readiness_status}
                </span>
                <button
                  type="button"
                  onClick={() => onInspectItem(item.entity_identifier)}
                  className="h-9 px-3 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] font-medium text-xs cursor-pointer flex items-center gap-1 transition-colors duration-150"
                >
                  <span>Inspect &amp; Sign</span>
                  <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
);
