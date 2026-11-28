import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  applyLanguageSettings,
} from '../../../i18n';
import { useTheme } from '../../../context/ThemeContext';
import { PlantProfile } from '../PlantSwitcherModal';
import { OnboardingWizardModal } from '../../onboarding/OnboardingWizardModal';
import { RoleMatrixSection } from './settings/RoleMatrixSection';
import { TeamManagementSection, type TeamMember } from './settings/TeamManagementSection';
import { InspectorAndKeysSection, type SigningKey } from './settings/InspectorAndKeysSection';
import { AppearanceAndLanguageSection } from './settings/AppearanceAndLanguageSection';

interface SettingsViewProps {
  activePlant?: PlantProfile;
  onOpenPlantSwitcher?: () => void;
  onOpenSecurity?: () => void;
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

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'OWNER' | 'QA_INSPECTOR' | 'DISPATCH' | 'VIEWER'>('DISPATCH');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  const [inspectorName, setInspectorName] = useState('');
  const [inspectorDesignation, setInspectorDesignation] = useState('');
  const [inspectorEmpId, setInspectorEmpId] = useState('');
  const [isUpdatingInspector, setIsUpdatingInspector] = useState(false);
  const [inspectorStatus, setInspectorStatus] = useState<string | null>(null);

  const [signingKeys, setSigningKeys] = useState<SigningKey[]>([]);
  const [isRotatingKey, setIsRotatingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/team/members', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.members)) {
          setMembers(data.members);
        }
      })
      .catch(() => {});

    fetch('/api/team/signing-keys', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.keys)) {
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
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Invitation dispatch failed.');
      }
      setInviteStatus(`Invitation sent to ${inviteEmail}.`);
      setInviteEmail('');
      const listRes = await fetch('/api/team/members', { credentials: 'include' });
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
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to remove user.');
      }
      setMembers((prev) => prev.filter((m) => m.id !== userId));
    } catch (err: any) {
      alert(err.message || 'Error removing team member.');
    }
  };

  const handleUpdateInspector = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingInspector(true);
    setInspectorStatus(null);
    try {
      const inspectorMember = members.find((m) => m.role === 'QA_INSPECTOR');
      const res = await fetch('/api/team/inspector/setup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: inspectorMember?.id || 'qa_inspector',
          name: inspectorName.trim(),
          designation: inspectorDesignation.trim(),
          emp_id: inspectorEmpId.trim(),
        }),
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
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Key rotation failed.');
      }
      const data = await res.json();
      setKeyStatus(`New key active: ${data.key_id}`);
      const listRes = await fetch('/api/team/signing-keys', { credentials: 'include' });
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

      <RoleMatrixSection />

      <TeamManagementSection
        members={members}
        inviteEmail={inviteEmail}
        inviteRole={inviteRole}
        isInviting={isInviting}
        inviteStatus={inviteStatus}
        onInviteEmailChange={setInviteEmail}
        onInviteRoleChange={setInviteRole}
        onSendInvite={handleSendInvite}
        onRemoveMember={handleRemoveMember}
      />

      <InspectorAndKeysSection
        inspectorName={inspectorName}
        inspectorDesignation={inspectorDesignation}
        inspectorEmpId={inspectorEmpId}
        isUpdatingInspector={isUpdatingInspector}
        inspectorStatus={inspectorStatus}
        signingKeys={signingKeys}
        isRotatingKey={isRotatingKey}
        keyStatus={keyStatus}
        onInspectorNameChange={setInspectorName}
        onInspectorDesignationChange={setInspectorDesignation}
        onInspectorEmpIdChange={setInspectorEmpId}
        onUpdateInspector={handleUpdateInspector}
        onRotateKey={handleRotateKey}
      />

      <AppearanceAndLanguageSection
        currentLang={currentLang}
        theme={theme}
        onSelectLanguage={handleSelectLanguage}
        onToggleTheme={toggleTheme}
      />

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

      <OnboardingWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={() => {
          fetch('/api/team/members', { credentials: 'include' })
            .then((r) => r.json())
            .then((d) => d.members && setMembers(d.members))
            .catch(() => {});
        }}
      />
    </div>
  );
};
