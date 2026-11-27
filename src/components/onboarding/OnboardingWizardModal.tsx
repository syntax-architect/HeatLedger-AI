import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Users,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (data: any) => void;
}

interface TeamInvite {
  email: string;
  role: 'OWNER' | 'QA_INSPECTOR' | 'DISPATCH' | 'VIEWER';
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [companyName, setCompanyName] = useState<string>('Howrah Precision Forgings Pvt Ltd');
  const [gstin, setGstin] = useState<string>('19AAACH7409R1Z8');
  const [plantName, setPlantName] = useState<string>('Howrah Liluah Works');
  const [plantLocation, setPlantLocation] = useState<string>('Howrah, West Bengal');

  const [invites, setInvites] = useState<TeamInvite[]>([
    { email: 'dispatch@howrahsteel.in', role: 'DISPATCH' },
    { email: 'auditor@howrahsteel.in', role: 'VIEWER' }
  ]);
  const [newEmail, setNewEmail] = useState<string>('');
  const [newRole, setNewRole] = useState<'OWNER' | 'QA_INSPECTOR' | 'DISPATCH' | 'VIEWER'>('DISPATCH');

  const [inspectorName, setInspectorName] = useState<string>('P. K. Banerjee');
  const [inspectorDesignation, setInspectorDesignation] = useState<string>('Head of Quality Assurance');
  const [inspectorEmpId, setInspectorEmpId] = useState<string>('QA-EMP-0409');
  const [inspectorEmail, setInspectorEmail] = useState<string>('inspector@howrahsteel.in');

  if (!isOpen) return null;

  const validateGstin = (value: string): boolean => {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value.trim().toUpperCase());
  };

  const handleAddInvite = () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setErrorMsg('Enter a valid email address.');
      return;
    }
    setInvites([...invites, { email: newEmail.trim().toLowerCase(), role: newRole }]);
    setNewEmail('');
    setErrorMsg(null);
  };

  const handleRemoveInvite = (idx: number) => {
    setInvites(invites.filter((_, i) => i !== idx));
  };

  const handleNext = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (!companyName.trim()) {
        setErrorMsg('Company name is required.');
        return;
      }
      if (!validateGstin(gstin)) {
        setErrorMsg('Enter a valid 15-character Indian statutory GSTIN.');
        return;
      }
    } else if (step === 2) {
      if (!plantName.trim() || !plantLocation.trim()) {
        setErrorMsg('Plant name and location are required.');
        return;
      }
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    const payload = {
      company_name: companyName.trim(),
      gstin: gstin.trim().toUpperCase(),
      plant_name: plantName.trim(),
      plant_location: plantLocation.trim(),
      team_invites: invites,
      inspector: {
        name: inspectorName.trim(),
        designation: inspectorDesignation.trim(),
        emp_id: inspectorEmpId.trim(),
        email: inspectorEmail.trim()
      }
    };

    try {
      const res = await fetch('/api/onboarding/wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Onboarding setup failed.');
      }
      if (onComplete) onComplete(payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete plant onboarding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm font-sans">
      <div className="bg-[#FCFBF8] w-full max-w-xl rounded-xl border border-[#18181A]/15 overflow-hidden flex flex-col">
        {/* Wizard Header */}
        <div className="px-6 py-5 border-b border-[#18181A]/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#059669]/10 text-[#059669] border border-[#059669]/20 flex items-center justify-center">
              <Building2 className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-base font-medium text-[#18181A]">
                Plant Onboarding Wizard
              </h2>
              <p className="text-xs text-[#55544E]">
                Step {step} of 4: {step === 1 ? 'Company Profile' : step === 2 ? 'Plant Location' : step === 3 ? 'Invite Team' : 'Inspector Setup'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close onboarding wizard"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full h-1 bg-[#EFECE5]">
          <div
            className="h-full bg-[#059669] transition-colors duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Step Body */}
        <div className="p-6 space-y-5 flex-1 min-h-[300px]">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SCREEN 1: Company Profile & GSTIN */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#18181A] mb-1.5">
                  Registered Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Howrah Precision Forgings Pvt Ltd"
                  className="w-full h-10 px-3.5 rounded-lg border border-[#18181A]/15 bg-[#F7F5F0] text-sm text-[#18181A] focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#18181A] mb-1.5">
                  15-Digit Statutory Indian GSTIN
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="19AAACH7409R1Z8"
                  maxLength={15}
                  className="w-full h-10 font-mono px-3.5 rounded-lg border border-[#18181A]/15 bg-[#F7F5F0] text-sm text-[#18181A] focus:outline-none focus:border-[#059669]"
                />
                <p className="text-[11px] text-[#78766E] mt-1">
                  Format: 2-digit state code + 10-digit PAN + entity code + Z + check digit.
                </p>
              </div>
            </div>
          )}

          {/* SCREEN 2: Plant Installation */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#18181A] mb-1.5">
                  Factory / Plant Name
                </label>
                <input
                  type="text"
                  value={plantName}
                  onChange={(e) => setPlantName(e.target.value)}
                  placeholder="e.g. Howrah Liluah Works"
                  className="w-full h-10 px-3.5 rounded-lg border border-[#18181A]/15 bg-[#F7F5F0] text-sm text-[#18181A] focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#18181A] mb-1.5">
                  Plant Location &amp; District
                </label>
                <input
                  type="text"
                  value={plantLocation}
                  onChange={(e) => setPlantLocation(e.target.value)}
                  placeholder="e.g. Pune, Maharashtra (UN/LOCODE: IN PNQ)"
                  className="w-full h-10 px-3.5 rounded-lg border border-[#18181A]/15 bg-[#F7F5F0] text-sm text-[#18181A] focus:outline-none focus:border-[#059669]"
                />
              </div>
            </div>
          )}

          {/* SCREEN 3: Invite Team */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="colleague@steelmill.in"
                  className="flex-1 h-9 px-3 rounded-lg border border-[#18181A]/15 bg-[#F7F5F0] text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
                />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="h-9 px-3 rounded-lg border border-[#18181A]/15 bg-[#F7F5F0] text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
                >
                  <option value="DISPATCH">DISPATCH</option>
                  <option value="QA_INSPECTOR">QA_INSPECTOR</option>
                  <option value="VIEWER">VIEWER</option>
                  <option value="OWNER">OWNER</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddInvite}
                  className="h-9 px-3.5 bg-[#18181A] hover:bg-[#2C303A] text-[#FCFBF8] rounded-lg text-xs font-medium flex items-center justify-center transition-colors"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {invites.map((inv, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border border-[#18181A]/10 bg-[#F7F5F0]"
                  >
                    <div>
                      <span className="text-xs font-medium text-[#18181A] block">
                        {inv.email}
                      </span>
                      <span className="text-[11px] font-mono text-[#047857]">
                        {inv.role}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveInvite(idx)}
                      className="text-rose-700 hover:text-rose-800 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SCREEN 4: Inspector Setup */}
          {step === 4 && (
            <div className="space-y-3.5">
              <div className="p-3 bg-[#059669]/10 border border-[#059669]/20 rounded-lg text-xs text-[#047857]">
                <ShieldCheck className="w-4 h-4 inline mr-1 text-[#059669]" strokeWidth={1.5} />
                <span className="font-medium">Privacy &amp; Security Guarantee:</span> The plant owner assigns inspector identity, but the inspector enrolls TOTP on their personal phone. The owner never sees the secret.
              </div>

              <div>
                <label className="block text-xs font-medium text-[#18181A] mb-1">
                  Authorised Inspector Name
                </label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  className="w-full h-9 px-3.5 rounded-lg border border-[#18181A]/15 bg-[#F7F5F0] text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#18181A] mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={inspectorDesignation}
                    onChange={(e) => setInspectorDesignation(e.target.value)}
                    className="w-full h-9 px-3.5 rounded-lg border border-[#18181A]/15 bg-[#F7F5F0] text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#18181A] mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={inspectorEmpId}
                    onChange={(e) => setInspectorEmpId(e.target.value)}
                    className="w-full h-9 px-3.5 rounded-lg border border-[#18181A]/15 bg-[#F7F5F0] text-xs font-mono text-[#18181A] focus:outline-none focus:border-[#059669]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#18181A] mb-1">
                  Inspector Email
                </label>
                <input
                  type="email"
                  value={inspectorEmail}
                  onChange={(e) => setInspectorEmail(e.target.value)}
                  className="w-full h-9 px-3.5 rounded-lg border border-[#18181A]/15 bg-[#F7F5F0] text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="px-6 py-4 border-t border-[#18181A]/10 bg-[#F7F5F0] flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-[#18181A]/15 bg-[#FCFBF8] text-xs font-medium text-[#55544E] hover:bg-[#EFECE5] cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 h-10 px-5 bg-[#18181A] hover:bg-[#2C303A] text-[#FCFBF8] text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 h-10 px-5 bg-[#059669] text-[#FCFBF8] text-xs font-medium rounded-lg hover:bg-[#047857] transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Saving Setup...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                  <span>Complete Setup</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
