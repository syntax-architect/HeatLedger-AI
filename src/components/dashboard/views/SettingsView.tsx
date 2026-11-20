import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  Check,
  Sun,
  Moon,
  Building2,
  ShieldCheck,
  HardDrive,
  Cpu,
  Layers,
} from 'lucide-react';
import {
  SupportedLanguage,
  LANGUAGE_METADATA,
  SUPPORTED_LANGUAGES,
  applyLanguageSettings,
} from '../../../i18n';
import { useTheme } from '../../../context/ThemeContext';
import { PlantProfile } from '../PlantSwitcherModal';

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

  return (
    <div className="space-y-6 max-w-4xl pb-12 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E4E7] dark:border-white/[0.08]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-[-0.02em] text-[#09090B] dark:text-[#F4F4F5]">
            {t('settings.title', 'Plant Settings & Localization')}
          </h1>
          <p className="text-xs sm:text-sm text-[#52525B] dark:text-[#A1A1AA] mt-1">
            {t(
              'settings.subtitle',
              'Manage factory installation, interface language, appearance, and API configurations'
            )}
          </p>
        </div>
      </div>

      {/* 1. Interface Language Selector */}
      <section className="bg-[#FFFFFF] dark:bg-[#14171F] rounded-xl border border-[#E4E4E7] dark:border-white/[0.08] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-[#059669] dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#09090B] dark:text-[#F4F4F5]">
              {t('settings.language_label', 'Interface Language')}
            </h2>
            <p className="text-xs text-[#52525B] dark:text-[#A1A1AA]">
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
                className={`flex flex-col justify-between p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                  isSelected
                    ? 'border-[#059669] bg-[#ECFDF5] dark:bg-emerald-500/10 shadow-xs'
                    : 'border-[#E4E4E7] dark:border-white/[0.08] bg-[#FAFAFA] dark:bg-[#181B22] hover:border-[#059669]/50'
                }`}
              >
                <div className="flex items-start justify-between w-full">
                  <div>
                    <span className="text-base font-bold text-[#09090B] dark:text-[#F4F4F5] block">
                      {meta.nativeLabel}
                    </span>
                    <span className="text-xs text-[#52525B] dark:text-[#A1A1AA] font-medium block mt-0.5">
                      {meta.label}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-[#059669] text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <div className="mt-4 pt-2 border-t border-[#E4E4E7]/60 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-[#52525B] dark:text-[#A1A1AA]">
                  <span className="font-mono uppercase">{lang}</span>
                  <span className="truncate">{meta.region}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Theme & Appearance */}
      <section className="bg-[#FFFFFF] dark:bg-[#14171F] rounded-xl border border-[#E4E4E7] dark:border-white/[0.08] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#09090B] dark:text-[#F4F4F5]">
              {t('settings.theme_label', 'Interface Appearance')}
            </h2>
            <p className="text-xs text-[#52525B] dark:text-[#A1A1AA]">
              {t(
                'settings.theme_desc',
                'Switch between Daylight mode and Obsidian Forge carbon dark theme'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#E4E4E7] dark:border-white/[0.08] bg-[#FAFAFA] dark:bg-[#181B22] text-xs font-medium text-[#09090B] dark:text-[#F4F4F5] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Switch to Daylight Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-blue-500" />
                <span>Switch to Obsidian Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* 3. Factory Plant Installation */}
      {activePlant && (
        <section className="bg-[#FFFFFF] dark:bg-[#14171F] rounded-xl border border-[#E4E4E7] dark:border-white/[0.08] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-[#D97706] dark:text-amber-400 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#09090B] dark:text-[#F4F4F5]">
                  {activePlant.name}
                </h2>
                <p className="text-xs font-mono text-[#52525B] dark:text-[#A1A1AA]">
                  {activePlant.installationId} · {activePlant.location}
                </p>
              </div>
            </div>
            {onOpenPlantSwitcher && (
              <button
                type="button"
                onClick={onOpenPlantSwitcher}
                className="text-xs font-medium text-[#059669] dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {t('dashboard.plant_switcher', 'Select Steel Plant')}
              </button>
            )}
          </div>
        </section>
      )}

      {/* 4. Cryptographic Security Telemetry */}
      <section className="bg-[#FFFFFF] dark:bg-[#14171F] rounded-xl border border-[#E4E4E7] dark:border-white/[0.08] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-[#059669] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#09090B] dark:text-[#F4F4F5]">
                {t('settings.security_label', 'Cryptographic Signatures')}
              </h2>
              <p className="text-xs text-[#52525B] dark:text-[#A1A1AA]">
                {t(
                  'settings.security_desc',
                  'Ed25519 hardware-grade signature keys and SHA-256 tamper-evident hash chaining'
                )}
              </p>
            </div>
          </div>
          {onOpenSecurity && (
            <button
              type="button"
              onClick={onOpenSecurity}
              className="text-xs font-medium text-[#059669] dark:text-emerald-400 hover:underline cursor-pointer"
            >
              {t('common.security_telemetry', 'Security Telemetry')}
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
