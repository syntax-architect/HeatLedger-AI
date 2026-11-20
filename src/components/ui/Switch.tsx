import React, { useId } from 'react';

export interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  id,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
}) => {
  const generatedId = useId();
  const switchId = id || `hl-switch-${generatedId}`;

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
    <div className={`inline-flex items-start gap-3 select-none ${className}`}>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label || 'Toggle switch'}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-150 focus-visible-ring ${
          disabled ? 'cursor-not-allowed opacity-50' : ''
        } ${
          checked
            ? 'bg-[#059669] border-[#059669] dark:bg-[#10B981] dark:border-[#10B981]'
            : 'bg-zinc-200 border-zinc-300 dark:bg-white/10 dark:border-white/15'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.16)] transition-transform duration-150 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>

      {(label || description) && (
        <div
          className={`flex flex-col text-left ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          onClick={handleClick}
        >
          {label && (
            <label
              htmlFor={switchId}
              className={`text-xs font-medium ${
                disabled ? 'text-text-muted opacity-60' : 'text-text'
              } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
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
  );
};
