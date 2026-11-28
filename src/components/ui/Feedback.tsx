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
      className={`relative overflow-hidden rounded-lg bg-[#EFECE5] before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-[#FCFBF8]/40 ${className}`}
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
          className="stroke-[#18181A]/15"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-[#059669] transition-[stroke-dashoffset] duration-300 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className="absolute font-mono tabular-nums text-xs font-medium text-[#18181A]">
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
      bg: 'bg-[#F7F5F0]',
      border: 'border-[#18181A]/15',
      text: 'text-[#18181A]',
      icon: <Info className="w-4 h-4 shrink-0 text-[#55544E]" strokeWidth={1.5} />,
    },
    warning: {
      bg: 'bg-[#FFFBEB]',
      border: 'border-[#FDE68A]',
      text: 'text-[#92400E]',
      icon: <AlertTriangle className="w-4 h-4 shrink-0 text-[#D97706]" strokeWidth={1.5} />,
    },
    draft: {
      bg: 'bg-[#ECFDF5]',
      border: 'border-emerald-200',
      text: 'text-[#065F46]',
      icon: <FileWarning className="w-4 h-4 shrink-0 text-[#059669]" strokeWidth={1.5} />,
    },
  }[variant];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-3.5 rounded-xl border ${config.bg} ${config.border} text-left ${className}`}
    >
      <div className="mt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <h4 className={`text-xs font-medium ${config.text}`}>{title}</h4>
        {message && <p className="text-xs text-[#55544E] mt-0.5 leading-relaxed">{message}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] transition-colors shrink-0 cursor-pointer"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
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
          ? 'border-[#059669] bg-[#ECFDF5]/60'
          : 'border-[#18181A]/15 bg-[#FCFBF8] hover:border-[#18181A]/25'
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

      <div className="w-10 h-10 rounded-lg bg-[#EFECE5] border border-[#18181A]/10 flex items-center justify-center text-[#047857]">
        <UploadCloud className="w-5 h-5" strokeWidth={1.5} />
      </div>

      <div>
        <h4 className="text-sm font-medium tracking-[-0.015em] text-[#18181A]">
          Drop Mill Test Certificate here
        </h4>
        <p className="text-xs text-[#55544E] mt-0.5">
          PDF, JPG, PNG, or HEIC up to {maxSizeMb} MB
        </p>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="h-9 px-3.5 rounded-lg bg-[#FCFBF8] border border-[#18181A]/15 hover:bg-[#EFECE5] text-xs font-medium text-[#18181A] transition-colors whitespace-nowrap cursor-pointer"
        >
          Browse Files
        </button>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="h-9 px-3.5 rounded-lg bg-[#EFECE5] border border-[#18181A]/15 hover:border-[#18181A]/25 text-xs font-medium text-[#18181A] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap sm:hidden cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5 text-[#047857]" strokeWidth={1.5} />
          <span>Camera</span>
        </button>
      </div>

      {error && (
        <span className="text-xs text-[#B91C1C] font-medium mt-1">{error}</span>
      )}
    </div>
  );
};
