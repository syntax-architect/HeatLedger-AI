import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  STANDARDS_LIST,
  PRESET_MATCHING_STANDARDS,
  evaluateChemistryAgainstStandard,
} from '../../../lib/metallurgicalStandards';
import { SIMULATOR_PRESETS } from '../../../data/marketingSamples';
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
  ArrowRight,
  ArrowLeft,
  Camera,
  Download,
  ShieldCheck,
  Undo2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Scale,
} from 'lucide-react';
import { LaserScanBeam } from '../../effects/LaserScanBeam';
import { BuyerSpecCheckModal } from '../../compliance/BuyerSpecCheckModal';

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
  const [isBuyerSpecModalOpen, setIsBuyerSpecModalOpen] = useState<boolean>(false);

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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(2);
  const [isChemMechCollapsed, setIsChemMechCollapsed] = useState<boolean>(true);
  const [lastAction, setLastAction] = useState<{ fieldId: string; previousValue: string } | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<string>('SH-2026-0881');
  const [allocatedTonnes, setAllocatedTonnes] = useState<number>(24.5);
  const [inspectorTotp, setInspectorTotp] = useState<string>('');
  const [isSealed, setIsSealed] = useState<boolean>(false);

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
        id: 'grade',
        group: 'identity',
        label: 'Steel Grade',
        value: (preset as any).grade || preset.productType || '316L Stainless Steel',
        confidence: 98,
        isConfirmed: true,
        sectionKey: 'origin',
        clauseSource: 'EN 10088-3 Specification',
      },
      {
        id: 'product_form',
        group: 'identity',
        label: 'Product Form',
        value: 'Round Bar / Forged Ingot',
        confidence: 97,
        isConfirmed: true,
        sectionKey: 'origin',
        clauseSource: 'EN 10204 Clause 3.1.D',
      },
      {
        id: 'dimensions',
        group: 'identity',
        label: 'Dimensions / Size',
        value: 'Ø 140 mm × 6000 mm',
        confidence: 95,
        isConfirmed: true,
        sectionKey: 'origin',
        clauseSource: 'Dimensional Tolerance ISO 286',
      },
      {
        id: 'quantity_tonnes',
        group: 'traceability',
        label: 'Batch Quantity',
        value: '24.50 MT',
        confidence: 98,
        isConfirmed: true,
        sectionKey: 'origin',
        clauseSource: 'Mill Dispatch Weighbridge Tag',
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
    const oldField = fields.find((f) => f.id === editingFieldId);
    if (oldField) {
      setLastAction({ fieldId: editingFieldId, previousValue: oldField.value });
    }
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

  const handleUndo = () => {
    if (!lastAction) return;
    setFields((prev) =>
      prev.map((f) =>
        f.id === lastAction.fieldId ? { ...f, value: lastAction.previousValue } : f
      )
    );
    setLastAction(null);
    toast.info('Edit Reverted', 'Restored previous extracted value.');
  };

  const frameClass = (key: InspectionSection, accent: 'amber' | 'blue' | 'emerald' | 'neutral') => {
    const isActive = activeSection === key;
    if (accent === 'amber') {
      return isActive
        ? 'border-[#18181A] bg-[#F7F5F0]/80'
        : 'border-[#18181A]/15 hover:border-[#18181A]/40 bg-[#FCFBF8]';
    }
    if (accent === 'blue' || accent === 'emerald') {
      return isActive
        ? 'border-[#059669] bg-[#ECFDF5]/40'
        : 'border-[#18181A]/15 hover:border-[#059669]/60 bg-[#FFFFFF]';
    }
    return isActive
      ? 'border-[#18181A] bg-[#F7F5F0]/80'
      : 'border-[#18181A]/15 hover:border-[#18181A]/40 bg-[#FCFBF8]';
  };

  return (
    <div className="space-y-5 font-sans text-left">
      {/* 1. Header & Navigation Controls */}
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
            <span>Country of Melt & Pour: {selectedPreset.meltCountry}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous Certificate"
            onClick={() => {
              haptics.tap();
              setSelectedPresetIndex((prev) => (prev > 0 ? prev - 1 : SIMULATOR_PRESETS.length - 1));
            }}
            className="h-9 px-3 rounded-lg border border-[#18181A]/12 bg-[#FCFBF8] text-xs font-medium hover:bg-[#EFECE5] text-[#18181A] inline-flex items-center gap-1 cursor-pointer transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            <span>Previous</span>
          </button>
          <span className="text-xs font-mono tabular-nums font-medium text-[#55544E] px-1">
            {selectedPresetIndex + 1} / {SIMULATOR_PRESETS.length}
          </span>
          <button
            type="button"
            aria-label="Next Certificate"
            onClick={() => {
              haptics.tap();
              setSelectedPresetIndex((prev) => (prev < SIMULATOR_PRESETS.length - 1 ? prev + 1 : 0));
            }}
            className="h-9 px-3 rounded-lg border border-[#18181A]/12 bg-[#FCFBF8] text-xs font-medium hover:bg-[#EFECE5] text-[#18181A] inline-flex items-center gap-1 cursor-pointer transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]"
          >
            <span>Next Certificate</span>
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* 4-Step Linear Flow Stepper (Prompt M2: One Clear Flow) */}
      <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-3 mb-4" role="navigation" aria-label="Progress">
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
              onClick={() => setCurrentStep(item.step as 1 | 2 | 3 | 4)}
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

      {currentStep === 1 && (
        <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-6 sm:p-8 text-center space-y-6 max-w-2xl mx-auto">
          <div>
            <h2 className="text-lg font-medium text-[#18181A] tracking-[-0.01em]">
              Step 1: Upload Inspection Certificate
            </h2>
            <p className="text-xs text-[#55544E] mt-1">
              Drag and drop an EN 10204 3.1 mill certificate or capture a clear photo with your phone camera.
            </p>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
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
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#18181A] text-[#FCFBF8] text-xs font-medium hover:bg-[#2C2D32] cursor-pointer transition-colors duration-150"
            >
              <Camera className="w-4 h-4" strokeWidth={1.5} />
              <span>Camera Capture</span>
            </button>
            <button
              type="button"
              onClick={() => {
                toast.success('Sample MTC Loaded', 'Loaded Howrah Precision Forgings test certificate.');
                setCurrentStep(2);
              }}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#ECFDF5] border border-emerald-200 text-[#047857] text-xs font-medium hover:bg-emerald-100/70 cursor-pointer transition-colors duration-150"
            >
              <span>Use Sample MTC (Auto-Demo)</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}

      {currentStep === 2 && (
      <>
      <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Mill Preset Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#EFECE5] border border-[#18181A]/10 overflow-x-auto max-w-full">
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
                className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-[#FCFBF8] text-[#18181A] font-medium border border-[#18181A]/10'
                    : 'text-[#55544E] hover:text-[#18181A]'
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
            className="h-9 px-3 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-[#18181A] text-xs font-medium focus:outline-none focus:border-[#059669] cursor-pointer"
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
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] text-xs font-medium transition-colors duration-150 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
            <span>Upload 3.1 PDF</span>
          </button>

          <button
            type="button"
            onClick={() => {
              haptics.tap();
              setSimulateDefect((prev) => !prev);
              setActiveSection('chemistry');
            }}
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium transition-colors duration-150 cursor-pointer ${
              simulateDefect
                ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
                : 'bg-[#FCFBF8] border-[#18181A]/12 text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5]'
            }`}
          >
            <ShieldAlert className="w-4 h-4" strokeWidth={1.5} />
            <span>{simulateDefect ? 'Defect Active' : 'Simulate Defect'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              haptics.tap();
              setIsBuyerSpecModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium bg-[#FCFBF8] border-[#18181A]/12 text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] transition-colors duration-150 cursor-pointer"
            aria-label="Buyer Spec Tolerance Check"
          >
            <Scale className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
            <span>Buyer Spec Check</span>
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher (< lg) */}
      <div className="lg:hidden flex items-center p-1 rounded-lg bg-[#EFECE5] border border-[#18181A]/10">
        <button
          type="button"
          aria-label="Document View"
          onClick={() => setMobileTab('document')}
          className={`flex-1 h-9 text-xs font-medium rounded-md transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer ${
            mobileTab === 'document'
              ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
              : 'text-[#55544E]'
          }`}
        >
          <FileText className="w-4 h-4" strokeWidth={1.5} />
          <span>Certificate Sheet</span>
        </button>
        <button
          type="button"
          aria-label="Extracted Fields"
          onClick={() => setMobileTab('fields')}
          className={`flex-1 h-9 text-xs font-medium rounded-md transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer ${
            mobileTab === 'fields'
              ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
              : 'text-[#55544E]'
          }`}
        >
          <Sliders className="w-4 h-4" strokeWidth={1.5} />
          <span>Verification</span>
          {unconfirmedFields.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] font-mono tabular-nums text-xs leading-none">
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
          <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
            {/* Document Studio Control Strip */}
            <div className="px-4 py-2.5 bg-[#F7F5F0] border-b border-[#18181A]/10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#FCFBF8] border border-[#18181A]/12 text-xs font-mono tabular-nums text-[#55544E]"
                  title={`SHA-256: ${sha256Hash}`}
                >
                  <Lock className="w-3.5 h-3.5 text-[#059669] shrink-0" strokeWidth={1.5} />
                  <span className="truncate max-w-[130px]">{sha256Hash.slice(0, 12)}…</span>
                </span>
                <span className="text-xs text-[#55544E] truncate hidden sm:inline">
                  {uploadedFileName || `${selectedPreset.certNumber}.pdf`}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))}
                  className="w-8 h-8 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#55544E] hover:text-[#18181A] border border-[#18181A]/12 flex items-center justify-center cursor-pointer"
                  title="Zoom out"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <span className="text-xs font-mono tabular-nums text-[#55544E] w-11 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(1.75, +(z + 0.25).toFixed(2)))}
                  className="w-8 h-8 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#55544E] hover:text-[#18181A] border border-[#18181A]/12 flex items-center justify-center cursor-pointer"
                  title="Zoom in"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => setRotationDeg((r) => (r + 90) % 360)}
                  className="w-8 h-8 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#55544E] hover:text-[#18181A] border border-[#18181A]/12 flex items-center justify-center ml-1 cursor-pointer"
                  title="Rotate 90°"
                  aria-label="Rotate 90 degrees"
                >
                  <RotateCw className="w-4 h-4" strokeWidth={1.5} />
                </button>
                {(zoomLevel !== 1 || rotationDeg !== 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setZoomLevel(1);
                      setRotationDeg(0);
                    }}
                    className="px-2 h-8 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#55544E] hover:text-[#18181A] border border-[#18181A]/12 text-xs font-medium cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* #EFECE5 Drafting Mat Surrounding Paper Certificate Sheet */}
            <div className="p-4 sm:p-6 bg-[#EFECE5] overflow-auto">
              <div
                className="relative bg-[#FFFFFF] text-[#18181A] rounded-lg border border-[#18181A]/15 p-5 sm:p-6 space-y-5 select-none transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotationDeg}deg)`,
                  transformOrigin: 'top center',
                }}
                onDoubleClick={() => setZoomLevel((z) => (z > 1 ? 1 : 1.25))}
              >
                <LaserScanBeam isScanning={isProcessingOcr} />

                {/* Mill Certificate Header */}
                <div className="border-b border-[#18181A] pb-3 flex flex-wrap justify-between items-start gap-3">
                  <div>
                    <div className="text-sm font-medium tracking-[-0.01em] text-[#18181A]">
                      {selectedPreset.mill}
                    </div>
                    <div className="text-xs text-[#55544E] mt-0.5">
                      Inspection Certificate · EN 10204:2004 Type 3.1
                    </div>
                  </div>
                  <div className="text-left sm:text-right text-xs">
                    <div className="font-mono tabular-nums font-medium text-[#18181A]">
                      {selectedPreset.certNumber}
                    </div>
                    <div className="font-mono tabular-nums text-[#55544E] mt-0.5">
                      {selectedPreset.issueDate}
                    </div>
                  </div>
                </div>

                {/* ANCHORED FRAME 1: Heat & Origin */}
                <div
                  onClick={() => setActiveSection('origin')}
                  className={`relative rounded-lg border p-3.5 pt-4 transition-colors duration-150 cursor-pointer ${frameClass(
                    'origin',
                    'amber'
                  )}`}
                >
                  <span className="absolute -top-2.5 left-3 px-2 py-0.5 rounded bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs font-medium leading-none">
                    1 · Heat &amp; Origin
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mt-1">
                    <div>
                      <span className="text-[#55544E] block">Heat / Cast Number</span>
                      <span className="font-mono tabular-nums font-medium text-[#18181A] text-sm">
                        #{selectedPreset.heatNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#55544E] block">Country of Melt &amp; Pour</span>
                      <span className="font-medium text-[#047857]">
                        {selectedPreset.meltCountry} (ISO: IN)
                      </span>
                    </div>
                    <div>
                      <span className="text-[#55544E] block">Steelmaking Route</span>
                      <span className="text-[#18181A] font-medium">{selectedPreset.meltRoute}</span>
                    </div>
                    <div>
                      <span className="text-[#55544E] block">Product Standard</span>
                      <span className="font-mono text-[#18181A]">{selectedPreset.code}</span>
                    </div>
                  </div>
                </div>

                {/* ANCHORED FRAME 2: Chemistry Spectrometry */}
                <div
                  onClick={() => setActiveSection('chemistry')}
                  className={`relative rounded-lg border p-3.5 pt-4 transition-colors duration-150 cursor-pointer ${frameClass(
                    'chemistry',
                    'blue'
                  )}`}
                >
                  <span className="absolute -top-2.5 left-3 px-2 py-0.5 rounded bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs font-medium leading-none">
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
                              : 'bg-[#FCFBF8] border-[#18181A]/10'
                          }`}
                        >
                          <span className="block text-xs text-[#55544E] font-mono">
                            {el.symbol}
                          </span>
                          <span
                            className={`block font-mono tabular-nums text-xs font-medium mt-0.5 ${
                              failed ? 'text-[#DC2626]' : 'text-[#18181A]'
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
                  className={`relative rounded-lg border p-3.5 pt-4 transition-colors duration-150 cursor-pointer ${frameClass(
                    'mechanical',
                    'emerald'
                  )}`}
                >
                  <span className="absolute -top-2.5 left-3 px-2 py-0.5 rounded bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs font-medium leading-none">
                    3 · Mechanical Properties
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    {selectedPreset.mechanics.map((m, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-2 rounded-md bg-[#FCFBF8] border border-[#18181A]/10 flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="text-[#55544E] truncate">{m.property}</span>
                        <span className="font-mono tabular-nums font-medium text-[#18181A] shrink-0">
                          {m.measured}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ANCHORED FRAME 4: QA Stamp */}
                <div
                  onClick={() => setActiveSection('stamp')}
                  className={`relative rounded-lg border p-3.5 pt-4 transition-colors duration-150 cursor-pointer ${frameClass(
                    'stamp',
                    'neutral'
                  )}`}
                >
                  <span className="absolute -top-2.5 left-3 px-2 py-0.5 rounded bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs font-medium leading-none">
                    4 · Works Inspector Stamp
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs mt-1">
                    <div>
                      <span className="text-[#55544E]">Authorized Representative: </span>
                      <span className="font-medium text-[#18181A]">
                        Independent Works QA Division
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-md border border-[#18181A] text-[#18181A] font-mono text-xs font-medium">
                      EN 10204 · 3.1
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Canvas Footer */}
            <div className="px-4 py-2.5 bg-[#F7F5F0] border-t border-[#18181A]/10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#55544E]">
              <span>Byte-identical original preservation · {uploadTimestamp}</span>
              <span className="font-mono tabular-nums text-[#047857] font-medium">
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
                <div className="flex items-center gap-2 font-medium text-[#DC2626]">
                  <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
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
              <p className="text-[#55544E] leading-relaxed">
                Measured ladle composition exceeds permissible limits for{' '}
                <strong className="text-[#18181A] font-medium">{selectedStandard}</strong>. Dispatch
                clearance is blocked until amended or reassigned.
              </p>
            </div>
          )}

          {/* Compact 4-Cell Heat & Origin Summary Bar */}
          <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
            <div className="px-4 py-2.5 bg-[#F7F5F0] border-b border-[#18181A]/10 flex items-center justify-between">
              <span className="text-xs font-medium text-[#18181A]">
                Heat &amp; Melt-and-Pour Summary
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveSection('origin');
                  setMobileTab('document');
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#047857] hover:underline cursor-pointer"
              >
                <Eye className="w-4 h-4" strokeWidth={1.5} />
                <span>Locate on sheet</span>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#18181A]/10">
              <div className="p-3">
                <span className="text-xs text-[#55544E] block">Heat Number</span>
                <span className="font-mono tabular-nums text-xs font-medium text-[#18181A] block mt-0.5 truncate">
                  #{selectedPreset.heatNumber}
                </span>
              </div>
              <div className="p-3">
                <span className="text-xs text-[#55544E] block">Origin (EU 2026/1963)</span>
                <span className="text-xs font-medium text-[#047857] block mt-0.5 truncate">
                  {selectedPreset.meltCountry} (IN)
                </span>
              </div>
              <div className="p-3">
                <span className="text-xs text-[#55544E] block">Certificate Ref</span>
                <span className="font-mono tabular-nums text-xs font-medium text-[#18181A] block mt-0.5 truncate">
                  {selectedPreset.certNumber}
                </span>
              </div>
              <div className="p-3">
                <span className="text-xs text-[#55544E] block">Carbon Equivalent</span>
                <span
                  className={`font-mono tabular-nums text-xs font-medium block mt-0.5 ${
                    isCevPass ? 'text-[#18181A]' : 'text-[#DC2626]'
                  }`}
                >
                  {cevValue.toFixed(3)} IIW
                </span>
              </div>
            </div>
          </div>

          {/* 8 Core Certificate Fields (Prompt M2: Only 8 fields that matter) */}
          <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
            <div className="px-4 py-2.5 bg-[#F7F5F0] border-b border-[#18181A]/10 flex items-center justify-between">
              <span className="text-xs font-medium text-[#18181A]">
                8 Core Certificate Fields (EN 10204 3.1)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#55544E]">Autosaved</span>
                {lastAction && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#047857] hover:underline cursor-pointer"
                  >
                    <Undo2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Undo</span>
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-[#18181A]/10">
              {fields
                .filter((f) => [
                  'mill_name',
                  'heat_number',
                  'grade',
                  'product_form',
                  'dimensions',
                  'quantity_tonnes',
                  'melt_country',
                  'issue_date',
                ].includes(f.id))
                .map((field) => {
                  const isFlagged = !field.isConfirmed || field.confidence < 85;
                  return (
                    <div
                      key={field.id}
                      id={`field-${field.id}`}
                      onClick={() => setActiveSection('origin')}
                      className={`px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors duration-150 ${
                        isFlagged ? 'bg-[#FFFBEB]/70 hover:bg-[#FFFBEB]' : 'bg-[#FCFBF8] hover:bg-[#F7F5F0]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#55544E] font-medium">{field.label}</span>
                          <span
                            className={`text-xs font-mono tabular-nums px-1.5 py-0.5 rounded border ${
                              isFlagged
                                ? 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A] font-medium'
                                : 'bg-[#EFECE5] text-[#55544E] border-[#18181A]/10'
                            }`}
                          >
                            {isFlagged ? `needs your check · ${field.confidence}%` : `${field.confidence}%`}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[#18181A] truncate mt-0.5">
                          {field.value}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(field);
                          }}
                          className="p-1.5 rounded-md text-[#78766E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer"
                          title={`Edit ${field.label}`}
                          aria-label={`Edit ${field.label}`}
                        >
                          <Edit2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                        {isFlagged ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmField(field.id);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" strokeWidth={2} />
                            <span>Confirm</span>
                          </button>
                        ) : (
                          <span className="text-[#059669]" title="Verified">
                            <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Collapsible Chemistry and Mechanical Section */}
          <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsChemMechCollapsed((c) => !c)}
              className="w-full px-4 py-2.5 bg-[#F7F5F0] border-b border-[#18181A]/10 flex items-center justify-between text-left cursor-pointer hover:bg-[#EFECE5] transition-colors duration-150"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                <span className="text-xs font-medium text-[#18181A]">
                  Chemistry and Mechanical Properties
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#55544E]">
                <span>{isChemMechCollapsed ? 'Show' : 'Hide'} Specifications</span>
                {isChemMechCollapsed ? (
                  <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                ) : (
                  <ChevronUp className="w-4 h-4" strokeWidth={1.5} />
                )}
              </div>
            </button>
          </div>

          {/* Engineered Chemical Tolerance Range Gauges */}
          <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
            <div className="px-4 py-3 bg-[#F7F5F0] border-b border-[#18181A]/10 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-medium text-[#18181A]">
                  Chemical Tolerance Range Gauges
                </h3>
                <p className="text-xs text-[#55544E] mt-0.5">
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

            <div className="divide-y divide-[#18181A]/10">
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
                    className={`px-4 py-3 transition-colors duration-150 ${
                      !isPass
                        ? 'bg-[#FEF2F2]/70'
                        : isFlagged
                          ? 'bg-[#FFFBEB]/60'
                          : 'bg-[#FCFBF8] hover:bg-[#F7F5F0]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-medium text-[#18181A] w-7">
                          {el.symbol}
                        </span>
                        <span className="text-[#55544E] truncate">{el.name}</span>
                        {isFlagged && (
                          <span className="px-1.5 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-xs font-medium">
                            Verify OCR
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono tabular-nums text-[#55544E]">
                          {el.min > 0 ? `${el.min}–${el.max}%` : `≤ ${el.max}%`}
                        </span>
                        <span
                          className={`font-mono tabular-nums font-medium min-w-[60px] text-right ${
                            !isPass ? 'text-[#DC2626]' : 'text-[#18181A]'
                          }`}
                        >
                          {el.measured.toFixed(3)}%
                        </span>
                      </div>
                    </div>

                    {/* Thin Tolerance Track with Safe Zone & Marker Dot */}
                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="relative flex-1 h-1.5 rounded bg-[#EFECE5] border border-[#18181A]/10">
                        {/* Safe Spec Zone */}
                        <div
                          className={`absolute top-0 bottom-0 rounded ${
                            !isPass ? 'bg-emerald-500/25' : 'bg-emerald-500/35'
                          }`}
                          style={{
                            left: `${safeStartPct}%`,
                            width: `${Math.max(4, safeEndPct - safeStartPct)}%`,
                          }}
                        />
                        {/* Measured Value Marker */}
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-[#FCFBF8] ${
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
                            className="p-1 rounded-md text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] transition-colors cursor-pointer"
                            title={`Edit ${el.name}`}
                            aria-label={`Edit ${el.name}`}
                          >
                            <Edit2 className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                          {isFlagged ? (
                            <button
                              type="button"
                              onClick={() => handleConfirmField(field.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" strokeWidth={2} />
                              <span>Confirm</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center text-[#059669]" title="Verified">
                              <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
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
                  !isCevPass ? 'bg-[#FEF2F2]/70' : 'bg-[#F7F5F0]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-[#18181A]">CEV</span>
                    <span className="text-[#55544E]">Carbon Equivalent (IIW Formula)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono tabular-nums text-[#55544E]">
                      ≤ {cevMax.toFixed(2)} IIW
                    </span>
                    <span
                      className={`font-mono tabular-nums font-medium ${
                        isCevPass ? 'text-[#047857]' : 'text-[#DC2626]'
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
          <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
            <div className="px-4 py-3 bg-[#F7F5F0] border-b border-[#18181A]/10 flex items-center justify-between">
              <h3 className="text-xs font-medium text-[#18181A]">
                Mechanical Properties (23°C Ambient)
              </h3>
              <span className="text-xs font-medium text-[#047857]">EN 10025-2 Verified</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:gap-px bg-[#18181A]/10">
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
                        isFlagged ? 'bg-[#FFFBEB]' : 'bg-[#FCFBF8]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs text-[#55544E]">{field.label}</span>
                        <span
                          className={`font-mono tabular-nums text-xs px-1.5 py-0.5 rounded-md border ${
                            isFlagged
                              ? 'bg-[#FCFBF8] border-[#FDE68A] text-[#B45309]'
                              : 'bg-[#F7F5F0] border-[#18181A]/10 text-[#55544E]'
                          }`}
                        >
                          {field.confidence}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono tabular-nums text-base font-medium text-[#18181A]">
                          {field.value}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isFlagged ? (
                            <button
                              type="button"
                              onClick={() => handleConfirmField(field.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" strokeWidth={2} />
                              <span>Confirm</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(field)}
                              className="p-1.5 rounded-md text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer"
                              title="Edit mechanical value"
                            >
                              <Edit2 className="w-4 h-4" strokeWidth={1.5} />
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
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-[#121316] border border-[#2C303A] text-[#EAEAEA] font-medium text-xs cursor-pointer"
          >
            <Flag className="w-4 h-4 text-[#FBBF24]" strokeWidth={1.5} />
            <span>Next Flagged ({unconfirmedFields.length})</span>
          </button>
        </div>
      )}

      {/* Sticky Daylight Verification Action Bar */}
      <div className="sticky bottom-2 z-20 px-4 py-3 bg-[#FCFBF8]/95 backdrop-blur-md border border-[#18181A]/15 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs flex items-center gap-2">
          <span className="text-[#55544E]">Inspection Status:</span>
          {isOffSpec ? (
            <span className="font-medium text-[#DC2626]">
              Blocked · Out-of-spec chemistry detected
            </span>
          ) : canApprove ? (
            <span className="font-medium text-[#047857]">
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
            className="flex-1 sm:flex-initial h-9 px-3.5 rounded-lg bg-[#FEF2F2] hover:bg-red-100 border border-[#FECACA] text-[#DC2626] text-xs font-medium transition-colors duration-150 cursor-pointer"
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
            className="flex-1 sm:flex-initial h-9 px-3.5 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-[#18181A] text-xs font-medium transition-colors duration-150 cursor-pointer"
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
            className="flex-1 sm:flex-initial h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
            <span>Approve MTC</span>
          </button>

          {canApprove && (
            <button
              type="button"
              onClick={() => {
                toast.success('Proceeding to Shipment', 'Heat verified. Assign to export shipment.');
                setCurrentStep(3);
              }}
              className="flex-1 sm:flex-initial h-9 px-4 rounded-lg bg-[#18181A] hover:bg-[#2C2D32] text-[#FCFBF8] text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer"
            >
              <span>Add to Shipment (Step 3)</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Quick Edit Modal */}
      {editingFieldId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
          <div className="bg-[#FCFBF8] border border-[#18181A]/15 rounded-xl max-w-sm w-full p-5 space-y-4 text-left">
            <div>
              <h4 className="text-sm font-medium text-[#18181A]">Correct Extracted Value</h4>
              <p className="text-xs text-[#55544E] mt-1">
                The audit log records your inspector ID alongside the original OCR reading.
              </p>
            </div>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] font-mono tabular-nums text-sm focus:outline-none focus:border-[#059669]"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-[#18181A]/10">
              <button
                type="button"
                onClick={() => setEditingFieldId(null)}
                className="h-9 px-3.5 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-xs font-medium text-[#18181A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="h-9 px-3.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-xs font-medium text-white cursor-pointer"
              >
                Save &amp; Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
          <div className="bg-[#FCFBF8] border border-[#18181A]/15 rounded-xl max-w-md w-full p-5 space-y-4 text-left">
            <div className="flex items-center gap-2 text-[#DC2626] font-medium text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>Reject Certificate with Audit Reason</span>
            </div>
            <p className="text-xs text-[#55544E]">
              Enter the non-conformance details to include in the supplier amendment notice.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Molybdenum below minimum limit of 0.15% per ASTM A193 B7."
              className="w-full px-3 py-2 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 text-[#18181A] text-xs focus:outline-none focus:border-[#DC2626] resize-none"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-[#18181A]/10">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="h-9 px-3.5 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] border border-[#18181A]/12 text-xs font-medium text-[#18181A] cursor-pointer"
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
                className="h-9 px-3.5 rounded-lg bg-[#DC2626] hover:bg-red-700 text-xs font-medium text-white cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* Step 3: Add to Export Shipment (Prompt M2) */}
      {currentStep === 3 && (
        <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-6 space-y-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-4">
            <div>
              <h2 className="text-lg font-medium text-[#18181A] tracking-[-0.01em]">
                Step 3: Add to Export Shipment
              </h2>
              <p className="text-xs text-[#55544E] mt-1">
                Allocate approved Heat #{selectedPreset.heatNumber} to an active export consignment.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="text-xs text-[#55544E] hover:text-[#18181A] flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Back to Review
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#18181A] mb-1">Target Shipment</label>
              <select
                value={selectedShipment}
                onChange={(e) => setSelectedShipment(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#18181A]/15 text-xs font-medium text-[#18181A] bg-[#FCFBF8] focus:outline-none focus:border-[#059669]"
              >
                <option value="SH-2026-0881">SH-2026-0881 · ThyssenKrupp AG (Antwerp, Belgium)</option>
                <option value="SH-2026-0879">SH-2026-0879 · ArcelorMittal Gent (Rotterdam)</option>
                <option value="NEW_SHIPMENT">+ Create New Consignment...</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#18181A] mb-1">Tonnage to Allocate (MT)</label>
              <div className="relative">
                <input
                  type="number"
                  value={allocatedTonnes}
                  onChange={(e) => setAllocatedTonnes(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-3 pr-12 rounded-lg border border-[#18181A]/15 bg-[#FCFBF8] text-xs font-mono tabular-nums font-medium text-[#18181A] focus:outline-none focus:border-[#059669]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#78766E]">MT</span>
              </div>
              <p className="text-xs text-[#55544E] mt-1">Remaining heat inventory: 95.50 MT after allocation</p>
            </div>

            <div className="rounded-lg border border-[#18181A]/10 bg-[#F7F5F0] p-4 space-y-2.5">
              <h4 className="text-xs font-medium text-[#18181A]">Statutory Readiness Checklist</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[#047857]">
                    <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                    <span>Melt &amp; Pour Origin Verified: India (EU Reg 2026/1963)</span>
                  </span>
                  <span className="text-xs font-mono text-[#047857] font-medium">OK</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[#047857]">
                    <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                    <span>Product CN Code in Scope (7214.20)</span>
                  </span>
                  <span className="text-xs font-mono text-[#047857] font-medium">OK</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[#047857]">
                    <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                    <span>Heat Mass-Balance Reconciled (No double allocation)</span>
                  </span>
                  <span className="text-xs font-mono text-[#047857] font-medium">OK</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                toast.success('Heat Allocated', `Allocated ${allocatedTonnes} MT to ${selectedShipment}.`);
                setCurrentStep(4);
              }}
              className="w-full h-10 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors duration-150"
            >
              <span>Confirm &amp; Build Buyer Pack</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Download Buyer Pack (Prompt M2) */}
      {currentStep === 4 && (
        <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-6 space-y-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-between border-b border-[#18181A]/10 pb-4">
            <div>
              <h2 className="text-lg font-medium text-[#18181A] tracking-[-0.01em]">
                Step 4: Buyer Pack Ready for Download
              </h2>
              <p className="text-xs text-[#55544E] mt-1">
                Byte-identical certificates + 1-page compliance summary + QR verification seal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="text-xs text-[#55544E] hover:text-[#18181A] flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Back
            </button>
          </div>

          <div className="rounded-xl border border-[#18181A]/10 bg-[#F7F5F0] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#18181A]">Buyer Pack Contents</span>
              <span className="text-[#047857] font-medium flex items-center gap-1">
                <Check className="w-4 h-4" strokeWidth={1.5} /> 100% Complete
              </span>
            </div>
            <ul className="text-xs text-[#55544E] space-y-1.5 list-disc list-inside">
              <li>Original Mill Test Certificate (byte-identical, unmodified)</li>
              <li>1-Page Executive CBAM &amp; Melt-and-Pour Summary</li>
              <li>SHA-256 Manifest and Ed25519 Cryptographic Seal</li>
              <li>QR Link to Public Buyer Verification Portal</li>
            </ul>
          </div>

          {/* Inspector Seal TOTP Step — Forged Graphite Security Block */}
          <div className="rounded-xl border border-[#2C303A] bg-[#121316] p-4 text-[#EAEAEA] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" strokeWidth={1.5} />
                <span className="text-xs font-medium">Inspector Seal (TOTP)</span>
              </div>
              {isSealed ? (
                <span className="text-xs text-[#10B981] font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  SEALED &amp; TIMESTAMPED
                </span>
              ) : (
                <span className="text-xs text-[#FBBF24] font-medium">Pending 6-Digit TOTP</span>
              )}
            </div>
            {!isSealed ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Enter 6-digit TOTP"
                  maxLength={6}
                  value={inspectorTotp}
                  onChange={(e) => setInspectorTotp(e.target.value.replace(/\D/g, ''))}
                  className="h-9 px-3 rounded-lg bg-[#181A1F] border border-[#2C303A] text-xs font-mono tabular-nums tracking-[0.14em] text-[#EAEAEA] placeholder-[#6F7480] focus:outline-none focus:border-[#10B981] w-44"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (inspectorTotp.length === 6) {
                      setIsSealed(true);
                      toast.success('Pack Digitally Sealed', 'Cryptographic Ed25519 seal applied with inspector timestamp.');
                    } else {
                      toast.error('Invalid TOTP', 'Please enter a 6-digit authenticator code.');
                    }
                  }}
                  className="h-9 px-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-[#121316] text-xs font-medium cursor-pointer transition-colors duration-150"
                >
                  Apply Inspector Seal
                </button>
              </div>
            ) : (
              <p className="text-xs text-[#9FA3AD]">
                Sealed by Authorized Plant Inspector (QA-4409) · Ed25519 signature verified.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => toast.success('Download Started', 'Downloading combined buyer pack PDF.')}
              className="h-10 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors duration-150"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
              <span>Download Buyer Pack (PDF)</span>
            </button>
            <button
              type="button"
              onClick={() => toast.success('Download Started', 'Downloading buyer pack ZIP archive.')}
              className="h-10 rounded-lg bg-[#FCFBF8] border border-[#18181A]/15 hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors duration-150"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
              <span>Download ZIP (Manifest + Originals)</span>
            </button>
          </div>

          <div className="text-center pt-2 border-t border-[#18181A]/10">
            <button
              type="button"
              onClick={() => {
                setCurrentStep(1);
                setIsSealed(false);
                setInspectorTotp('');
              }}
              className="text-xs text-[#047857] hover:underline font-medium cursor-pointer"
            >
              Upload Next Certificate →
            </button>
          </div>
        </div>
      )}

      {/* Prompt Pack v4 Task C1: Buyer Specification Tolerance Modal */}
      <BuyerSpecCheckModal
        isOpen={isBuyerSpecModalOpen}
        onClose={() => setIsBuyerSpecModalOpen(false)}
        heatNumber={selectedPreset.heatNumber}
        initialGrade={selectedStandard}
      />
    </div>
  );
};
