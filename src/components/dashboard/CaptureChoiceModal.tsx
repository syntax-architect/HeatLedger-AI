import React, { useRef, useState } from 'react';
import { ResponsiveSheet } from '../common/ResponsiveSheet';
import {
  Camera,
  Upload,
  FileText,
  ShieldCheck,
  MessageSquare,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { SIMULATOR_PRESETS } from '../../data/marketingSamples';
import { CameraCaptureModal } from '../camera/CameraCaptureModal';
import { IntakeConfigModal } from '../intake/IntakeConfigModal';

interface CaptureChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (file: File) => void;
  onSelectPreset: (presetId: string) => void;
}

export const CaptureChoiceModal: React.FC<CaptureChoiceModalProps> = ({
  isOpen,
  onClose,
  onSelectFile,
  onSelectPreset,
}) => {
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndForward = (file: File) => {
    setFileError(null);
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File exceeds the 10 MB limit. Please select a PDF or image up to 10 MB.');
      return;
    }

    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|png|jpe?g|webp)$/i)) {
      setFileError('Unsupported file format. Upload a PDF, PNG, JPEG, or WEBP file.');
      return;
    }

    onSelectFile(file);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    validateAndForward(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndForward(file);
    }
  };

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Capture Mill Test Certificate (MTC)"
      description="Scan or upload an EN 10204 3.1 mill certificate from Tata Steel, SAIL, JSW, or Jindal."
    >
      <div className="space-y-4">
        {/* Hidden Native File Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {fileError && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626] flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{fileError}</span>
          </div>
        )}

        {/* Primary Action 1: Camera Photo Capture */}
        <button
          type="button"
          onClick={() => {
            setFileError(null);
            if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
              setIsLiveCameraOpen(true);
            } else {
              cameraInputRef.current?.click();
            }
          }}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-[#059669] hover:bg-[#047857] text-white transition-colors touch-target cursor-pointer"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-sm">Snap Photo with Camera</div>
              <div className="text-xs text-emerald-50/90 mt-0.5">
                Multi-page optical capture with glare and blur check
              </div>
            </div>
          </div>
          <span className="text-xs font-mono font-medium px-2 py-1 rounded-md bg-white/15 text-white shrink-0">
            CAM
          </span>
        </button>

        {/* Primary Action 2: Document / PDF Upload & Drag-and-drop */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`border border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors touch-target ${
            isDragging
              ? 'border-[#059669] bg-[#ECFDF5]'
              : 'border-[#D4D4D8] bg-[#FAFAFA] hover:border-[#059669] hover:bg-[#F4F4F5]/60'
          }`}
        >
          <div className="w-9 h-9 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] flex items-center justify-center mx-auto mb-2 text-[#52525B]">
            <Upload className="w-4 h-4" />
          </div>
          <div className="text-xs font-semibold text-[#09090B]">
            Upload PDF or Certificate Scan
          </div>
          <p className="text-xs text-[#52525B] mt-1">
            Browse files or drop here (PDF, PNG, JPEG, WEBP up to 10 MB)
          </p>
        </div>

        {/* Primary Action 3: WhatsApp & Email Intake */}
        <button
          type="button"
          onClick={() => setIsIntakeModalOpen(true)}
          className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#FFFFFF] hover:bg-[#FAFAFA] border border-[#E4E4E7] hover:border-[#D4D4D8] text-left transition-colors touch-target cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#ECFDF5] border border-emerald-200 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-[#059669]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#09090B]">
                  Send via WhatsApp or Email
                </span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-500/15 text-[#047857] border border-emerald-500/25">
                  P3 INTAKE
                </span>
              </div>
              <div className="text-xs text-[#52525B] font-mono mt-0.5">
                +91 98300 22000 · Inbound Plant Mailbox
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#047857] shrink-0">
            <span>Configure</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </button>

        {/* Quick-Load Sample Presets */}
        <div className="pt-3 border-t border-[#E4E4E7] space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#52525B]">Load a sample mill certificate</span>
            <span className="font-mono text-[#047857]">EN 10204 3.1</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SIMULATOR_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  onSelectPreset(preset.id);
                  onClose();
                }}
                className="p-3 rounded-lg border border-[#E4E4E7] hover:border-[#059669] bg-[#FFFFFF] hover:bg-[#FAFAFA] text-left transition-colors touch-target cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#09090B]">
                    <FileText className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                    <span className="truncate">{preset.mill || preset.title}</span>
                  </div>
                  <div className="text-xs font-mono text-[#52525B] mt-1">
                    Heat #{preset.heatNumber}
                  </div>
                </div>
                <div className="text-xs font-mono text-[#047857] font-medium mt-2">
                  {preset.code}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Byte-Identical Preservation Notice */}
        <div className="flex items-center gap-2 text-xs text-[#52525B] pt-1">
          <ShieldCheck className="w-4 h-4 text-[#059669] shrink-0" />
          <span>Byte-identical original preservation with tamper-evident SHA-256 digest.</span>
        </div>
      </div>

      {/* Live Viewfinder Modal */}
      <CameraCaptureModal
        isOpen={isLiveCameraOpen}
        onClose={() => setIsLiveCameraOpen(false)}
        onCaptureComplete={(files) => {
          if (files.length > 0) {
            onSelectFile(files[0]);
            onClose();
          }
        }}
      />

      {/* WhatsApp & Email Intake Configuration Modal */}
      {isIntakeModalOpen && (
        <IntakeConfigModal
          isOpen={isIntakeModalOpen}
          onClose={() => setIsIntakeModalOpen(false)}
        />
      )}
    </ResponsiveSheet>
  );
};
