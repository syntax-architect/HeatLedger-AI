import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  Check,
  Sun,
  Moon,
  Building2,
  ShieldCheck,
  Users,
  UserPlus,
  KeyRound,
  RefreshCw,
  Trash2,
  Shield,
  SlidersHorizontal,
  Smartphone
} from 'lucide-react';
import {
  SupportedLanguage,
  LANGUAGE_METADATA,
  SUPPORTED_LANGUAGES,
  applyLanguageSettings,
} from '../../../i18n';
import { useTheme } from '../../../context/ThemeContext';
import { PlantProfile } from '../PlantSwitcherModal';
import { OnboardingWizardModal } from '../../onboarding/OnboardingWizardModal';

interface SettingsViewProps {
  activePlant?: PlantProfile;
  onOpenPlantSwitcher?: () => void;
  onOpenSecurity?: () => void;
}

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  emp_id?: string;
  designation?: string;
  has_totp?: boolean;
  is_active?: boolean;
}

interface SigningKey {
  key_id: string;
  algorithm: string;
  public_key_b64: string;
  is_active: boolean;
  created_at: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  activePlant,
  onOpenPlantSwitcher,
  onOpenSecurity,
}) => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const rawLang = ((i18n.language || 'en').split('-')[0]) as SupportedLanguage;
  const currentLang: SupportedLanguage = SUPPORTED_LANGUAGES.includes(rawLang) ? rawLang : 'en';

  const handleSelectLanguage = (lang: SupportedLanguage) => {
    i18n.changeLanguage(lang);
    applyLanguageSettings(lang);
  };

  // State for Wizard
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // State for Team Members
  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: 'usr_owner_01',
      name: 'R. K. Agarwal',
      email: 'owner@howrahsteel.in',
      role: 'OWNER',
      designation: 'Managing Director',
      emp_id: 'EMP-001',
      has_totp: true,
      is_active: true
    },
    {
      id: 'usr_qa_04',
      name: 'P. K. Banerjee',
      email: 'inspector@howrahsteel.in',
      role: 'QA_INSPECTOR',
      designation: 'Head of Quality Assurance',
      emp_id: 'QA-EMP-0409',
      has_totp: true,
      is_active: true
    },
    {
      id: 'usr_dispatch_01',
      name: 'S. Sen',
      email: 'dispatch@howrahsteel.in',
      role: 'DISPATCH',
      designation: 'Logistics Supervisor',
      emp_id: 'DISP-012',
      has_totp: false,
      is_active: true
    }
  ]);

  // State for Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'OWNER' | 'QA_INSPECTOR' | 'DISPATCH' | 'VIEWER'>('DISPATCH');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  // State for Inspector Profile
  const [inspectorName, setInspectorName] = useState('P. K. Banerjee');
  const [inspectorDesignation, setInspectorDesignation] = useState('Head of Quality Assurance');
  const [inspectorEmpId, setInspectorEmpId] = useState('QA-EMP-0409');
  const [isUpdatingInspector, setIsUpdatingInspector] = useState(false);
  const [inspectorStatus, setInspectorStatus] = useState<string | null>(null);

  // State for Signing Keys
  const [signingKeys, setSigningKeys] = useState<SigningKey[]>([
    {
      key_id: 'ed25519_key_primary',
      algorithm: 'Ed25519',
      public_key_b64: 'MCowBQYDK2VwAyEA9rN+qV4M8Z9WvL8mHjY3bT8bE9q1N5zP0w2e4r6t8u0=',
      is_active: true,
      created_at: new Date().toISOString()
    }
  ]);
  const [isRotatingKey, setIsRotatingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<string | null>(null);

  // Fetch Team & Keys from API
  useEffect(() => {
    fetch('/api/team/members')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.members) && data.members.length > 0) {
          setMembers(data.members);
        }
      })
      .catch(() => {});

    fetch('/api/team/signing-keys')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.keys) && data.keys.length > 0) {
          setSigningKeys(data.keys);
        }
      })
      .catch(() => {});
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    setInviteStatus(null);
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Invitation dispatch failed.');
      }
      setInviteStatus(`Invitation sent to ${inviteEmail}.`);
      setInviteEmail('');
      // Refresh members
      const listRes = await fetch('/api/team/members');
      if (listRes.ok) {
        const data = await listRes.json();
        if (data.members) setMembers(data.members);
      }
    } catch (err: any) {
      setInviteStatus(err.message || 'Invitation failed.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!window.confirm(`Revoke all sessions and remove ${memberName} immediately?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/team/members/${userId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to remove user.');
      }
      setMembers(members.filter((m) => m.id !== userId));
    } catch (err: any) {
      alert(err.message || 'Error removing team member.');
    }
  };

  const handleUpdateInspector = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingInspector(true);
    setInspectorStatus(null);
    try {
      const res = await fetch('/api/team/inspector/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'usr_qa_04',
          name: inspectorName.trim(),
          designation: inspectorDesignation.trim(),
          emp_id: inspectorEmpId.trim()
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Inspector setup update failed.');
      }
      setInspectorStatus('Inspector identity updated.');
    } catch (err: any) {
      setInspectorStatus(err.message || 'Failed to update inspector.');
    } finally {
      setIsUpdatingInspector(false);
    }
  };

  const handleRotateKey = async () => {
    if (!window.confirm('Rotate Ed25519 signing key? Previous keys remain published for historical checks.')) {
      return;
    }
    setIsRotatingKey(true);
    setKeyStatus(null);
    try {
      const res = await fetch('/api/team/signing-keys/rotate', {
        method: 'POST'
      });
      if (!res.ok) {
        throw new Error('Key rotation failed.');
      }
      const data = await res.json();
      setKeyStatus(`New key active: ${data.key_id}`);
      // Refresh list
      const listRes = await fetch('/api/team/signing-keys');
      if (listRes.ok) {
        const kData = await listRes.json();
        if (kData.keys) setSigningKeys(kData.keys);
      }
    } catch (err: any) {
      setKeyStatus(err.message || 'Key rotation failed.');
    } finally {
      setIsRotatingKey(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12 font-sans text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#18181A]/10">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium tracking-[-0.02em] text-[#18181A]">
            {t('settings.title', 'Plant Settings & Team')}
          </h1>
          <p className="text-xs sm:text-sm text-[#55544E] mt-1">
            {t(
              'settings.subtitle',
              'Manage factory teams, roles, inspector passkeys, and cryptographic keys'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsWizardOpen(true)}
          className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] text-xs font-medium transition-colors duration-150 cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
          <span>Launch Setup Wizard</span>
        </button>
      </div>

      {/* 1. Four-Role Matrix Table */}
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

      {/* 2. Team Management & Invitations */}
      <section className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-sm font-medium text-[#18181A]">
              Active Plant Team
            </h2>
            <p className="text-xs text-[#55544E]">
              Removing a user immediately revokes all active sessions
            </p>
          </div>
        </div>

        {/* Member List */}
        <div className="space-y-2.5">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-[#18181A]/10 bg-[#F7F5F0] gap-3"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-[#18181A]">
                    {m.name || m.email}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-[#ECFDF5] border border-emerald-200 text-[#047857]">
                    {m.role}
                  </span>
                  {m.has_totp && (
                    <span className="px-2 py-0.5 rounded text-xs bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] font-mono">
                      TOTP
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#55544E] mt-0.5">
                  {m.email} {m.designation ? `· ${m.designation}` : ''}{' '}
                  {m.emp_id ? <span className="font-mono tabular-nums">(#{m.emp_id})</span> : ''}
                </div>
              </div>

              {m.role !== 'OWNER' && (
                <button
                  type="button"
                  onClick={() => handleRemoveMember(m.id, m.name || m.email)}
                  className="self-start sm:self-center inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors duration-150 cursor-pointer"
                  title="Revoke session and remove user"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  <span>Remove User</span>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Invite Form */}
        <form onSubmit={handleSendInvite} className="pt-3 border-t border-[#18181A]/10 space-y-3">
          <div className="text-xs font-medium text-[#18181A]">
            Invite New Colleague
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@steelmill.in"
              className="flex-1 h-9 px-3 rounded-lg border border-[#18181A]/12 bg-[#F7F5F0] text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              className="h-9 px-3 rounded-lg border border-[#18181A]/12 bg-[#F7F5F0] text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
            >
              <option value="DISPATCH">DISPATCH</option>
              <option value="QA_INSPECTOR">QA_INSPECTOR</option>
              <option value="VIEWER">VIEWER</option>
              <option value="OWNER">OWNER</option>
            </select>
            <button
              type="submit"
              disabled={isInviting || !inviteEmail.trim()}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] text-xs font-medium disabled:opacity-50 transition-colors duration-150 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" strokeWidth={1.5} />
              <span>{isInviting ? 'Inviting...' : 'Send Invite'}</span>
            </button>
          </div>
          {inviteStatus && (
            <div className="text-xs text-[#047857]">
              {inviteStatus}
            </div>
          )}
        </form>
      </section>

      {/* 3. Plant Inspector Setup */}
      <section className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#B45309] flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-sm font-medium text-[#18181A]">
              Authorised Inspector Setup
            </h2>
            <p className="text-xs text-[#55544E]">
              Inspector enrolls TOTP on personal phone; owner never sees the secret
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-xs text-[#92400E] leading-relaxed">
          <strong className="font-medium text-[#B45309]">Privacy Guarantee:</strong> The plant owner assigns the inspector identity (name, designation, employee ID). The inspector enrolls TOTP on their personal device. The owner never sees or handles the secret.
        </div>

        <form onSubmit={handleUpdateInspector} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#18181A] mb-1">
              Inspector Name
            </label>
            <input
              type="text"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-[#18181A]/12 bg-[#F7F5F0] text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#18181A] mb-1">
              Official Designation
            </label>
            <input
              type="text"
              value={inspectorDesignation}
              onChange={(e) => setInspectorDesignation(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-[#18181A]/12 bg-[#F7F5F0] text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
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
              className="w-full h-9 px-3 rounded-lg border border-[#18181A]/12 bg-[#F7F5F0] text-xs font-mono text-[#18181A] focus:outline-none focus:border-[#059669]"
            />
          </div>
          <div className="sm:col-span-3 flex items-center justify-between pt-1">
            <button
              type="submit"
              disabled={isUpdatingInspector}
              className="h-9 px-4 bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] text-xs font-medium rounded-lg transition-colors duration-150 cursor-pointer"
            >
              {isUpdatingInspector ? 'Updating...' : 'Update Inspector Identity'}
            </button>
            {inspectorStatus && (
              <span className="text-xs text-[#047857] font-medium">
                {inspectorStatus}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* 4. Cryptographic Key Management */}
      <section className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#059669] flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-medium text-[#18181A]">
                Ed25519 Signing Keys
              </h2>
              <p className="text-xs text-[#55544E]">
                Rotatable key pairs; old public keys kept so past packs still verify
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRotateKey}
            disabled={isRotatingKey}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#18181A]/12 bg-[#F7F5F0] hover:bg-[#EFECE5] text-xs font-medium text-[#18181A] transition-colors duration-150 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRotatingKey ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            <span>{isRotatingKey ? 'Rotating...' : 'Rotate Key'}</span>
          </button>
        </div>

        {keyStatus && (
          <div className="text-xs text-[#047857]">
            {keyStatus}
          </div>
        )}

        <div className="space-y-2">
          {signingKeys.map((k) => (
            <div
              key={k.key_id}
              className="p-3 rounded-lg border border-[#18181A]/10 bg-[#F7F5F0] text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-medium text-[#18181A]">
                  {k.key_id}
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-mono text-xs ${
                    k.is_active
                      ? 'bg-[#ECFDF5] border border-emerald-200 text-[#047857] font-medium'
                      : 'bg-[#EFECE5] border border-[#18181A]/10 text-[#55544E]'
                  }`}
                >
                  {k.is_active ? 'ACTIVE' : 'HISTORICAL'}
                </span>
              </div>
              <div className="font-mono text-xs text-[#55544E] break-all">
                {k.public_key_b64}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Interface Language Selector */}
      <section className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#059669] flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-sm font-medium text-[#18181A]">
              {t('settings.language_label', 'Interface Language')}
            </h2>
            <p className="text-xs text-[#55544E]">
              {t(
                'settings.language_desc',
                'Choose your primary language for the factory floor and compliance dashboard'
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = currentLang === lang;
            const meta = LANGUAGE_METADATA[lang];
            return (
              <button
                key={lang}
                type="button"
                onClick={() => handleSelectLanguage(lang)}
                className={`flex flex-col justify-between p-4 rounded-xl border text-left transition-colors duration-150 cursor-pointer relative ${
                  isSelected
                    ? 'border-[#059669] bg-[#ECFDF5]'
                    : 'border-[#18181A]/10 bg-[#F7F5F0] hover:border-[#059669]/50'
                }`}
              >
                <div className="flex items-start justify-between w-full">
                  <div>
                    <span className="text-base font-medium text-[#18181A] block">
                      {meta.nativeLabel}
                    </span>
                    <span className="text-xs text-[#55544E] font-medium block mt-0.5">
                      {meta.label}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-md bg-[#059669] text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" strokeWidth={2} />
                    </span>
                  )}
                </div>
                <div className="mt-4 pt-2 border-t border-[#18181A]/10 flex items-center justify-between text-xs text-[#55544E]">
                  <span className="font-mono">{lang.toUpperCase()}</span>
                  <span className="truncate">{meta.region}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 6. Theme & Appearance */}
      <section className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#18181A] flex items-center justify-center shrink-0">
            {theme === 'dark' ? <Moon className="w-4 h-4" strokeWidth={1.5} /> : <Sun className="w-4 h-4" strokeWidth={1.5} />}
          </div>
          <div>
            <h2 className="text-sm font-medium text-[#18181A]">
              {t('settings.theme_label', 'Interface Appearance')}
            </h2>
            <p className="text-xs text-[#55544E]">
              {t(
                'settings.theme_desc',
                'Switch between Daylight Mill Parchment mode and Forged Graphite dark mode'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-[#18181A]/12 bg-[#F7F5F0] hover:bg-[#EFECE5] text-xs font-medium text-[#18181A] transition-colors duration-150 cursor-pointer"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-[#B45309]" strokeWidth={1.5} />
                <span>Switch to Daylight Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-[#18181A]" strokeWidth={1.5} />
                <span>Switch to Forged Graphite Mode</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* 7. Factory Plant Installation */}
      {activePlant && (
        <section className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#B45309] flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-sm font-medium text-[#18181A]">
                  {activePlant.name}
                </h2>
                <p className="text-xs font-mono tabular-nums text-[#55544E]">
                  {activePlant.installationId} · {activePlant.location}
                </p>
              </div>
            </div>
            {onOpenPlantSwitcher && (
              <button
                type="button"
                onClick={onOpenPlantSwitcher}
                className="text-xs font-medium text-[#047857] hover:underline cursor-pointer h-9 inline-flex items-center"
              >
                {t('dashboard.plant_switcher', 'Select Steel Plant')}
              </button>
            )}
          </div>
        </section>
      )}

      {/* 8. Cryptographic Security Telemetry */}
      <section className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F7F5F0] border border-[#18181A]/12 text-[#059669] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-medium text-[#18181A]">
                {t('settings.security_label', 'Tamper-Evidence Telemetry')}
              </h2>
              <p className="text-xs text-[#55544E]">
                Ed25519 signatures and SHA-256 hash chains
              </p>
            </div>
          </div>
          {onOpenSecurity && (
            <button
              type="button"
              onClick={onOpenSecurity}
              className="text-xs font-medium text-[#047857] hover:underline cursor-pointer h-9 inline-flex items-center"
            >
              {t('common.security_telemetry', 'Security Telemetry')}
            </button>
          )}
        </div>
      </section>

      {/* Onboarding Wizard Modal */}
      <OnboardingWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={() => {
          fetch('/api/team/members')
            .then((r) => r.json())
            .then((d) => d.members && setMembers(d.members))
            .catch(() => {});
        }}
      />
    </div>
  );
};
