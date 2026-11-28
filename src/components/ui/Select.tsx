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
          <label htmlFor={selectId} className="text-xs font-medium text-[#18181A]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            className={`w-full appearance-none bg-[#FCFBF8] text-[#18181A] text-sm rounded-lg border transition-colors duration-150 min-h-[40px] pl-3 pr-9 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              error
                ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/15'
                : 'border-[#18181A]/15 hover:border-[#18181A]/25 focus:border-[#059669] focus:ring-[#059669]/15'
            } ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="bg-[#FCFBF8] text-[#18181A]"
              >
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-3 w-4 h-4 text-[#55544E] pointer-events-none"
            strokeWidth={1.5}
          />
        </div>
        {error ? (
          <span className="text-xs text-[#B91C1C] font-medium">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-[#55544E]">{helperText}</span>
        ) : null}
      </div>
    );
  }
);
Select.displayName = 'Select';
