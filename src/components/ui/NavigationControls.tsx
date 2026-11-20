import React from 'react';
import { Check } from 'lucide-react';
import { haptics } from '../../lib/motion';

export interface StepItem {
  id: string | number;
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepItem[];
  activeStep: number; // 0-indexed
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  activeStep,
  onStepClick,
  className = '',
}) => {
  return (
    <div
      className={`w-full flex items-center justify-between gap-2 overflow-x-auto py-2 ${className}`}
    >
      {steps.map((step, idx) => {
        const isComplete = idx < activeStep;
        const isCurrent = idx === activeStep;

        return (
          <React.Fragment key={step.id}>
            <div
              onClick={() => onStepClick && onStepClick(idx)}
              className={`flex items-center gap-2.5 shrink-0 ${
                onStepClick ? 'cursor-pointer select-none' : ''
              }`}
            >
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center font-mono tabular-nums text-xs font-semibold transition-colors duration-150 ${
                  isComplete
                    ? 'bg-[#047857] text-white dark:bg-[#10B981] dark:text-[#09090B]'
                    : isCurrent
                      ? 'bg-[#ECFDF5] text-[#047857] border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/40'
                      : 'bg-surface-2 text-text-muted border border-border'
                }`}
              >
                {isComplete ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : idx + 1}
              </div>
              <div className="flex flex-col text-left">
                <span
                  className={`text-xs whitespace-nowrap ${
                    isCurrent
                      ? 'font-semibold text-text'
                      : isComplete
                        ? 'font-medium text-[#047857] dark:text-emerald-400'
                        : 'font-medium text-text-muted'
                  }`}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="text-xs text-text-muted hidden sm:inline">
                    {step.description}
                  </span>
                )}
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-px flex-1 min-w-[16px] transition-colors ${
                  idx < activeStep ? 'bg-[#059669] dark:bg-[#10B981]' : 'bg-border'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: SegmentedControlProps<T>) {
  const sizeClasses = size === 'sm' ? 'p-0.5 text-xs' : 'p-1 text-xs';
  const itemSizeClasses =
    size === 'sm' ? 'py-1 px-2.5 min-h-[30px]' : 'py-1.5 px-3 min-h-[34px]';

  return (
    <div
      role="tablist"
      className={`inline-flex items-center gap-0.5 rounded-lg bg-surface-2 border border-border ${sizeClasses} ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => {
              haptics.tap();
              onChange(opt.value);
            }}
            className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 rounded-md font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 dark:focus-visible:ring-emerald-500/50 ${itemSizeClasses} ${
              isSelected
                ? 'bg-surface text-text border border-border shadow-[0_1px_2px_rgba(0,0,0,0.04)] font-semibold'
                : 'text-text-muted border border-transparent hover:text-text'
            }`}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
