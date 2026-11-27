import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Mail,
  ExternalLink,
  ChevronRight,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Building,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  X,
} from 'lucide-react';

interface PilotPlant {
  id: string;
  plant_name: string;
  location: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  stage: 'LEAD' | 'DOCUMENTS_RECEIVED' | 'AUDIT_GENERATED' | 'REVIEW_SCHEDULED' | 'PAID_PILOT_25K' | 'CONVERTED_MONTHLY';
  shipments_processed: number;
  hours_saved: number;
  next_action: string;
  payment_status: 'UNPAID' | 'PAID_PILOT_25K' | 'CONVERTED';
  last_updated: string;
}

export const PilotTrackerView: React.FC = () => {
  const [pilots, setPilots] = useState<PilotPlant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedPilot, setSelectedPilot] = useState<PilotPlant | null>(null);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'audit_modal' | 'email_modal'>('pipeline');
  const [emailSequence, setEmailSequence] = useState<any>(null);
  const [selectedEmailStage, setSelectedEmailStage] = useState<string>('day_0');
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);

  // New Audit Form State
  const [auditForm, setAuditForm] = useState({
    exporter_name: 'Howrah Precision Castings Ltd.',
    plant_name: 'Liluah Works Floor 2',
    invoice_number: 'EXP-2026-HPC-08',
    destination_country: 'Germany (DE)',
    cn_code: '730799',
    weight_mt: 28.5,
  });

  const fetchTrackerData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/pilot/tracker');
      if (res.ok) {
        const data = await res.json();
        setPilots(data.plants || []);
      }
    } catch {
      // Fallback local mock if offline
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmailTemplates = async () => {
    try {
      const res = await fetch('/api/pilot/email-sequence');
      if (res.ok) {
        const data = await res.json();
        setEmailSequence(data.templates);
      }
    } catch {}
  };

  useEffect(() => {
    fetchTrackerData();
    fetchEmailTemplates();
  }, []);

  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuditing(true);
    setAuditResult(null);
    try {
      const res = await fetch('/api/pilot/audit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditForm),
      });
      if (res.ok) {
        const data = await res.json();
        setAuditResult(data);
        fetchTrackerData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleCopyEmail = (body: string) => {
    navigator.clipboard.writeText(body);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const totalHoursSaved = pilots.reduce((acc, p) => acc + (p.hours_saved || 0), 0);
  const totalShipments = pilots.reduce((acc, p) => acc + (p.shipments_processed || 0), 0);
  const paidPilotsCount = pilots.filter((p) => p.payment_status === 'PAID_PILOT_25K').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-xs text-[#18181A]">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#18181A]/10">
        <div>
          <div className="flex items-center gap-2 text-[#047857] font-medium mb-1">
            <Rocket className="w-4 h-4" strokeWidth={1.5} />
            <span>Pilot Onboarding &amp; 1-Shipment Audit Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-[#18181A]">
            Exporter Pilot Tracker
          </h1>
          <p className="text-[#55544E] mt-1">
            Manage the first 5 to 20 exporter pilots from initial MTC check to paid ₹25,000 conversion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('audit_modal')}
            className="h-9 px-3.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            <span>New 1-Shipment Audit</span>
          </button>
          <button
            type="button"
            onClick={fetchTrackerData}
            className="h-9 w-9 rounded-lg border border-[#18181A]/15 bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#55544E] flex items-center justify-center transition-colors cursor-pointer"
            title="Refresh tracker"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10">
          <span className="text-[11px] text-[#55544E] block mb-1">Active Pipeline</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-medium font-mono tabular-nums text-[#18181A]">
              {pilots.length}
            </span>
            <span className="text-[11px] text-[#047857] font-medium">Plants</span>
          </div>
          <p className="text-[11px] text-[#78766E] mt-1">Howrah, Liluah &amp; Durgapur</p>
        </div>

        <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10">
          <span className="text-[11px] text-[#55544E] block mb-1">Shipments Released</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-medium font-mono tabular-nums text-[#18181A]">
              {totalShipments}
            </span>
            <span className="text-[11px] text-[#047857] font-medium">Consignments</span>
          </div>
          <p className="text-[11px] text-[#78766E] mt-1">100% Zero EU border hold</p>
        </div>

        <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10">
          <span className="text-[11px] text-[#55544E] block mb-1">Engineering Hours Saved</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-medium font-mono tabular-nums text-[#18181A]">
              {totalHoursSaved.toFixed(1)}
            </span>
            <span className="text-[11px] text-[#047857] font-medium">Hours</span>
          </div>
          <p className="text-[11px] text-[#78766E] mt-1">Measured vs Excel baseline</p>
        </div>

        <div className="p-4 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10">
          <span className="text-[11px] text-[#55544E] block mb-1">Paid Pilot Bookings</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-medium font-mono tabular-nums text-[#047857]">
              ₹{(paidPilotsCount * 25000).toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[11px] text-[#78766E] mt-1">{paidPilotsCount} plants paid ₹25k fee</p>
        </div>
      </div>

      {/* Main Table / Tracker View */}
      <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
        <div className="p-4 bg-[#EFECE5]/60 border-b border-[#18181A]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="font-medium text-sm text-[#18181A]">
            Pilot Plant Conversion Pipeline
          </span>
          <span className="text-[#55544E] text-[11px]">
            Stage lifecycle: Lead → Audit → Review → Paid Pilot
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#18181A]/10 text-[#55544E] bg-[#F7F5F0]">
                <th className="py-3 px-4 font-medium">Plant &amp; Location</th>
                <th className="py-3 px-4 font-medium">Contact Person</th>
                <th className="py-3 px-4 font-medium">Pipeline Stage</th>
                <th className="py-3 px-4 font-medium text-center">Shipments</th>
                <th className="py-3 px-4 font-medium text-center">Hours Saved</th>
                <th className="py-3 px-4 font-medium">Next Action</th>
                <th className="py-3 px-4 font-medium">Payment</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18181A]/8 text-[#18181A]">
              {pilots.map((pilot) => {
                const isPaid = pilot.payment_status === 'PAID_PILOT_25K';
                return (
                  <tr
                    key={pilot.id}
                    className="hover:bg-[#F7F5F0] transition-colors"
                  >
                    <td className="py-3.5 px-4 font-medium text-[#18181A]">
                      <div>{pilot.plant_name}</div>
                      <span className="text-[11px] text-[#78766E] font-normal">{pilot.location}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{pilot.contact_person}</div>
                      <span className="text-[11px] font-mono text-[#55544E]">{pilot.contact_phone}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                          pilot.stage === 'AUDIT_GENERATED'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : pilot.stage === 'REVIEW_SCHEDULED'
                            ? 'bg-[#EFECE5] text-[#18181A] border-[#18181A]/15'
                            : pilot.stage === 'PAID_PILOT_25K'
                            ? 'bg-[#059669]/10 text-[#047857] border-[#059669]/20'
                            : 'bg-[#F7F5F0] text-[#55544E] border-[#18181A]/10'
                        }`}
                      >
                        {pilot.stage.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono tabular-nums font-medium">
                      {pilot.shipments_processed}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono tabular-nums text-[#047857] font-medium">
                      {pilot.hours_saved}h
                    </td>
                    <td className="py-3.5 px-4 max-w-[200px] truncate text-[#55544E]" title={pilot.next_action}>
                      {pilot.next_action}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                          isPaid
                            ? 'bg-[#059669]/10 text-[#047857] border-[#059669]/20'
                            : 'bg-[#EFECE5] text-[#55544E] border-[#18181A]/10'
                        }`}
                      >
                        {isPaid ? 'PAID ₹25K' : 'UNPAID'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPilot(pilot);
                          setActiveTab('email_modal');
                        }}
                        className="h-8 px-2.5 rounded-md border border-[#18181A]/15 bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title="Open email sequence"
                      >
                        <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>Email</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuditForm((prev) => ({
                            ...prev,
                            exporter_name: pilot.plant_name,
                            plant_name: pilot.plant_name,
                          }));
                          setActiveTab('audit_modal');
                        }}
                        className="h-8 px-2.5 rounded-md bg-[#059669]/10 text-[#047857] border border-[#059669]/20 text-[11px] font-medium hover:bg-[#059669]/15 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>Audit</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Modal / Trigger Form */}
      {activeTab === 'audit_modal' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
          <div className="bg-[#FCFBF8] rounded-xl max-w-xl w-full border border-[#18181A]/15 p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#18181A]/10">
              <div className="flex items-center gap-2 text-[#047857] font-medium text-sm">
                <FileText className="w-4 h-4" strokeWidth={1.5} />
                <span>Run Free 1-Shipment Compliance Audit</span>
              </div>
              <button
                onClick={() => setActiveTab('pipeline')}
                className="h-8 w-8 rounded-md text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] flex items-center justify-center transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleRunAudit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-[#55544E] mb-1">
                  Exporter Legal Entity
                </label>
                <input
                  type="text"
                  value={auditForm.exporter_name}
                  onChange={(e) => setAuditForm({ ...auditForm, exporter_name: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#55544E] mb-1">
                    Invoice / Packing List #
                  </label>
                  <input
                    type="text"
                    value={auditForm.invoice_number}
                    onChange={(e) => setAuditForm({ ...auditForm, invoice_number: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-xs font-mono text-[#18181A] focus:outline-none focus:border-[#059669]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#55544E] mb-1">
                    Destination Port / Country
                  </label>
                  <input
                    type="text"
                    value={auditForm.destination_country}
                    onChange={(e) => setAuditForm({ ...auditForm, destination_country: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#55544E] mb-1">
                    CN Tariff Code
                  </label>
                  <input
                    type="text"
                    value={auditForm.cn_code}
                    onChange={(e) => setAuditForm({ ...auditForm, cn_code: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-xs font-mono text-[#18181A] focus:outline-none focus:border-[#059669]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#55544E] mb-1">
                    Declared Weight (MT)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={auditForm.weight_mt}
                    onChange={(e) => setAuditForm({ ...auditForm, weight_mt: parseFloat(e.target.value) || 0 })}
                    className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-xs font-mono text-[#18181A] focus:outline-none focus:border-[#059669]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAuditing}
                className="w-full h-9 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] font-medium transition-colors disabled:opacity-50 cursor-pointer mt-4"
              >
                {isAuditing ? 'Analyzing Chemistry & Origin Gaps...' : 'Generate 1-Page Findings Report'}
              </button>
            </form>

            {/* Audit Results View */}
            {auditResult && (
              <div className="mt-4 p-4 rounded-xl bg-[#F7F5F0] border border-[#18181A]/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#18181A]">
                    Audit Result: {auditResult.overall_status}
                  </span>
                  <a
                    href={`/api/pilot/audit/${auditResult.audit_id}/report.pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="h-8 px-3 rounded-md bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] text-[11px] font-medium inline-flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Download PDF</span>
                  </a>
                </div>

                <div className="text-[11px] space-y-1.5 text-[#55544E]">
                  <div>Melt &amp; Pour Status: <span className="font-medium text-[#18181A]">{auditResult.melt_pour_status}</span></div>
                  <div>Estimated Potential Risk: <span className="font-medium font-mono text-[#18181A]">₹{auditResult.cost_difference.estimated_cost_difference_inr.toLocaleString('en-IN')} INR</span></div>
                  <div>Share Link: <code className="bg-[#EFECE5] px-1.5 py-0.5 rounded text-[11px] text-[#18181A]">{auditResult.share_url}</code></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email Sequence Modal */}
      {activeTab === 'email_modal' && emailSequence && selectedPilot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
          <div className="bg-[#FCFBF8] rounded-xl max-w-2xl w-full border border-[#18181A]/15 p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#18181A]/10">
              <div className="flex items-center gap-2 text-[#047857] font-medium text-sm">
                <Mail className="w-4 h-4" strokeWidth={1.5} />
                <span>Onboarding Email Sequence: {selectedPilot.plant_name}</span>
              </div>
              <button
                onClick={() => setActiveTab('pipeline')}
                className="h-8 w-8 rounded-md text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] flex items-center justify-center transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Stage Selector Tabs */}
            <div className="flex items-center gap-1.5 border-b border-[#18181A]/10 pb-2">
              {Object.keys(emailSequence).map((key) => {
                const isSelected = selectedEmailStage === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedEmailStage(key)}
                    className={`h-8 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#059669] text-[#FCFBF8]'
                        : 'bg-[#EFECE5] text-[#55544E] hover:text-[#18181A]'
                    }`}
                  >
                    {emailSequence[key].stage}
                  </button>
                );
              })}
            </div>

            {/* Template Preview */}
            {emailSequence[selectedEmailStage] && (
              <div className="space-y-3">
                <div>
                  <span className="text-[11px] text-[#78766E] block">Trigger:</span>
                  <span className="font-medium text-[#18181A]">
                    {emailSequence[selectedEmailStage].trigger}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-[#78766E] block mb-1">Subject:</span>
                  <input
                    type="text"
                    readOnly
                    value={emailSequence[selectedEmailStage].subject.replace('{{plant_name}}', selectedPilot.plant_name)}
                    className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 font-medium text-xs text-[#18181A]"
                  />
                </div>

                <div>
                  <span className="text-[11px] text-[#78766E] block mb-1">Body Text:</span>
                  <textarea
                    rows={10}
                    readOnly
                    value={emailSequence[selectedEmailStage].body
                      .replace(/\{\{contact_name\}\}/g, selectedPilot.contact_person)
                      .replace(/\{\{plant_name\}\}/g, selectedPilot.plant_name)
                      .replace(/\{\{hours_saved\}\}/g, String(selectedPilot.hours_saved || 12))
                      .replace(/\{\{shipments_processed\}\}/g, String(selectedPilot.shipments_processed || 1))
                      .replace(/\{\{invoice_number\}\}/g, 'EXP-2026-PILOT-01')
                      .replace(/\{\{total_weight_mt\}\}/g, '24.5')
                      .replace(/\{\{mtc_count\}\}/g, '2')
                      .replace(/\{\{melt_pour_status\}\}/g, 'VERIFIED')
                      .replace(/\{\{audit_share_link\}\}/g, 'https://heatledger.ai/share/audit/demo')
                      .replace(/\{\{penalty_exposure_inr\}\}/g, '₹1,84,000 INR')
                      .replace(/\{\{findings_summary\}\}/g, 'Missing melt-and-pour country on Heat 4102 resolved')
                      .replace(/\{\{upgrade_link\}\}/g, 'https://heatledger.ai/pricing')}
                    className="w-full p-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 font-mono text-[11px] leading-relaxed text-[#18181A]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyEmail(
                        emailSequence[selectedEmailStage].body
                          .replace(/\{\{contact_name\}\}/g, selectedPilot.contact_person)
                          .replace(/\{\{plant_name\}\}/g, selectedPilot.plant_name)
                      )
                    }
                    className="h-9 px-4 rounded-lg bg-[#18181A] hover:bg-[#2C303A] text-[#FCFBF8] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" strokeWidth={1.5} />
                        <span>Copy Email Template</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
