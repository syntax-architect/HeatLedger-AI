export interface RolePreset {
  role: string;
  label: string;
  name: string;
  email: string;
  password: string;
}

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const ROLE_PRESETS: RolePreset[] = [
  {
    role: 'OWNER',
    label: 'Owner',
    name: 'P. K. Banerjee',
    email: 'owner@howrahsteel.in',
    password: 'OwnerSecretPassword2026!',
  },
  {
    role: 'QA_INSPECTOR',
    label: 'QA Inspector',
    name: 'R. K. Chatterjee',
    email: 'inspector@howrahsteel.in',
    password: 'InspectorPassword2026!',
  },
  {
    role: 'DISPATCH',
    label: 'Dispatch',
    name: 'A. K. Sen',
    email: 'dispatch@howrahsteel.in',
    password: 'DispatchPassword2026!',
  },
  {
    role: 'VIEWER',
    label: 'Customs Auditor',
    name: 'Customs Auditor',
    email: 'auditor@howrahsteel.in',
    password: 'AuditorPassword2026!',
  },
];

export function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: 'bg-[#18181A]/10' };
  let score = 0;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;

  if (pw.length < 12) {
    return { score: 1, label: `${pw.length}/12 chars minimum`, color: 'bg-[#DC2626]' };
  }
  if (score <= 2) return { score: 2, label: 'Fair', color: 'bg-[#D97706]' };
  if (score === 3) return { score: 3, label: 'Good', color: 'bg-[#059669]' };
  return { score: 4, label: 'Strong', color: 'bg-[#047857]' };
}
