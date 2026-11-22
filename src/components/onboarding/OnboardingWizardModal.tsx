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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div className="bg-[#FFFFFF] dark:bg-[#14171F] w-full max-w-xl rounded-2xl border border-[#E4E4E7] dark:border-white/[0.08] shadow-xl overflow-hidden flex flex-col">
        {/* Wizard Header */}
        <div className="px-6 py-5 border-b border-[#E4E4E7] dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-[#059669] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#09090B] dark:text-[#F4F4F5]">
                Plant Onboarding Wizard
              </h2>
              <p className="text-xs text-[#52525B] dark:text-[#A1A1AA]">
                Step {step} of 4: {step === 1 ? 'Company Profile' : step === 2 ? 'Plant Location' : step === 3 ? 'Invite Team' : 'Inspector Setup'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#71717A] hover:text-[#09090B] dark:hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full h-1 bg-[#F4F4F5] dark:bg-white/[0.04]">
          <div
            className="h-full bg-[#059669] transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Step Body */}
        <div className="p-6 space-y-5 flex-1 min-h-[300px]">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SCREEN 1: Company Profile & GSTIN */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#09090B] dark:text-[#F4F4F5] mb-1.5">
                  Registered Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Howrah Precision Forgings Pvt Ltd"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E4E7] dark:border-white/[0.08] bg-[#FAFAFA] dark:bg-[#181B22] text-sm text-[#09090B] dark:text-[#F4F4F5] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#09090B] dark:text-[#F4F4F5] mb-1.5">
                  15-Digit Statutory Indian GSTIN
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="19AAACH7409R1Z8"
                  maxLength={15}
                  className="w-full font-mono uppercase px-3.5 py-2.5 rounded-xl border border-[#E4E4E7] dark:border-white/[0.08] bg-[#FAFAFA] dark:bg-[#181B22] text-sm text-[#09090B] dark:text-[#F4F4F5] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
                />
                <p className="text-[11px] text-[#71717A] mt-1">
                  Format: 2-digit state code + 10-digit PAN + entity code + Z + check digit.
                </p>
              </div>
            </div>
          )}

          {/* SCREEN 2: Plant Installation */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#09090B] dark:text-[#F4F4F5] mb-1.5">
                  Factory / Plant Name
                </label>
                <input
                  type="text"
                  value={plantName}
                  onChange={(e) => setPlantName(e.target.value)}
                  placeholder="e.g. Howrah Liluah Works"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E4E7] dark:border-white/[0.08] bg-[#FAFAFA] dark:bg-[#181B22] text-sm text-[#09090B] dark:text-[#F4F4F5] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#09090B] dark:text-[#F4F4F5] mb-1.5">
                  Plant Location & District
                </label>
                <input
                  type="text"
                  value={plantLocation}
                  onChange={(e) => setPlantLocation(e.target.value)}
                  placeholder="e.g. Howrah, West Bengal (UN/LOCODE: IN CCU)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E4E7] dark:border-white/[0.08] bg-[#FAFAFA] dark:bg-[#181B22] text-sm text-[#09090B] dark:text-[#F4F4F5] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
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
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E4E4E7] dark:border-white/[0.08] bg-[#FAFAFA] dark:bg-[#181B22] text-xs text-[#09090B] dark:text-[#F4F4F5]"
                />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="px-3 py-2.5 rounded-xl border border-[#E4E4E7] dark:border-white/[0.08] bg-[#FAFAFA] dark:bg-[#181B22] text-xs text-[#09090B] dark:text-[#F4F4F5]"
                >
                  <option value="DISPATCH">DISPATCH</option>
                  <option value="QA_INSPECTOR">QA_INSPECTOR</option>
                  <option value="VIEWER">VIEWER</option>
                  <option value="OWNER">OWNER</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddInvite}
                  className="px-4 py-2.5 bg-[#09090B] dark:bg-white text-white dark:text-[#09090B] rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {invites.map((inv, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#E4E4E7] dark:border-white/[0.08] bg-[#FAFAFA] dark:bg-[#181B22]"
                  >
                    <div>
                      <span className="text-xs font-medium text-[#09090B] dark:text-[#F4F4F5] block">
                        {inv.email}
                      </span>
                      <span className="text-[10px] font-mono uppercase text-[#059669]">
                        {inv.role}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveInvite(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SCREEN 4: Inspector Setup */}
          {step === 4 && (
            <div className="space-y-3.5">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="w-4 h-4 inline mr-1 text-[#059669]" />
                <strong>Privacy &amp; Security Guarantee:</strong> The plant owner assigns inspector identity, but the inspector enrolls TOTP on their personal phone. The owner never sees the secret.
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#09090B] dark:text-[#F4F4F5] mb-1">
                  Authorised Inspector Name
                </label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E4E7] dark:border-white/[0.08] bg-[#FAFAFA] dark:bg-[#181B22] text-xs text-[#09090B] dark:text-[#F4F4F5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#09090B] dark:text-[#F4F4F5] mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={inspectorDesignation}
                    onChange={(e) => setInspectorDesignation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E4E7] dark:border-white/[0.08] bg-[#FAFAFA] dark:bg-[#181B22] text-xs text-[#09090B] dark:text-[#F4F4F5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#09090B] dark:text-[#F4F4F5] mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={inspectorEmpId}
                    onChange={(e) => setInspectorEmpId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E4E7] dark:border-white/[0.08] bg-[#FAFAFA] dark:bg-[#181B22] text-xs text-[#09090B] dark:text-[#F4F4F5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#09090B] dark:text-[#F4F4F5] mb-1">
                  Inspector Email
                </label>
                <input
                  type="email"
                  value={inspectorEmail}
                  onChange={(e) => setInspectorEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E4E7] dark:border-white/[0.08] bg-[#FAFAFA] dark:bg-[#181B22] text-xs text-[#09090B] dark:text-[#F4F4F5]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="px-6 py-4 border-t border-[#E4E4E7] dark:border-white/[0.08] bg-[#FAFAFA] dark:bg-[#181B22] flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E4E4E7] dark:border-white/[0.08] text-xs font-medium text-[#71717A] hover:bg-[#F4F4F5] cursor-pointer min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#09090B] dark:bg-white text-white dark:text-[#09090B] text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity cursor-pointer min-h-[44px]"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#059669] text-white text-xs font-semibold rounded-xl hover:bg-[#047857] transition-colors cursor-pointer min-h-[44px]"
            >
              {isSubmitting ? (
                <span>Saving Setup...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
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
