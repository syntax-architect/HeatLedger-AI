import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Drawer } from 'vaul';
import { X } from 'lucide-react';

interface ResponsiveSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidthClassName?: string;
}

/**
 * ResponsiveSheet:
 * - Mobile (< 768px): Bottom sheet with drag handle, swipe-to-dismiss, max-height 90dvh.
 * - Desktop (>= 768px): Centered accessible dialog with unified backdrop and Escape support.
 */
export const ResponsiveSheet: React.FC<ResponsiveSheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidthClassName = 'max-w-xl',
}) => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsDesktop(mql.matches);
    setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  if (isDesktop) {
    return (
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
          <Dialog.Content
            className={`fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] ${maxWidthClassName} -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[#FFFFFF] border border-[#E4E4E7] shadow-xl focus:outline-none max-h-[85vh] flex flex-col overflow-hidden text-[#09090B] font-sans`}
          >
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[#E4E4E7] shrink-0">
              <div>
                <Dialog.Title className="text-sm font-semibold leading-tight text-[#09090B]">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="mt-1 text-xs text-[#52525B] leading-relaxed">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-[#52525B] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors flex items-center justify-center cursor-pointer shrink-0"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>

            <div data-lenis-prevent className="p-5 overflow-y-auto flex-1">
              {children}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-sm" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-2xl bg-[#FFFFFF] border-t border-[#E4E4E7] pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none font-sans text-[#09090B] shadow-xl">
          <div className="mx-auto mt-3 mb-2 h-1.5 w-11 shrink-0 rounded-full bg-[#D4D4D8]" />

          <div className="flex items-start justify-between gap-4 px-5 py-3 border-b border-[#E4E4E7] shrink-0">
            <div>
              <Drawer.Title className="text-sm font-semibold leading-tight text-[#09090B]">
                {title}
              </Drawer.Title>
              {description && (
                <Drawer.Description className="mt-1 text-xs text-[#52525B] leading-relaxed">
                  {description}
                </Drawer.Description>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#52525B] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors touch-target flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Close sheet"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div data-lenis-prevent className="p-5 overflow-y-auto flex-1 overscroll-contain">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
