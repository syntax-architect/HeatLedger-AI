import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, Sun, Moon } from 'lucide-react';
import {
  SupportedLanguage,
  LANGUAGE_METADATA,
  SUPPORTED_LANGUAGES,
} from '../../../../i18n';

interface AppearanceAndLanguageSectionProps {
  currentLang: SupportedLanguage;
  theme: string;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  onToggleTheme: () => void;
}

export const AppearanceAndLanguageSection: React.FC<AppearanceAndLanguageSectionProps> = ({
  currentLang,
  theme,
  onSelectLanguage,
  onToggleTheme,
}) => {
  const { t } = useTranslation();

  return (
    <>
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
                onClick={() => onSelectLanguage(lang)}
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
            onClick={onToggleTheme}
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
    </>
  );
};
