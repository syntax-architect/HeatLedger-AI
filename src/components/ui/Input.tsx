import React from 'react';
import { Search, X } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-text">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-text-muted pointer-events-none shrink-0">
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-surface text-text placeholder:text-text-muted/70 text-sm rounded-lg border shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors duration-150 min-h-[40px] px-3 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              leftIcon ? 'pl-9' : ''
            } ${rightIcon ? 'pr-9' : ''} ${
              error
                ? 'border-[#DC2626] dark:border-red-500/70 focus:border-[#DC2626] focus:ring-red-500/20'
                : 'border-border hover:border-zinc-300 dark:hover:border-white/20 focus:border-[#059669] dark:focus:border-[#10B981] focus:ring-emerald-600/15 dark:focus:ring-emerald-500/20'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 text-text-muted pointer-events-none shrink-0">
              {rightIcon}
            </span>
          )}
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
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={textareaId} className="text-xs font-medium text-text">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={`w-full bg-surface text-text placeholder:text-text-muted/70 text-sm rounded-lg border shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors duration-150 p-3 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? 'border-[#DC2626] dark:border-red-500/70 focus:border-[#DC2626] focus:ring-red-500/20'
              : 'border-border hover:border-zinc-300 dark:hover:border-white/20 focus:border-[#059669] dark:focus:border-[#10B981] focus:ring-emerald-600/15 dark:focus:ring-emerald-500/20'
          } ${className}`}
          {...props}
        />
        {error ? (
          <span className="text-xs text-[#B91C1C] dark:text-red-400 font-medium">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-text-muted">{helperText}</span>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export interface SearchFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  (
    {
      value,
      onChange,
      onClear,
      className = '',
      placeholder = 'Search heats, shipments, CN codes...',
      ...props
    },
    ref
  ) => {
    return (
      <div className="relative flex items-center w-full">
        <Search className="absolute left-3 w-4 h-4 text-text-muted pointer-events-none" />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full bg-surface text-text placeholder:text-text-muted/70 text-sm rounded-lg border border-border hover:border-zinc-300 dark:hover:border-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.04)] pl-9 pr-9 py-2 min-h-[40px] focus:outline-none focus:border-[#059669] dark:focus:border-[#10B981] focus:ring-2 focus:ring-emerald-600/15 dark:focus:ring-emerald-500/20 transition-colors duration-150 ${className}`}
          {...props}
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
            aria-label="Clear search query"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }
);
SearchField.displayName = 'SearchField';
