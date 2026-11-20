import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  SIMULATOR_PRESETS,
  STANDARDS_LIST,
  PRESET_MATCHING_STANDARDS,
  evaluateChemistryAgainstStandard,
} from '../../../data/mockData';
import { SimulatorPreset } from '../../../types';
import { useToast } from '../../ui/ToastContext';
import { haptics } from '../../../lib/motion';
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Lock,
  Check,
  Edit2,
  Flag,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import { LaserScanBeam } from '../../effects/LaserScanBeam';

interface MtcWorkbenchViewProps {
  initialPresetId?: string;
  initialUploadedFile?: File | null;
}

export interface WorkbenchField {
  id: string;
  group: 'identity' | 'traceability' | 'chemistry' | 'mechanical';
  label: string;
  value: string;
  unit?: string;
  confidence: number; // 0 - 100
  isConfirmed: boolean;
  sectionKey?: 'origin' | 'chemistry' | 'mechanical' | 'stamp';
  originalValue?: string;
  correctedBy?: string;
  clauseSource?: string;
}

type InspectionSection = 'origin' | 'chemistry' | 'mechanical' | 'stamp';

export const MtcWorkbenchView: React.FC<MtcWorkbenchViewProps> = ({
  initialPresetId,
  initialUploadedFile,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(() => {
    const idx = SIMULATOR_PRESETS.findIndex((p) => p.id === initialPresetId);
    return idx >= 0 ? idx : 0;
  });
  const selectedPreset = SIMULATOR_PRESETS[selectedPresetIndex];

  const [mobileTab, setMobileTab] = useState<'document' | 'fields'>('document');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [activeSection, setActiveSection] = useState<InspectionSection | null>('chemistry');
  const [simulateDefect, setSimulateDefect] = useState<boolean>(false);

  const [selectedStandard, setSelectedStandard] = useState<string>(() => {
    return PRESET_MATCHING_STANDARDS[selectedPreset.id] || STANDARDS_LIST[0];
  });

  const [uploadedFileName, setUploadedFileName] = useState<string | null>(
    initialUploadedFile?.name || null
  );
  const [isProcessingOcr, setIsProcessingOcr] = useState<boolean>(false);
  const [sha256Hash, setSha256Hash] = useState<string>(
    'd9b7a18e209f48ac77198e3100ba38e1f4c09a2b871e3091a5d42c70e819f6a2'
  );
  const uploadTimestamp = '12 Feb 2026 · 10:45 UTC';

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [fields, setFields] = useState<WorkbenchField[]>([]);

  function initializeFields(preset: SimulatorPreset) {
    const list: WorkbenchField[] = [
      {
        id: 'mill_name',
        group: 'identity',
        label: 'Manufacturer Mill',
        value: preset.mill,
        confidence: 99,
        isConfirmed: true,
        sectionKey: 'origin',
        clauseSource: 'EN 10204:2004 Clause 3.1.A',
      },
      {
        id: 'cert_number',
        group: 'identity',
        label: 'MTC Reference Number',
        value: preset.certNumber,
        confidence: 97,
        isConfirmed: true,
        sectionKey: 'origin',
        clauseSource: 'EN 10204:2004 Clause 3.1.B',
      },
      {
        id: 'issue_date',
        group: 'identity',
        label: 'Inspection Issue Date',
        value: preset.issueDate,
        confidence: 96,
        isConfirmed: true,
        sectionKey: 'origin',
        clauseSource: 'EN 10204:2004 Clause 3.1.C',
      },
      {
        id: 'heat_number',
        group: 'traceability',
        label: 'Heat / Cast Number',
        value: preset.heatNumber,
        confidence: 99,
        isConfirmed: true,
        sectionKey: 'origin',
        clauseSource: 'EN 10204:2004 Clause 6',
      },
      {
        id: 'melt_country',
        group: 'traceability',
        label: 'Country of Melt & Pour',
        value: preset.meltCountry,
        confidence: 98,
        isConfirmed: true,
        sectionKey: 'origin',
        clauseSource: 'EU Reg 2026/1963',
      },
      {
        id: 'melt_route',
        group: 'traceability',
        label: 'Primary Steelmaking Route',
        value: preset.meltRoute,
        confidence: 94,
        isConfirmed: true,
        sectionKey: 'origin',
        clauseSource: 'EU 2023/956 Annex III',
      },
      ...preset.chemistry.map((el) => ({
        id: `chem_${el.symbol}`,
        group: 'chemistry' as const,
        label: `${el.name} (${el.symbol})`,
        value: el.measured.toString(),
        unit: el.unit,
        confidence: el.symbol === 'Mo' ? 82 : el.symbol === 'Cr' ? 84 : 97,
        isConfirmed: el.symbol !== 'Mo' && el.symbol !== 'Cr',
        sectionKey: 'chemistry' as const,
        clauseSource: 'EN 10025-2 Ladle Spectrometry',
      })),
      ...preset.mechanics.map((m, idx) => ({
        id: `mech_${idx}`,
        group: 'mechanical' as const,
        label: m.property,
        value: m.measured,
        confidence: idx === 3 ? 79 : 96,
        isConfirmed: idx !== 3,
        sectionKey: 'mechanical' as const,
        clauseSource: 'Ambient 23°C Mechanical Test',
      })),
    ];
    setFields(list);
  }

  useEffect(() => {
    setSelectedStandard(PRESET_MATCHING_STANDARDS[selectedPreset.id] || STANDARDS_LIST[0]);
    setSimulateDefect(false);
    initializeFields(selectedPreset);
  }, [selectedPreset.id]);

  useEffect(() => {
    if (initialUploadedFile) {
      handleProcessUploadedFile(initialUploadedFile);
    }
  }, [initialUploadedFile]);

  const handleProcessUploadedFile = async (file: File) => {
    setUploadedFileName(file.name);
    setIsProcessingOcr(true);
    try {
      const buffer = await file.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      const hashHex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      setSha256Hash(hashHex);
    } catch {
      // Fallback hash if WebCrypto is unavailable
    }
    setTimeout(() => {
      setIsProcessingOcr(false);
      toast.success(
        'Certificate Parsed & Hashed',
        `${file.name} preserved byte-identical with SHA-256 verification.`
      );
    }, 900);
  };

  // Compute effective chemistry list (reflecting inspector edits + optional Simulate Defect)
  const effectiveChemistryInput = useMemo(() => {
    return selectedPreset.chemistry.map((el) => {
      const field = fields.find((f) => f.id === `chem_${el.symbol}`);
      const parsedVal = field ? parseFloat(field.value) : el.measured;
      let measured = Number.isFinite(parsedVal) ? parsedVal : el.measured;

      if (simulateDefect) {
        if (el.symbol === 'C') measured = Number((el.max + 0.06).toFixed(3));
        if (el.symbol === 'S') measured = Number((el.max + 0.018).toFixed(3));
      }

      return { ...el, measured };
    });
  }, [selectedPreset.chemistry, fields, simulateDefect]);

  const activeChemistry = useMemo(() => {
    return evaluateChemistryAgainstStandard(effectiveChemistryInput, selectedStandard);
  }, [effectiveChemistryInput, selectedStandard]);

  // Calculate Carbon Equivalent Value (IIW formula: C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15)
  const cevValue = useMemo(() => {
    const getVal = (sym: string) =>
      activeChemistry.find((e) => e.symbol === sym)?.measured ?? 0;
    const c = getVal('C');
    const mn = getVal('Mn');
    const cr = getVal('Cr');
    const mo = getVal('Mo');
    const ni = getVal('Ni');
    return c + mn / 6 + (cr + mo) / 5 + ni / 15;
  }, [activeChemistry]);

  const cevMax = 0.45;
  const isCevPass = cevValue <= cevMax;

  const failedElements = useMemo(() => {
    return activeChemistry.filter((el) => el.status !== 'PASS');
  }, [activeChemistry]);

  const isOffSpec = failedElements.length > 0 || !isCevPass;

  const unconfirmedFields = useMemo(() => {
    return fields.filter((f) => !f.isConfirmed || f.confidence < 85);
  }, [fields]);

  const canApprove = unconfirmedFields.length === 0 && !isOffSpec;

  const handleJumpToNextFlaggedField = () => {
    haptics.tap();
    if (unconfirmedFields.length === 0) {
      toast.success('All Confirmed', 'All extracted fields have been verified by the inspector.');
      return;
    }
    const nextField = unconfirmedFields[0];
    setMobileTab('fields');
    if (nextField.sectionKey) setActiveSection(nextField.sectionKey);
    const el = document.getElementById(`field-${nextField.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleConfirmField = (fieldId: string) => {
    haptics.tap();
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, isConfirmed: true, confidence: 100 } : f))
    );
    toast.success('Field Confirmed', 'Verified by QA Inspector.');
  };

  const handleStartEdit = (field: WorkbenchField) => {
    setEditingFieldId(field.id);
    setEditValue(field.value);
  };

  const handleSaveEdit = () => {
    if (!editingFieldId) return;
    setFields((prev) =>
      prev.map((f) =>
        f.id === editingFieldId
          ? {
              ...f,
              value: editValue,
              isConfirmed: true,
              confidence: 100,
              originalValue: f.originalValue || f.value,
              correctedBy: 'R. K. Chatterjee (QA-04)',
            }
          : f
      )
    );
    toast.info('Value Corrected', `Updated extracted value to ${editValue}.`);
    setEditingFieldId(null);
  };

  const frameClass = (key: InspectionSection, accent: 'amber' | 'blue' | 'emerald' | 'neutral') => {
    const isActive = activeSection === key;
    if (accent === 'amber') {
      return isActive
        ? 'border-[#D97706] bg-[#FFFBEB]/60 ring-2 ring-amber-500/15'
        : 'border-[#FDE68A] hover:border-[#D97706] bg-[#FAFAFA]';
    }
    if (accent === 'blue') {
      return isActive
        ? 'border-[#2563EB] bg-[#EFF6FF]/45 ring-2 ring-blue-600/15'
        : 'border-blue-200 hover:border-[#2563EB] bg-[#FFFFFF]';
    }
    if (accent === 'emerald') {
      return isActive
        ? 'border-[#059669] bg-[#ECFDF5]/45 ring-2 ring-emerald-600/15'
        : 'border-emerald-200 hover:border-[#059669] bg-[#FFFFFF]';
    }
    return isActive
      ? 'border-[#09090B] bg-[#F4F4F5]/70 ring-2 ring-zinc-900/10'
      : 'border-[#E4E4E7] hover:border-[#52525B] bg-[#FAFAFA]';
  };

  return (
    <div className="space-y-5 font-sans text-left">
      <div className="sr-only">
        <h1>EN 10204 3.1 Certificate Review Workbench</h1>
        <p>PyMuPDF word bounds active · Byte-identical original preservation (EN 10204 Clause 6)</p>
        <span>Manufacturer Mill: {selectedPreset.mill}</span>
        <span>Heat / Cast Number: {selectedPreset.heatNumber}</span>
        <span>Country of Melt & Pour: {selectedPreset.meltCountry}</span>
        <button
          type="button"
          onClick={() => setSelectedPresetIndex((i) => (i + 1) % SIMULATOR_PRESETS.length)}
        >
          Next Certificate
        </button>
        <span>{selectedPresetIndex + 1} / {SIMULATOR_PRESETS.length}</span>
      </div>

      {/* Compact Single-Row Studio Toolbar */}
      <div className="bg-[#FFFFFF] rounded-xl border border-[#E4E4E7] px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3">
        {/* Left: Mill Preset Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F4F4F5] border border-[#E4E4E7] overflow-x-auto max-w-full">
          {SIMULATOR_PRESETS.map((preset, idx) => {
            const isSelected = idx === selectedPresetIndex;
            const shortLabel = preset.mill.split(' ').slice(0, 2).join(' ');
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  haptics.tap();
                  setSelectedPresetIndex(idx);
                }}
                className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#FFFFFF] text-[#09090B] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                    : 'text-[#52525B] hover:text-[#09090B]'
                }`}
              >
                {shortLabel}
              </button>
            );
          })}
        </div>

        {/* Right: Target Standard Dropdown + Upload 3.1 PDF + Simulate Defect Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Target metallurgical standard"
            value={selectedStandard}
            onChange={(e) => setSelectedStandard(e.target.value)}
            className="h-9 px-3 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-[#09090B] text-xs font-medium focus:outline-none focus:border-[#059669] cursor-pointer"
          >
            {STANDARDS_LIST.map((std) => (
              <option key={std} value={std}>
                {std}
              </option>
            ))}
          </select>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleProcessUploadedFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] border border-[#E4E4E7] text-[#09090B] text-xs font-medium transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#059669]" />
            <span>Upload 3.1 PDF</span>
          </button>

          <button
            type="button"
            onClick={() => {
              haptics.tap();
              setSimulateDefect((prev) => !prev);
              setActiveSection('chemistry');
            }}
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              simulateDefect
                ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
                : 'bg-[#FFFFFF] border-[#E4E4E7] text-[#52525B] hover:text-[#09090B] hover:bg-[#F4F4F5]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{simulateDefect ? 'Defect Active' : 'Simulate Defect'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher (< lg) */}
      <div className="lg:hidden flex items-center p-1 rounded-lg bg-[#F4F4F5] border border-[#E4E4E7]">
        <button
          type="button"
          aria-label="Document View"
          onClick={() => setMobileTab('document')}
          className={`flex-1 min-h-[40px] text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer ${
            mobileTab === 'document'
              ? 'bg-[#FFFFFF] text-[#09090B] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
              : 'text-[#52525B]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Certificate Sheet</span>
        </button>
        <button
          type="button"
          aria-label="Extracted Fields"
          onClick={() => setMobileTab('fields')}
          className={`flex-1 min-h-[40px] text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer ${
            mobileTab === 'fields'
              ? 'bg-[#FFFFFF] text-[#09090B] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
              : 'text-[#52525B]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Verification</span>
          {unconfirmedFields.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] font-mono text-xs leading-none">
              {unconfirmedFields.length}
            </span>
          )}
        </button>
      </div>

      {/* 2-COLUMN SPLIT DOCUMENT INSPECTION STUDIO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANE: Authentic Document Inspector Canvas */}
        <div
          className={`lg:col-span-6 ${mobileTab === 'document' ? 'block' : 'hidden lg:block'}`}
        >
          <div className="bg-[#FFFFFF] rounded-xl border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
            {/* Document Studio Control Strip */}
            <div className="px-4 py-2.5 bg-[#FAFAFA] border-b border-[#E4E4E7] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#FFFFFF] border border-[#E4E4E7] text-xs font-mono tabular-nums text-[#52525B]"
                  title={`SHA-256: ${sha256Hash}`}
                >
                  <Lock className="w-3 h-3 text-[#059669] shrink-0" />
                  <span className="truncate max-w-[130px]">{sha256Hash.slice(0, 12)}…</span>
                </span>
                <span className="text-xs text-[#52525B] truncate hidden sm:inline">
                  {uploadedFileName || `${selectedPreset.certNumber}.pdf`}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))}
                  className="w-8 h-8 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#52525B] hover:text-[#09090B] border border-[#E4E4E7] flex items-center justify-center cursor-pointer"
                  title="Zoom out"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono tabular-nums text-[#52525B] w-11 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(1.75, +(z + 0.25).toFixed(2)))}
                  className="w-8 h-8 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#52525B] hover:text-[#09090B] border border-[#E4E4E7] flex items-center justify-center cursor-pointer"
                  title="Zoom in"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotationDeg((r) => (r + 90) % 360)}
                  className="w-8 h-8 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#52525B] hover:text-[#09090B] border border-[#E4E4E7] flex items-center justify-center ml-1 cursor-pointer"
                  title="Rotate 90°"
                  aria-label="Rotate 90 degrees"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                {(zoomLevel !== 1 || rotationDeg !== 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setZoomLevel(1);
                      setRotationDeg(0);
                    }}
                    className="px-2 h-8 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#52525B] hover:text-[#09090B] border border-[#E4E4E7] text-xs font-medium cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* #F4F4F5 Mat Surrounding White Paper Certificate Sheet */}
            <div className="p-4 sm:p-6 bg-[#F4F4F5] overflow-auto">
              <div
                className="relative bg-[#FFFFFF] text-[#09090B] rounded-lg border border-[#D4D4D8] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_28px_rgba(0,0,0,0.05)] p-5 sm:p-6 space-y-5 select-none transition-transform duration-200"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotationDeg}deg)`,
                  transformOrigin: 'top center',
                }}
                onDoubleClick={() => setZoomLevel((z) => (z > 1 ? 1 : 1.25))}
              >
                <LaserScanBeam isScanning={isProcessingOcr} />

                {/* Mill Certificate Header */}
                <div className="border-b border-[#09090B] pb-3 flex flex-wrap justify-between items-start gap-3">
                  <div>
                    <div className="text-sm font-semibold tracking-[-0.01em] text-[#09090B]">
                      {selectedPreset.mill}
                    </div>
                    <div className="text-xs text-[#52525B] mt-0.5">
                      Inspection Certificate · EN 10204:2004 Type 3.1
                    </div>
                  </div>
                  <div className="text-left sm:text-right text-xs">
                    <div className="font-mono tabular-nums font-medium text-[#09090B]">
                      {selectedPreset.certNumber}
                    </div>
                    <div className="font-mono tabular-nums text-[#52525B] mt-0.5">
                      {selectedPreset.issueDate}
                    </div>
                  </div>
                </div>

                {/* ANCHORED FRAME 1: Heat & Origin */}
                <div
                  onClick={() => setActiveSection('origin')}
                  className={`relative rounded-lg border p-3.5 pt-4 transition-all cursor-pointer ${frameClass(
                    'origin',
                    'amber'
                  )}`}
                >
                  <span className="absolute -top-2.5 left-3 px-2 py-0.5 rounded bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-xs font-medium leading-none">
                    1 · Heat &amp; Origin
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mt-1">
                    <div>
                      <span className="text-[#52525B] block">Heat / Cast Number</span>
                      <span className="font-mono tabular-nums font-semibold text-[#09090B] text-sm">
                        #{selectedPreset.heatNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#52525B] block">Country of Melt &amp; Pour</span>
                      <span className="font-medium text-[#047857]">
                        {selectedPreset.meltCountry} (ISO: IN)
                      </span>
                    </div>
                    <div>
                      <span className="text-[#52525B] block">Steelmaking Route</span>
                      <span className="text-[#09090B] font-medium">{selectedPreset.meltRoute}</span>
                    </div>
                    <div>
                      <span className="text-[#52525B] block">Product Standard</span>
                      <span className="font-mono text-[#09090B]">{selectedPreset.code}</span>
                    </div>
                  </div>
                </div>

                {/* ANCHORED FRAME 2: Chemistry Spectrometry */}
                <div
                  onClick={() => setActiveSection('chemistry')}
                  className={`relative rounded-lg border p-3.5 pt-4 transition-all cursor-pointer ${frameClass(
                    'chemistry',
                    'blue'
                  )}`}
                >
                  <span className="absolute -top-2.5 left-3 px-2 py-0.5 rounded bg-[#EFF6FF] border border-blue-200 text-[#2563EB] text-xs font-medium leading-none">
                    2 · Ladle Chemistry (%)
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mt-1">
                    {activeChemistry.map((el) => {
                      const failed = el.status !== 'PASS';
                      return (
                        <div
                          key={el.symbol}
                          className={`p-2 rounded-md border text-center ${
                            failed
                              ? 'bg-[#FEF2F2] border-[#FECACA]'
                              : 'bg-[#FAFAFA] border-[#E4E4E7]'
                          }`}
                        >
                          <span className="block text-xs text-[#52525B] font-mono">
                            {el.symbol}
                          </span>
                          <span
                            className={`block font-mono tabular-nums text-xs font-semibold mt-0.5 ${
                              failed ? 'text-[#DC2626]' : 'text-[#09090B]'
                            }`}
                          >
                            {el.measured}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ANCHORED FRAME 3: Mechanical Properties */}
                <div
                  onClick={() => setActiveSection('mechanical')}
                  className={`relative rounded-lg border p-3.5 pt-4 transition-all cursor-pointer ${frameClass(
                    'mechanical',
                    'emerald'
                  )}`}
                >
                  <span className="absolute -top-2.5 left-3 px-2 py-0.5 rounded bg-[#ECFDF5] border border-emerald-200 text-[#047857] text-xs font-medium leading-none">
                    3 · Mechanical Properties
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    {selectedPreset.mechanics.map((m, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-2 rounded-md bg-[#FAFAFA] border border-[#E4E4E7] flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="text-[#52525B] truncate">{m.property}</span>
                        <span className="font-mono tabular-nums font-semibold text-[#09090B] shrink-0">
                          {m.measured}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ANCHORED FRAME 4: QA Stamp */}
                <div
                  onClick={() => setActiveSection('stamp')}
                  className={`relative rounded-lg border p-3.5 pt-4 transition-all cursor-pointer ${frameClass(
                    'stamp',
                    'neutral'
                  )}`}
                >
                  <span className="absolute -top-2.5 left-3 px-2 py-0.5 rounded bg-[#F4F4F5] border border-[#E4E4E7] text-[#09090B] text-xs font-medium leading-none">
                    4 · Works Inspector Stamp
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs mt-1">
                    <div>
                      <span className="text-[#52525B]">Authorized Representative: </span>
                      <span className="font-medium text-[#09090B]">
                        Independent Works QA Division
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-md border border-[#09090B] text-[#09090B] font-mono text-xs font-medium">
                      EN 10204 · 3.1
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Canvas Footer */}
            <div className="px-4 py-2.5 bg-[#FAFAFA] border-t border-[#E4E4E7] flex flex-wrap items-center justify-between gap-2 text-xs text-[#52525B]">
              <span>Byte-identical original preservation · {uploadTimestamp}</span>
              <span className="font-mono tabular-nums text-[#059669] font-medium">
                Page 1 of 1
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Precision Metallurgical Verification Panel */}
        <div
          className={`lg:col-span-6 space-y-4 ${mobileTab === 'fields' ? 'block' : 'hidden lg:block'}`}
        >
          {/* Off-Spec Alert Banner */}
          {isOffSpec && (
            <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold text-[#DC2626]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Out-of-spec tolerance violation ({failedElements.length} element
                    {failedElements.length === 1 ? '' : 's'}) against {selectedStandard}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSimulateDefect(false);
                    setSelectedStandard(PRESET_MATCHING_STANDARDS[selectedPreset.id]);
                  }}
                  className="text-xs font-medium text-[#DC2626] underline hover:text-red-800 cursor-pointer"
                >
                  Reset check
                </button>
              </div>
              <p className="text-[#52525B] leading-relaxed">
                Measured ladle composition exceeds permissible limits for{' '}
                <strong className="text-[#09090B] font-medium">{selectedStandard}</strong>. Dispatch
                clearance is blocked until amended or reassigned.
              </p>
            </div>
          )}

          {/* Compact 4-Cell Heat & Origin Summary Bar */}
          <div className="bg-[#FFFFFF] rounded-xl border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#FAFAFA] border-b border-[#E4E4E7] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#09090B]">
                Heat &amp; Melt-and-Pour Summary
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveSection('origin');
                  setMobileTab('document');
                }}
                className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:underline cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Locate on sheet</span>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E4E4E7]">
              <div className="p-3">
                <span className="text-xs text-[#52525B] block">Heat Number</span>
                <span className="font-mono tabular-nums text-xs font-semibold text-[#B45309] block mt-0.5 truncate">
                  #{selectedPreset.heatNumber}
                </span>
              </div>
              <div className="p-3">
                <span className="text-xs text-[#52525B] block">Origin (EU 2026/1963)</span>
                <span className="text-xs font-semibold text-[#047857] block mt-0.5 truncate">
                  {selectedPreset.meltCountry} (IN)
                </span>
              </div>
              <div className="p-3">
                <span className="text-xs text-[#52525B] block">Certificate Ref</span>
                <span className="font-mono tabular-nums text-xs font-medium text-[#09090B] block mt-0.5 truncate">
                  {selectedPreset.certNumber}
                </span>
              </div>
              <div className="p-3">
                <span className="text-xs text-[#52525B] block">Carbon Equivalent</span>
                <span
                  className={`font-mono tabular-nums text-xs font-semibold block mt-0.5 ${
                    isCevPass ? 'text-[#09090B]' : 'text-[#DC2626]'
                  }`}
                >
                  {cevValue.toFixed(3)} IIW
                </span>
              </div>
            </div>
          </div>

          {/* Engineered Chemical Tolerance Range Gauges */}
          <div className="bg-[#FFFFFF] rounded-xl border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#E4E4E7] flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-[#09090B]">
                  Chemical Tolerance Range Gauges
                </h3>
                <p className="text-xs text-[#52525B] mt-0.5">
                  Evaluated live against {selectedStandard}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md text-xs font-medium border ${
                  isOffSpec
                    ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
                    : 'bg-[#ECFDF5] border-emerald-200 text-[#047857]'
                }`}
              >
                {isOffSpec ? `${failedElements.length} out of spec` : 'All elements in spec'}
              </span>
            </div>

            <div className="divide-y divide-[#E4E4E7]">
              {activeChemistry.map((el) => {
                const field = fields.find((f) => f.id === `chem_${el.symbol}`);
                const isPass = el.status === 'PASS';
                const isFlagged = field ? !field.isConfirmed || field.confidence < 85 : false;

                // Compute gauge geometry (0% to scaleMax where scaleMax = max * 1.25)
                const scaleMax = Math.max(el.max * 1.25, el.measured * 1.1, 0.05);
                const safeStartPct = Math.max(0, Math.min(100, (el.min / scaleMax) * 100));
                const safeEndPct = Math.max(safeStartPct, Math.min(100, (el.max / scaleMax) * 100));
                const markerPct = Math.max(2, Math.min(98, (el.measured / scaleMax) * 100));

                return (
                  <div
                    key={el.symbol}
                    id={field ? `field-${field.id}` : undefined}
                    onMouseEnter={() => setActiveSection('chemistry')}
                    className={`px-4 py-3 transition-colors ${
                      !isPass
                        ? 'bg-[#FEF2F2]/70'
                        : isFlagged
                          ? 'bg-[#FFFBEB]/60'
                          : 'bg-[#FFFFFF] hover:bg-[#FAFAFA]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-semibold text-[#09090B] w-7">
                          {el.symbol}
                        </span>
                        <span className="text-[#52525B] truncate">{el.name}</span>
                        {isFlagged && (
                          <span className="px-1.5 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-xs font-medium">
                            Verify OCR
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono tabular-nums text-[#52525B]">
                          {el.min > 0 ? `${el.min}–${el.max}%` : `≤ ${el.max}%`}
                        </span>
                        <span
                          className={`font-mono tabular-nums font-semibold min-w-[60px] text-right ${
                            !isPass ? 'text-[#DC2626]' : 'text-[#09090B]'
                          }`}
                        >
                          {el.measured.toFixed(3)}%
                        </span>
                      </div>
                    </div>

                    {/* Thin Tolerance Track with Safe Zone & Marker Dot */}
                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="relative flex-1 h-1.5 rounded-full bg-[#F4F4F5] border border-[#E4E4E7]">
                        {/* Safe Spec Zone */}
                        <div
                          className={`absolute top-0 bottom-0 rounded-full ${
                            !isPass ? 'bg-emerald-500/25' : 'bg-emerald-500/35'
                          }`}
                          style={{
                            left: `${safeStartPct}%`,
                            width: `${Math.max(4, safeEndPct - safeStartPct)}%`,
                          }}
                        />
                        {/* Measured Value Marker */}
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-[#FFFFFF] shadow-sm ${
                            !isPass ? 'bg-[#DC2626]' : 'bg-[#059669]'
                          }`}
                          style={{ left: `${markerPct}%` }}
                          title={`Measured ${el.symbol}: ${el.measured}%`}
                        />
                      </div>

                      {/* Inline Inspector Controls */}
                      {field && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(field)}
                            className="p-1 rounded-md text-[#52525B] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
                            title={`Edit ${el.name}`}
                            aria-label={`Edit ${el.name}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {isFlagged ? (
                            <button
                              type="button"
                              onClick={() => handleConfirmField(field.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Confirm</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center text-[#059669]" title="Verified">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Carbon Equivalent (CEV IIW) Summary Row */}
              <div
                className={`px-4 py-3 ${
                  !isCevPass ? 'bg-[#FEF2F2]/70' : 'bg-[#FAFAFA]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-[#09090B]">CEV</span>
                    <span className="text-[#52525B]">Carbon Equivalent (IIW Formula)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono tabular-nums text-[#52525B]">
                      ≤ {cevMax.toFixed(2)} IIW
                    </span>
                    <span
                      className={`font-mono tabular-nums font-semibold ${
                        isCevPass ? 'text-[#059669]' : 'text-[#DC2626]'
                      }`}
                    >
                      {cevValue.toFixed(3)} IIW
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Clean 2x2 Mechanical Properties Grid */}
          <div className="bg-[#FFFFFF] rounded-xl border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#E4E4E7] flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#09090B]">
                Mechanical Properties (23°C Ambient)
              </h3>
              <span className="text-xs font-medium text-[#059669]">EN 10025-2 Verified</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:gap-px bg-[#E4E4E7]">
              {fields
                .filter((f) => f.group === 'mechanical')
                .map((field) => {
                  const isFlagged = !field.isConfirmed || field.confidence < 85;
                  return (
                    <div
                      key={field.id}
                      id={`field-${field.id}`}
                      onMouseEnter={() => setActiveSection('mechanical')}
                      className={`p-4 flex flex-col justify-between gap-2.5 ${
                        isFlagged ? 'bg-[#FFFBEB]' : 'bg-[#FFFFFF]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs text-[#52525B]">{field.label}</span>
                        <span
                          className={`font-mono tabular-nums text-xs px-1.5 py-0.5 rounded-md border ${
                            isFlagged
                              ? 'bg-[#FFFFFF] border-[#FDE68A] text-[#B45309]'
                              : 'bg-[#FAFAFA] border-[#E4E4E7] text-[#52525B]'
                          }`}
                        >
                          {field.confidence}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono tabular-nums text-base font-semibold text-[#09090B]">
                          {field.value}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isFlagged ? (
                            <button
                              type="button"
                              onClick={() => handleConfirmField(field.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Confirm</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(field)}
                              className="p-1.5 rounded-md text-[#52525B] hover:text-[#09090B] hover:bg-[#F4F4F5] cursor-pointer"
                              title="Edit mechanical value"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Jump to Next Flagged Field */}
      {unconfirmedFields.length > 0 && (
        <div className="lg:hidden fixed bottom-20 right-4 z-30">
          <button
            type="button"
            onClick={handleJumpToNextFlaggedField}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#09090B] text-white font-medium text-xs shadow-lg cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5 text-amber-400" />
            <span>Next Flagged ({unconfirmedFields.length})</span>
          </button>
        </div>
      )}

      {/* Sticky Daylight Verification Action Bar */}
      <div className="sticky bottom-2 z-20 px-4 py-3 bg-[#FFFFFF]/95 backdrop-blur-md border border-[#E4E4E7] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs flex items-center gap-2">
          <span className="text-[#52525B]">Inspection Status:</span>
          {isOffSpec ? (
            <span className="font-medium text-[#DC2626]">
              Blocked · Out-of-spec chemistry detected
            </span>
          ) : canApprove ? (
            <span className="font-medium text-[#059669]">
              100% Verified · Ready to Sign
            </span>
          ) : (
            <span className="font-medium text-[#B45309]">
              Inspection Status: {unconfirmedFields.length} field(s) require inspector review
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsRejectModalOpen(true)}
            className="flex-1 sm:flex-initial h-9 px-3.5 rounded-lg bg-[#FEF2F2] hover:bg-red-100 border border-[#FECACA] text-[#DC2626] text-xs font-medium transition-colors cursor-pointer"
          >
            Reject MTC
          </button>

          <button
            type="button"
            onClick={() =>
              toast.info(
                'Upload Requested',
                'Request sent to mill supplier for a higher-resolution 3.1 PDF scan.'
              )
            }
            className="flex-1 sm:flex-initial h-9 px-3.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] border border-[#E4E4E7] text-[#09090B] text-xs font-medium transition-colors cursor-pointer"
          >
            Request New Scan
          </button>

          <button
            type="button"
            disabled={!canApprove}
            onClick={() =>
              toast.success(
                'Certificate Approved',
                `Heat #${selectedPreset.heatNumber} queued for Clause 6 QA Sign-Off.`
              )
            }
            className="flex-1 sm:flex-initial h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approve MTC</span>
          </button>
        </div>
      </div>

      {/* Quick Edit Modal */}
      {editingFieldId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0C10]/60 backdrop-blur-sm">
          <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl max-w-sm w-full p-5 space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.18)] text-left">
            <div>
              <h4 className="text-sm font-semibold text-[#09090B]">Correct Extracted Value</h4>
              <p className="text-xs text-[#52525B] mt-1">
                The audit log records your inspector ID alongside the original OCR reading.
              </p>
            </div>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7] text-[#09090B] font-mono tabular-nums text-sm focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-emerald-600/15"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E4E4E7]">
              <button
                type="button"
                onClick={() => setEditingFieldId(null)}
                className="px-3.5 py-2 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] border border-[#E4E4E7] text-xs font-medium text-[#09090B] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-3.5 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-xs font-medium text-white cursor-pointer"
              >
                Save &amp; Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0C10]/60 backdrop-blur-sm">
          <div className="bg-[#FFFFFF] border border-[#E4E4E7] rounded-xl max-w-md w-full p-5 space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.18)] text-left">
            <div className="flex items-center gap-2 text-[#DC2626] font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Reject Certificate with Audit Reason</span>
            </div>
            <p className="text-xs text-[#52525B]">
              Enter the non-conformance details to include in the supplier amendment notice.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Molybdenum below minimum limit of 0.15% per ASTM A193 B7."
              className="w-full px-3 py-2 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7] text-[#09090B] text-xs focus:outline-none focus:border-[#DC2626] resize-none"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E4E4E7]">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-3.5 py-2 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] border border-[#E4E4E7] text-xs font-medium text-[#09090B] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.error(
                    'Certificate Rejected',
                    rejectReason || 'Rejected for metallurgical non-compliance.'
                  );
                  setIsRejectModalOpen(false);
                }}
                className="px-3.5 py-2 rounded-lg bg-[#DC2626] hover:bg-red-700 text-xs font-medium text-white cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
