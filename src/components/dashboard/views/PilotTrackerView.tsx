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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-xs text-slate-800 dark:text-slate-100">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
            <Rocket className="w-4 h-4" />
            <span>Pilot Onboarding &amp; 1-Shipment Audit Console (Prompt L3)</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Exporter Pilot Tracker
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage the first 5 to 20 exporter pilots from initial MTC check to paid ₹25,000 conversion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('audit_modal')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New 1-Shipment Audit</span>
          </button>
          <button
            type="button"
            onClick={fetchTrackerData}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Refresh tracker"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 block mb-1">Active Pipeline</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {pilots.length}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold">Plants</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Howrah, Liluah &amp; Durgapur</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 block mb-1">Shipments Released</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {totalShipments}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold">Consignments</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">100% Zero EU border hold</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 block mb-1">Engineering Hours Saved</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {totalHoursSaved.toFixed(1)}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold">Hours</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Measured vs Excel baseline</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 block mb-1">Paid Pilot Bookings</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              ₹{(paidPilotsCount * 25000).toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{paidPilotsCount} plants paid ₹25k fee</p>
        </div>
      </div>

      {/* Main Table / Tracker View */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="font-bold text-slate-900 dark:text-white">
            Pilot Plant Conversion Pipeline
          </span>
          <span className="text-slate-500 text-[11px]">
            Stage lifecycle: Lead → Audit → Review → Paid Pilot
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                <th className="py-3 px-4 font-semibold">Plant &amp; Location</th>
                <th className="py-3 px-4 font-semibold">Contact Person</th>
                <th className="py-3 px-4 font-semibold">Pipeline Stage</th>
                <th className="py-3 px-4 font-semibold text-center">Shipments</th>
                <th className="py-3 px-4 font-semibold text-center">Hours Saved</th>
                <th className="py-3 px-4 font-semibold">Next Action</th>
                <th className="py-3 px-4 font-semibold">Payment</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {pilots.map((pilot) => {
                const isPaid = pilot.payment_status === 'PAID_PILOT_25K';
                return (
                  <tr
                    key={pilot.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                      <div>{pilot.plant_name}</div>
                      <span className="text-[10px] text-slate-500 font-normal">{pilot.location}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{pilot.contact_person}</div>
                      <span className="text-[10px] font-mono text-slate-500">{pilot.contact_phone}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          pilot.stage === 'AUDIT_GENERATED'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : pilot.stage === 'REVIEW_SCHEDULED'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : pilot.stage === 'PAID_PILOT_25K'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {pilot.stage.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-semibold">
                      {pilot.shipments_processed}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-emerald-600 font-semibold">
                      {pilot.hours_saved}h
                    </td>
                    <td className="py-3.5 px-4 max-w-[200px] truncate text-slate-600 dark:text-slate-300" title={pilot.next_action}>
                      {pilot.next_action}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
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
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
                        title="Open email sequence"
                      >
                        <Mail className="w-3.5 h-3.5" />
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
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold hover:bg-emerald-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <FileText className="w-5 h-5" />
                <span>Run Free 1-Shipment Compliance Audit</span>
              </div>
              <button
                onClick={() => setActiveTab('pipeline')}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRunAudit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Exporter Legal Entity
                </label>
                <input
                  type="text"
                  value={auditForm.exporter_name}
                  onChange={(e) => setAuditForm({ ...auditForm, exporter_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Invoice / Packing List #
                  </label>
                  <input
                    type="text"
                    value={auditForm.invoice_number}
                    onChange={(e) => setAuditForm({ ...auditForm, invoice_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Destination Port / Country
                  </label>
                  <input
                    type="text"
                    value={auditForm.destination_country}
                    onChange={(e) => setAuditForm({ ...auditForm, destination_country: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    CN Tariff Code
                  </label>
                  <input
                    type="text"
                    value={auditForm.cn_code}
                    onChange={(e) => setAuditForm({ ...auditForm, cn_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Declared Weight (MT)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={auditForm.weight_mt}
                    onChange={(e) => setAuditForm({ ...auditForm, weight_mt: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAuditing}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer mt-4"
              >
                {isAuditing ? 'Analyzing Chemistry & Origin Gaps...' : 'Generate 1-Page Findings Report'}
              </button>
            </form>

            {/* Audit Results View */}
            {auditResult && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    Audit Result: {auditResult.overall_status}
                  </span>
                  <a
                    href={`/api/pilot/audit/${auditResult.audit_id}/report.pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold inline-flex items-center gap-1 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </a>
                </div>

                <div className="text-[11px] space-y-1.5 text-slate-600 dark:text-slate-300">
                  <div>Melt &amp; Pour Status: <strong>{auditResult.melt_pour_status}</strong></div>
                  <div>Estimated Potential Risk: <strong>₹{auditResult.cost_difference.estimated_cost_difference_inr.toLocaleString('en-IN')} INR</strong></div>
                  <div>Share Link: <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-[10px]">{auditResult.share_url}</code></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email Sequence Modal */}
      {activeTab === 'email_modal' && emailSequence && selectedPilot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <Mail className="w-5 h-5" />
                <span>Onboarding Email Sequence: {selectedPilot.plant_name}</span>
              </div>
              <button
                onClick={() => setActiveTab('pipeline')}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Stage Selector Tabs */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
              {Object.keys(emailSequence).map((key) => {
                const isSelected = selectedEmailStage === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedEmailStage(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
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
                  <span className="text-[10px] text-slate-400 block">Trigger:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {emailSequence[selectedEmailStage].trigger}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Subject:</span>
                  <input
                    type="text"
                    readOnly
                    value={emailSequence[selectedEmailStage].subject.replace('{{plant_name}}', selectedPilot.plant_name)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Body Text:</span>
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
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] leading-relaxed text-slate-800 dark:text-slate-200"
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
                    className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
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
