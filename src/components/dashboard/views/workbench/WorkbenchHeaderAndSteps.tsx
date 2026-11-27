import React from 'react';
import { ArrowRight, Camera, Check, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { SimulatorPreset } from '../../../../types';

interface WorkbenchHeaderAndStepsProps {
  selectedPreset: SimulatorPreset;
  selectedPresetIndex: number;
  totalPresets: number;
  currentStep: 1 | 2 | 3 | 4;
  onPrevPreset: () => void;
  onNextPreset: () => void;
  onStepChange: (step: 1 | 2 | 3 | 4) => void;
}

export const WorkbenchHeaderAndSteps: React.FC<WorkbenchHeaderAndStepsProps> = ({
  selectedPreset,
  selectedPresetIndex,
  totalPresets,
  currentStep,
  onPrevPreset,
  onNextPreset,
  onStepChange,
}) => (
  <>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
      <div>
        <h1 className="text-lg sm:text-xl font-medium text-[#18181A] tracking-[-0.02em]">
          EN 10204 3.1 Certificate Review Workbench
        </h1>
        <p className="text-xs text-[#55544E] mt-0.5">
          PyMuPDF word bounds active · Byte-identical original preservation (EN 10204 Clause 6)
        </p>
        <div className="sr-only">
          <span>Manufacturer Mill: {selectedPreset.mill}</span>
          <span>Heat / Cast Number: {selectedPreset.heatNumber}</span>
          <span>Country of Melt &amp; Pour: {selectedPreset.meltCountry}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous Certificate"
          onClick={onPrevPreset}
          className="h-9 px-3 rounded-lg border border-[#18181A]/12 bg-[#FCFBF8] text-xs font-medium hover:bg-[#EFECE5] text-[#18181A] inline-flex items-center gap-1 cursor-pointer transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
          <span>Previous</span>
        </button>
        <span className="text-xs font-mono tabular-nums font-medium text-[#55544E] px-1">
          {selectedPresetIndex + 1} / {totalPresets}
        </span>
        <button
          type="button"
          aria-label="Next Certificate"
          onClick={onNextPreset}
          className="h-9 px-3 rounded-lg border border-[#18181A]/12 bg-[#FCFBF8] text-xs font-medium hover:bg-[#EFECE5] text-[#18181A] inline-flex items-center gap-1 cursor-pointer transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]"
        >
          <span>Next Certificate</span>
          <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>

    <div
      className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-3 mb-4"
      role="navigation"
      aria-label="Progress"
    >
      <div className="flex items-center justify-between max-w-xl mx-auto gap-2 overflow-x-auto">
        {[
          { step: 1, label: '1. Upload' },
          { step: 2, label: '2. Review' },
          { step: 3, label: '3. Add to Shipment' },
          { step: 4, label: '4. Download Pack' },
        ].map((item) => (
          <button
            key={item.step}
            type="button"
            onClick={() => onStepChange(item.step as 1 | 2 | 3 | 4)}
            className={`flex items-center gap-1.5 text-xs whitespace-nowrap cursor-pointer transition-colors duration-150 pb-1 border-b-2 ${
              currentStep === item.step
                ? 'text-[#047857] font-medium border-[#059669]'
                : currentStep > item.step
                  ? 'text-[#059669] font-medium border-transparent'
                  : 'text-[#78766E] border-transparent hover:text-[#18181A]'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-mono tabular-nums font-medium ${
                currentStep === item.step
                  ? 'bg-[#059669] text-white'
                  : currentStep > item.step
                    ? 'bg-[#ECFDF5] border border-emerald-200 text-[#047857]'
                    : 'bg-[#EFECE5] text-[#55544E]'
              }`}
            >
              {currentStep > item.step ? <Check className="w-3.5 h-3.5" strokeWidth={2} /> : item.step}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  </>
);

interface WorkbenchStep1UploadProps {
  onTriggerFilePicker: () => void;
  onUseSampleMtc: () => void;
}

export const WorkbenchStep1Upload: React.FC<WorkbenchStep1UploadProps> = ({
  onTriggerFilePicker,
  onUseSampleMtc,
}) => (
  <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-6 sm:p-8 text-center space-y-6 max-w-2xl mx-auto">
    <div>
      <h2 className="text-lg font-medium text-[#18181A] tracking-[-0.01em]">
        Step 1: Upload Inspection Certificate
      </h2>
      <p className="text-xs text-[#55544E] mt-1">
        Drag and drop an EN 10204 3.1 mill certificate or capture a clear photo with your phone
        camera.
      </p>
    </div>

    <div
      onClick={onTriggerFilePicker}
      className="border border-dashed border-[#18181A]/25 hover:border-[#059669] rounded-xl p-10 flex flex-col items-center justify-center gap-3 bg-[#F7F5F0] cursor-pointer transition-colors duration-150"
    >
      <div className="w-12 h-12 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-[#047857] flex items-center justify-center">
        <Upload className="w-5 h-5" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-medium text-[#18181A]">Drop MTC here or tap to browse</p>
        <p className="text-xs text-[#55544E] mt-1">Accepted: PDF, PNG, JPG (up to 25 MB)</p>
      </div>
    </div>

    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
      <button
        type="button"
        onClick={onTriggerFilePicker}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#18181A] text-[#FCFBF8] text-xs font-medium hover:bg-[#2C2D32] cursor-pointer transition-colors duration-150"
      >
        <Camera className="w-4 h-4" strokeWidth={1.5} />
        <span>Camera Capture</span>
      </button>
      <button
        type="button"
        onClick={onUseSampleMtc}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#ECFDF5] border border-emerald-200 text-[#047857] text-xs font-medium hover:bg-emerald-100/70 cursor-pointer transition-colors duration-150"
      >
        <span>Use Sample MTC (Auto-Demo)</span>
        <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </div>
  </div>
);
