import React from 'react';
import { Loader2 } from 'lucide-react';
import { haptics } from '../../lib/motion';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  onClick,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;
    haptics.tap();
    if (onClick) onClick(e);
  };

  const baseStyles =
    'inline-flex items-center justify-center whitespace-nowrap shrink-0 font-medium rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 dark:focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0A0C10] disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 min-h-[34px] gap-1.5',
    md: 'text-sm px-4 py-2 min-h-[40px] gap-2',
    lg: 'text-sm px-5 py-2.5 min-h-[44px] gap-2',
  }[size];

  const variantStyles = {
    primary:
      'bg-[#047857] text-white border border-[#047857] font-semibold hover:bg-[#065F46] hover:border-[#065F46] dark:bg-[#10B981] dark:text-[#09090B] dark:border-[#10B981] dark:hover:bg-[#34D399] dark:hover:border-[#34D399] shadow-[0_1px_2px_rgba(0,0,0,0.06)]',
    secondary:
      'bg-surface text-text border border-border hover:bg-surface-2 hover:border-zinc-300 dark:hover:border-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
    ghost: 'bg-transparent text-text-muted border border-transparent hover:text-text hover:bg-surface-2',
    danger:
      'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] hover:bg-red-100/80 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/25 dark:hover:bg-red-500/20',
  }[variant];

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled || isLoading}
      onClick={handleClick}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  variant = 'secondary',
  size = 'md',
  disabled,
  className = '',
  onClick,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    haptics.tap();
    if (onClick) onClick(e);
  };

  const sizeStyles = {
    sm: 'w-8 h-8 p-1.5 text-xs',
    md: 'w-10 h-10 p-2 text-sm',
    lg: 'w-11 h-11 p-2.5 text-base',
  }[size];

  const variantStyles = {
    primary:
      'bg-[#047857] text-white border border-[#047857] hover:bg-[#065F46] dark:bg-[#10B981] dark:text-[#09090B] dark:border-[#10B981] dark:hover:bg-[#34D399]',
    secondary:
      'bg-surface text-text border border-border hover:bg-surface-2 hover:border-zinc-300 dark:hover:border-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
    ghost: 'bg-transparent text-text-muted border border-transparent hover:text-text hover:bg-surface-2',
    danger:
      'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] hover:bg-red-100/80 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/25 dark:hover:bg-red-500/20',
  }[variant];

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center shrink-0 rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 dark:focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0A0C10] disabled:opacity-50 disabled:cursor-not-allowed ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled}
      onClick={handleClick}
      {...props}
    >
      {icon}
    </button>
  );
};
