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
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[#0D0E11]/70 data-[state=open]:animate-fadeIn" />
          <Dialog.Content
            className={`fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] ${maxWidthClassName} -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[#FCFBF8] border border-[#18181A]/10 focus:outline-none max-h-[85vh] flex flex-col overflow-hidden text-[#18181A] font-sans`}
          >
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[#18181A]/10 shrink-0">
              <div>
                <Dialog.Title className="text-sm font-medium leading-tight text-[#18181A]">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="mt-1 text-xs text-[#55544E] leading-relaxed">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg h-8 w-8 text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] transition-colors flex items-center justify-center cursor-pointer shrink-0"
                  aria-label="Close sheet"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
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
        <Drawer.Overlay className="fixed inset-0 z-50 bg-[#0D0E11]/70" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-xl bg-[#FCFBF8] border-t border-[#18181A]/10 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none font-sans text-[#18181A]">
          <div className="mx-auto mt-3 mb-2 h-1 w-10 shrink-0 rounded-md bg-[#18181A]/20" />

          <div className="flex items-start justify-between gap-4 px-5 py-3 border-b border-[#18181A]/10 shrink-0">
            <div>
              <Drawer.Title className="text-sm font-medium leading-tight text-[#18181A]">
                {title}
              </Drawer.Title>
              {description && (
                <Drawer.Description className="mt-1 text-xs text-[#55544E] leading-relaxed">
                  {description}
                </Drawer.Description>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg h-8 w-8 text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] transition-colors touch-target flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Close sheet"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
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
