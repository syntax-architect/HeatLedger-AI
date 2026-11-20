import React, { useRef, useState } from 'react';
import { UploadCloud, Camera, Info, AlertTriangle, FileWarning, X } from 'lucide-react';
import { haptics } from '../../lib/motion';

export const Skeleton: React.FC<{
  className?: string;
  width?: string | number;
  height?: string | number;
}> = ({ className = '', width, height }) => {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-surface-2 before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-zinc-300/40 dark:before:via-white/[0.06] before:to-transparent ${className}`}
      style={{ width, height }}
    />
  );
};

export const ProgressRing: React.FC<{
  progress: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  className?: string;
}> = ({ progress, size = 48, strokeWidth = 3.5, className = '' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, progress));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-border"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-[#059669] dark:stroke-[#10B981] transition-all duration-300 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className="absolute font-mono tabular-nums text-xs font-semibold text-text">
        {Math.round(clamped)}%
      </span>
    </div>
  );
};

export type BannerVariant = 'info' | 'warning' | 'draft';

export const Banner: React.FC<{
  variant?: BannerVariant;
  title: string;
  message?: string;
  onClose?: () => void;
  className?: string;
}> = ({ variant = 'info', title, message, onClose, className = '' }) => {
  const config = {
    info: {
      bg: 'bg-[#EFF6FF] dark:bg-blue-500/10',
      border: 'border-blue-200 dark:border-blue-500/25',
      text: 'text-[#1D4ED8] dark:text-blue-400',
      icon: <Info className="w-4 h-4 shrink-0 text-[#2563EB] dark:text-blue-400" />,
    },
    warning: {
      bg: 'bg-[#FFFBEB] dark:bg-amber-500/10',
      border: 'border-[#FDE68A] dark:border-amber-500/25',
      text: 'text-[#92400E] dark:text-amber-400',
      icon: <AlertTriangle className="w-4 h-4 shrink-0 text-[#D97706] dark:text-amber-400" />,
    },
    draft: {
      bg: 'bg-[#ECFDF5] dark:bg-emerald-500/10',
      border: 'border-emerald-200 dark:border-emerald-500/25',
      text: 'text-[#065F46] dark:text-emerald-400',
      icon: <FileWarning className="w-4 h-4 shrink-0 text-[#059669] dark:text-emerald-400" />,
    },
  }[variant];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-3.5 rounded-xl border ${config.bg} ${config.border} text-left ${className}`}
    >
      <div className="mt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <h4 className={`text-xs font-semibold ${config.text}`}>{title}</h4>
        {message && <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{message}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface/60 transition-colors shrink-0"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMb?: number;
  isLoading?: boolean;
  className?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileSelect,
  accept = '.pdf,image/jpeg,image/png,image/heic',
  maxSizeMb = 25,
  isLoading = false,
  className = '',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const validateAndPass = (file: File) => {
    setError(null);
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File size exceeds maximum allowed limit of ${maxSizeMb} MB.`);
      haptics.error();
      return;
    }
    haptics.success();
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndPass(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      aria-busy={isLoading}
      className={`relative p-6 rounded-xl border border-dashed transition-colors duration-150 text-center flex flex-col items-center justify-center gap-3 ${
        isDragOver
          ? 'border-[#059669] bg-[#ECFDF5]/60 dark:border-[#10B981] dark:bg-emerald-500/10'
          : 'border-border bg-surface hover:border-zinc-300 dark:hover:border-white/20'
      } ${isLoading ? 'opacity-60 pointer-events-none' : ''} ${className}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && validateAndPass(e.target.files[0])}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && validateAndPass(e.target.files[0])}
      />

      <div className="w-10 h-10 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-[#047857] dark:text-emerald-400">
        <UploadCloud className="w-5 h-5" />
      </div>

      <div>
        <h4 className="text-sm font-semibold tracking-[-0.015em] text-text">
          Drop Mill Test Certificate here
        </h4>
        <p className="text-xs text-text-muted mt-0.5">
          PDF, JPG, PNG, or HEIC up to {maxSizeMb} MB
        </p>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3.5 py-2 rounded-lg bg-surface border border-border hover:bg-surface-2 hover:border-zinc-300 dark:hover:border-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-xs font-medium text-text transition-colors whitespace-nowrap"
        >
          Browse Files
        </button>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="px-3.5 py-2 rounded-lg bg-surface-2 border border-border hover:border-zinc-300 dark:hover:border-white/20 text-xs font-medium text-text transition-colors inline-flex items-center gap-1.5 whitespace-nowrap sm:hidden"
        >
          <Camera className="w-3.5 h-3.5 text-[#047857] dark:text-emerald-400" />
          <span>Camera</span>
        </button>
      </div>

      {error && (
        <span className="text-xs text-[#B91C1C] dark:text-red-400 font-medium mt-1">{error}</span>
      )}
    </div>
  );
};
