import React, { useId } from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  checked,
  onChange,
  label,
  description,
  error,
  disabled = false,
  className = '',
}) => {
  const generatedId = useId();
  const checkboxId = id || `hl-checkbox-${generatedId}`;

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div className={`flex flex-col select-none ${className}`}>
      <div className="inline-flex items-start gap-2.5">
        <button
          id={checkboxId}
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={label || 'Checkbox'}
          disabled={disabled}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={`mt-0.5 h-4 w-4 shrink-0 rounded-[5px] border flex items-center justify-center transition-colors duration-150 focus-visible-ring ${
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          } ${
            checked
              ? 'bg-[#059669] border-[#059669] text-white dark:bg-[#10B981] dark:border-[#10B981] dark:text-[#09090B]'
              : error
                ? 'border-[#DC2626] bg-[#FEF2F2] dark:border-red-500/70 dark:bg-red-500/10'
                : 'border-zinc-300 dark:border-white/20 bg-surface hover:border-zinc-400 dark:hover:border-white/30'
          }`}
        >
          {checked && <Check className="w-3 h-3 stroke-[2.75]" />}
        </button>

        {(label || description) && (
          <div
            className={`flex flex-col text-left ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={handleClick}
          >
            {label && (
              <label
                htmlFor={checkboxId}
                className={`text-xs font-medium ${
                  disabled ? 'text-text-muted opacity-60 cursor-not-allowed' : 'text-text cursor-pointer'
                }`}
              >
                {label}
              </label>
            )}
            {description && (
              <span className="text-xs text-text-muted mt-0.5 leading-relaxed">{description}</span>
            )}
          </div>
        )}
      </div>

      {error && (
        <span className="text-xs text-[#B91C1C] dark:text-red-400 font-medium mt-1 pl-6">
          {error}
        </span>
      )}
    </div>
  );
};
