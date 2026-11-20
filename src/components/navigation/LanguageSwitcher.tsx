import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SupportedLanguage, LANGUAGE_METADATA, SUPPORTED_LANGUAGES, applyLanguageSettings } from '../../i18n';

export interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = '',
  compact = false,
}) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const rawLang = ((i18n.language || 'en').split('-')[0]) as SupportedLanguage;
  const currentLang: SupportedLanguage = SUPPORTED_LANGUAGES.includes(rawLang) ? rawLang : 'en';
  const currentMeta = LANGUAGE_METADATA[currentLang] || LANGUAGE_METADATA.en;

  const handleSelectLanguage = (lang: SupportedLanguage) => {
    i18n.changeLanguage(lang);
    applyLanguageSettings(lang);
    setIsOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select Interface Language"
        className={`flex items-center gap-1.5 rounded-xl bg-surface-2 border border-border hover:border-border-hover text-text font-mono text-xs transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer ${
          compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5'
        }`}
      >
        <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="font-semibold">{currentMeta.nativeLabel}</span>
        <ChevronDown
          className={`w-3 h-3 text-text-muted transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label="Available Languages"
          className="absolute right-0 mt-1.5 w-44 rounded-xl bg-surface border border-border shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = currentLang === lang;
            const meta = LANGUAGE_METADATA[lang];
            return (
              <li key={lang} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => handleSelectLanguage(lang)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-400 font-bold'
                      : 'text-text hover:bg-surface-2'
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{meta.nativeLabel}</span>
                    <span className="text-[10px] text-text-muted font-sans truncate">
                      {meta.label} {meta.region ? `· ${meta.region}` : ''}
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
