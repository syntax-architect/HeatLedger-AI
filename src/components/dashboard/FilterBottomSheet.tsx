import React, { useEffect } from 'react';
import { X, Filter, Check } from 'lucide-react';
import { Button } from '../ui/Button';

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

export interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  statusOptions: FilterOption[];
  selectedStatus: string;
  onSelectStatus: (statusId: string) => void;
  sortOptions?: FilterOption[];
  selectedSort?: string;
  onSelectSort?: (sortId: string) => void;
  onReset?: () => void;
  activeCount?: number;
}

export const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  isOpen,
  onClose,
  title = 'Filters & Sorting',
  statusOptions,
  selectedStatus,
  onSelectStatus,
  sortOptions,
  selectedSort,
  onSelectSort,
  onReset,
  activeCount = 0,
}) => {
  // Lock background scroll & bind Escape when open
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
      {/* Unified Backdrop */}
      <div
        className="fixed inset-0 bg-[#0D0E11]/70 transition-opacity"
        onClick={onClose}
      />

      {/* Mill Parchment Bottom Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-h-[85vh] bg-[#FCFBF8] border-t border-[#18181A]/10 rounded-t-xl flex flex-col overflow-hidden text-[#18181A]"
      >
        <div className="w-10 h-1 bg-[#18181A]/20 rounded-md mx-auto mt-3 mb-2 shrink-0" />

        {/* Header */}
        <div className="px-5 py-3 border-b border-[#18181A]/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
            <h3 className="text-sm font-medium text-[#18181A]">{title}</h3>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-[#ECFDF5] border border-emerald-200 text-[#047857] text-xs font-mono font-medium">
                {activeCount} active
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-[#EFECE5] text-[#55544E] hover:text-[#18181A] transition-colors cursor-pointer"
            aria-label="Close filters"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 text-left">
          <div className="space-y-2">
            <span className="block text-xs font-medium text-[#55544E]">Filter by Status</span>
            <div className="grid grid-cols-1 gap-2">
              {statusOptions.map((opt) => {
                const isSelected = selectedStatus === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSelectStatus(opt.id)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-xs transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#ECFDF5] border-[#059669] text-[#047857] font-medium'
                        : 'bg-[#FCFBF8] border-[#18181A]/10 text-[#18181A] hover:bg-[#F7F5F0]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <div className="flex items-center gap-2">
                      {opt.count !== undefined && (
                        <span className="font-mono text-[#55544E] text-xs">{opt.count}</span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {sortOptions && sortOptions.length > 0 && (
            <div className="space-y-2">
              <span className="block text-xs font-medium text-[#55544E]">Sort By</span>
              <div className="grid grid-cols-1 gap-2">
                {sortOptions.map((opt) => {
                  const isSelected = selectedSort === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectSort && onSelectSort(opt.id)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-xs transition-colors text-left cursor-pointer ${
                        isSelected
                          ? 'bg-[#ECFDF5] border-[#059669] text-[#047857] font-medium'
                          : 'bg-[#FCFBF8] border-[#18181A]/10 text-[#18181A] hover:bg-[#F7F5F0]'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Hairline Footer */}
        <div className="px-5 py-3.5 border-t border-[#18181A]/10 bg-[#F7F5F0] flex items-center gap-2.5 shrink-0 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          {onReset && (
            <Button variant="secondary" size="sm" onClick={onReset} className="flex-1">
              Reset
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={onClose} className="flex-1">
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
};
