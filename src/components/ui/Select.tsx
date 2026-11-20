import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-text">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            className={`w-full appearance-none bg-surface text-text text-sm rounded-lg border shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors duration-150 min-h-[40px] pl-3 pr-9 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              error
                ? 'border-[#DC2626] dark:border-red-500/70 focus:border-[#DC2626] focus:ring-red-500/20'
                : 'border-border hover:border-zinc-300 dark:hover:border-white/20 focus:border-[#059669] dark:focus:border-[#10B981] focus:ring-emerald-600/15 dark:focus:ring-emerald-500/20'
            } ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="bg-surface text-text"
              >
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 w-4 h-4 text-text-muted pointer-events-none" />
        </div>
        {error ? (
          <span className="text-xs text-[#B91C1C] dark:text-red-400 font-medium">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-text-muted">{helperText}</span>
        ) : null}
      </div>
    );
  }
);
Select.displayName = 'Select';
