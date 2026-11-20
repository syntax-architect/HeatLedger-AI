import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: 'Global Workspace',
    items: [
      { keys: ['⌘', 'K'], label: 'Open Command Palette' },
      { keys: ['U'], label: 'Upload or Capture Mill Certificate' },
      { keys: ['['], label: 'Collapse / Expand Left Sidebar' },
      { keys: ['?'], label: 'Toggle Keyboard Shortcuts' },
      { keys: ['Esc'], label: 'Close Active Modal or Drawer' },
    ],
  },
  {
    title: 'Quick View Navigation',
    items: [
      { keys: ['G', 'C'], label: 'Go to Command Center' },
      { keys: ['G', 'M'], label: 'Go to MTC Workbench' },
      { keys: ['G', 'H'], label: 'Go to Heat Inventory' },
      { keys: ['G', 'Q'], label: 'Go to Clause 6 Sign-Off Queue' },
      { keys: ['G', 'D'], label: 'Go to Customs Dossier' },
      { keys: ['G', 'S'], label: 'Go to Supplier Intelligence' },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            data-lenis-prevent
            className="w-full max-w-lg rounded-xl bg-[#FFFFFF] border border-[#E4E4E7] shadow-xl overflow-hidden text-[#09090B]"
          >
            <div className="px-5 py-4 border-b border-[#E4E4E7] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7] flex items-center justify-center text-[#059669]">
                  <Keyboard className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#09090B]">
                    Workspace Keyboard Shortcuts
                  </h2>
                  <p className="text-xs text-[#52525B]">
                    Navigate plant queues and capture flows without leaving the keyboard.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close shortcuts"
                className="p-1.5 rounded-lg text-[#52525B] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {SHORTCUT_GROUPS.map((group) => (
                <div key={group.title} className="space-y-2.5">
                  <div className="text-xs font-semibold text-[#52525B]">{group.title}</div>
                  <div className="rounded-lg border border-[#E4E4E7] divide-y divide-[#F4F4F5] overflow-hidden">
                    {group.items.map((item) => (
                      <div
                        key={item.label}
                        className="px-3.5 py-2.5 bg-[#FFFFFF] flex items-center justify-between gap-4 text-xs"
                      >
                        <span className="text-[#09090B]">{item.label}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.keys.map((k, idx) => (
                            <React.Fragment key={`${item.label}-${k}`}>
                              {idx > 0 && item.keys[0] === 'G' && (
                                <span className="text-[#A1A1AA] text-xs px-0.5">then</span>
                              )}
                              <kbd className="min-w-[24px] h-6 px-1.5 inline-flex items-center justify-center rounded-md bg-[#FAFAFA] border border-[#E4E4E7] font-mono text-xs font-semibold text-[#09090B] shadow-[0_1px_0_#E4E4E7]">
                                {k}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 bg-[#FAFAFA] border-t border-[#E4E4E7] flex items-center justify-between text-xs text-[#52525B]">
              <span>Shortcuts pause automatically while typing in inputs.</span>
              <span className="font-mono text-[#09090B]">Press ? anytime</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
