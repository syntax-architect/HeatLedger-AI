import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Search,
  LayoutDashboard,
  FlaskConical,
  Database,
  Stamp,
  FileCode,
  Building2,
  Moon,
  Sun,
  ShieldCheck,
  KeyRound,
  Upload,
  CornerDownLeft,
  FileText,
  Sliders,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

export interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions' | 'Tools';
  keywords: string[];
  icon: React.FC<{ className?: string }>;
  onSelect: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerCapture: () => void;
  onTriggerPlantSwitch: () => void;
  onTriggerSecurity: () => void;
  onTriggerPinModal: () => void;
}

const CATEGORIES: Array<CommandItem['category']> = ['Navigation', 'Actions', 'Tools'];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onTriggerCapture,
  onTriggerPlantSwitch,
  onTriggerSecurity,
  onTriggerPinModal,
}) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: 'nav-home',
        title: 'Command Center & Shipments',
        category: 'Navigation',
        keywords: ['home', 'dashboard', 'shipments', 'overview', 'consignments'],
        icon: LayoutDashboard,
        onSelect: () => navigate('/app/shipments'),
        shortcut: 'G H',
      },
      {
        id: 'nav-workbench',
        title: 'MTC Workbench & Vision OCR',
        category: 'Navigation',
        keywords: ['mtc', 'workbench', 'ocr', 'certificates', 'chemistry', 'spectrometer'],
        icon: FlaskConical,
        onSelect: () => navigate('/app/certificates'),
        shortcut: 'G W',
      },
      {
        id: 'nav-signoff',
        title: 'Clause 6 Digital Sign-Off Queue',
        category: 'Navigation',
        keywords: ['sign', 'sign-off', 'queue', 'clause 6', 'signature', 'inspector', 'approve'],
        icon: Stamp,
        onSelect: () => navigate('/app/sign-off'),
        shortcut: 'G S',
      },
      {
        id: 'nav-heats',
        title: 'Heat Inventory & Mass Balance',
        category: 'Navigation',
        keywords: ['heat', 'heats', 'inventory', 'mass balance', 'ladle', 'chemistry', 'billet'],
        icon: Database,
        onSelect: () => navigate('/app/heats'),
        shortcut: 'G I',
      },
      {
        id: 'nav-cbam',
        title: 'CBAM Customs Dossiers & XML',
        category: 'Navigation',
        keywords: ['cbam', 'dossier', 'customs', 'xml', 'emissions', 'annex', 'export'],
        icon: FileCode,
        onSelect: () => navigate('/app/dossiers'),
        shortcut: 'G D',
      },
      {
        id: 'nav-suppliers',
        title: 'Supplier Registry & Upstream Mills',
        category: 'Navigation',
        keywords: ['supplier', 'suppliers', 'mills', 'tata', 'sail', 'jsw', 'vendor'],
        icon: Building2,
        onSelect: () => navigate('/app/suppliers'),
      },
      {
        id: 'nav-reports',
        title: 'Compliance Reports & Verification Log',
        category: 'Navigation',
        keywords: ['reports', 'audit', 'compliance', 'log', 'export', 'registry'],
        icon: FileText,
        onSelect: () => navigate('/app/reports'),
      },
      {
        id: 'nav-settings',
        title: 'Factory Settings & API Keys',
        category: 'Navigation',
        keywords: ['settings', 'config', 'api', 'keys', 'webhook', 'profile'],
        icon: Sliders,
        onSelect: () => navigate('/app/settings'),
      },
      {
        id: 'action-capture',
        title: 'Capture MTC or Export Invoice',
        category: 'Actions',
        keywords: ['upload', 'capture', 'camera', 'photo', 'pdf', 'scan'],
        icon: Upload,
        onSelect: onTriggerCapture,
        shortcut: 'U',
      },
      {
        id: 'action-plant',
        title: 'Switch Factory Installation',
        category: 'Actions',
        keywords: ['plant', 'switch', 'installation', 'howrah', 'raipur', 'kalinganagar'],
        icon: Building2,
        onSelect: onTriggerPlantSwitch,
        shortcut: 'P',
      },
      {
        id: 'action-theme',
        title: `Switch Theme to ${theme === 'dark' ? 'Daylight' : 'Carbon Dark'}`,
        category: 'Tools',
        keywords: ['theme', 'dark', 'light', 'mode', 'color'],
        icon: theme === 'dark' ? Sun : Moon,
        onSelect: toggleTheme,
        shortcut: 'T',
      },
      {
        id: 'action-telemetry',
        title: 'Security Telemetry & Cryptographic Audit',
        category: 'Tools',
        keywords: ['security', 'telemetry', 'audit', 'sha-256', 'cryptography', 'shield'],
        icon: ShieldCheck,
        onSelect: onTriggerSecurity,
      },
      {
        id: 'action-pin',
        title: 'Inspector Step-Up PIN Challenge',
        category: 'Tools',
        keywords: ['pin', 'inspector', 'passkey', 'auth', '2fa', 'step up'],
        icon: KeyRound,
        onSelect: onTriggerPinModal,
      },
    ],
    [
      navigate,
      onTriggerCapture,
      onTriggerPlantSwitch,
      onTriggerSecurity,
      onTriggerPinModal,
      theme,
      toggleTheme,
    ]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase().trim();
    return commands.filter((cmd) => {
      if (cmd.title.toLowerCase().includes(q)) return true;
      if (cmd.category.toLowerCase().includes(q)) return true;
      return cmd.keywords.some((k) => k.toLowerCase().includes(q));
    });
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen) setQuery('');
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].onSelect();
        onClose();
      }
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
        <Dialog.Content className="fixed left-1/2 top-[14%] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-xl bg-[#FFFFFF] border border-[#E4E4E7] shadow-xl overflow-hidden outline-none font-sans text-[#09090B]">
          <Dialog.Title className="sr-only">Command Palette</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search workspace navigation, plant actions, and security tools.
          </Dialog.Description>

          {/* Search Input Header */}
          <div className="flex items-center gap-3 px-4 h-12 border-b border-[#E4E4E7] bg-[#FFFFFF]">
            <Search className="w-4 h-4 text-[#52525B] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search commands, views, heats, upload MTC, or switch plant..."
              className="flex-1 bg-transparent text-sm text-[#09090B] placeholder:text-[#A1A1AA] focus:outline-none"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="p-1 rounded-md text-[#52525B] hover:text-[#09090B] hover:bg-[#F4F4F5] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs font-mono bg-[#F4F4F5] text-[#52525B] rounded border border-[#E4E4E7]">
              ESC
            </kbd>
          </div>

          {/* Grouped Results List */}
          <div className="max-h-[58vh] overflow-y-auto p-2 overscroll-contain">
            {filtered.length === 0 ? (
              <div className="py-10 px-4 text-center text-xs text-[#52525B]">
                No commands match &ldquo;{query}&rdquo;.
              </div>
            ) : (
              <div className="space-y-3">
                {CATEGORIES.map((category) => {
                  const items = filtered.filter((cmd) => cmd.category === category);
                  if (items.length === 0) return null;

                  return (
                    <div key={category} className="space-y-0.5">
                      <div className="px-2.5 py-1 text-xs font-medium text-[#52525B]">
                        {category}
                      </div>
                      {items.map((item) => {
                        const globalIdx = filtered.indexOf(item);
                        const Icon = item.icon;
                        const isSelected = globalIdx === selectedIndex;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              item.onSelect();
                              onClose();
                            }}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#F4F4F5] text-[#09090B]'
                                : 'text-[#52525B] hover:bg-[#FAFAFA] hover:text-[#09090B]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon
                                className={`w-4 h-4 shrink-0 ${
                                  isSelected ? 'text-[#059669]' : 'text-[#52525B]'
                                }`}
                              />
                              <span className="text-xs font-medium truncate text-[#09090B]">
                                {item.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {item.shortcut && (
                                <kbd className="text-xs font-mono px-1.5 py-0.5 rounded bg-[#FFFFFF] text-[#52525B] border border-[#E4E4E7]">
                                  {item.shortcut}
                                </kbd>
                              )}
                              {isSelected && (
                                <CornerDownLeft className="w-3.5 h-3.5 text-[#059669]" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Crisp Hairline Footer */}
          <div className="px-4 py-2.5 bg-[#FAFAFA] border-t border-[#E4E4E7] flex items-center justify-between text-xs text-[#52525B]">
            <div className="flex items-center gap-3 font-mono">
              <span>↑↓ Navigate</span>
              <span>↵ Open</span>
              <span>ESC Close</span>
            </div>
            <span className="font-medium text-[#09090B]">HeatLedger Command</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
