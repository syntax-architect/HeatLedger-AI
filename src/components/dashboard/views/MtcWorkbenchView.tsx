import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  STANDARDS_LIST,
  PRESET_MATCHING_STANDARDS,
  evaluateChemistryAgainstStandard,
} from '../../../lib/metallurgicalStandards';
import { SIMULATOR_PRESETS } from '../../../data/marketingSamples';
import { useToast } from '../../ui/ToastContext';
import { haptics } from '../../../lib/motion';
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Check,
  Edit2,
  Flag,
  Eye,
  ShieldAlert,
  ArrowRight,
  Undo2,
  ChevronDown,
  ChevronUp,
  Scale,
} from 'lucide-react';
import { BuyerSpecCheckModal } from '../../compliance/BuyerSpecCheckModal';
import {
  WorkbenchField,
  InspectionSection,
  buildWorkbenchFields,
} from './workbench/workbenchHelpers';
import {
  WorkbenchHeaderAndSteps,
  WorkbenchStep1Upload,
} from './workbench/WorkbenchHeaderAndSteps';
import { WorkbenchDocumentCanvas } from './workbench/WorkbenchDocumentCanvas';
import { WorkbenchChemistryAndMechanical } from './workbench/WorkbenchChemistryAndMechanical';
import {
  WorkbenchStep3Allocate,
  WorkbenchStep4Download,
} from './workbench/WorkbenchSteps3And4';
import {
  WorkbenchQuickEditModal,
  WorkbenchRejectModal,
} from './workbench/WorkbenchModals';

export type { WorkbenchField };

interface MtcWorkbenchViewProps {
  initialPresetId?: string;
  initialUploadedFile?: File | null;
}

const CORE_FIELD_IDS = [
  'mill_name',
  'heat_number',
  'grade',
  'product_form',
  'dimensions',
  'quantity_tonnes',
  'melt_country',
  'issue_date',
];

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

  const [selectedStandard, setSelectedStandard] = useState<string>(
    () => PRESET_MATCHING_STANDARDS[selectedPreset.id] || STANDARDS_LIST[0]
  );

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

  useEffect(() => {
    setSelectedStandard(PRESET_MATCHING_STANDARDS[selectedPreset.id] || STANDARDS_LIST[0]);
    setSimulateDefect(false);
    setFields(buildWorkbenchFields(selectedPreset));
  }, [selectedPreset]);

  useEffect(() => {
    if (initialUploadedFile) {
      handleProcessUploadedFile(initialUploadedFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const effectiveChemistryInput = useMemo(
    () =>
      selectedPreset.chemistry.map((el) => {
        const field = fields.find((f) => f.id === `chem_${el.symbol}`);
        const parsedVal = field ? parseFloat(field.value) : el.measured;
        let measured = Number.isFinite(parsedVal) ? parsedVal : el.measured;

        if (simulateDefect) {
          if (el.symbol === 'C') measured = Number((el.max + 0.06).toFixed(3));
          if (el.symbol === 'S') measured = Number((el.max + 0.018).toFixed(3));
        }
        return { ...el, measured };
      }),
    [selectedPreset.chemistry, fields, simulateDefect]
  );

  const activeChemistry = useMemo(
    () => evaluateChemistryAgainstStandard(effectiveChemistryInput, selectedStandard),
    [effectiveChemistryInput, selectedStandard]
  );

  const cevValue = useMemo(() => {
    const getVal = (sym: string) => activeChemistry.find((e) => e.symbol === sym)?.measured ?? 0;
    return getVal('C') + getVal('Mn') / 6 + (getVal('Cr') + getVal('Mo')) / 5 + getVal('Ni') / 15;
  }, [activeChemistry]);

  const cevMax = 0.45;
  const isCevPass = cevValue <= cevMax;
  const failedElements = useMemo(
    () => activeChemistry.filter((el) => el.status !== 'PASS'),
    [activeChemistry]
  );
  const isOffSpec = failedElements.length > 0 || !isCevPass;
  const unconfirmedFields = useMemo(
    () => fields.filter((f) => !f.isConfirmed || f.confidence < 85),
    [fields]
  );
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
    document.getElementById(`field-${nextField.id}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
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
      prev.map((f) => (f.id === lastAction.fieldId ? { ...f, value: lastAction.previousValue } : f))
    );
    setLastAction(null);
    toast.info('Edit Reverted', 'Restored previous extracted value.');
  };

  return (
    <div className="space-y-5 font-sans text-left">
      <WorkbenchHeaderAndSteps
        selectedPreset={selectedPreset}
        selectedPresetIndex={selectedPresetIndex}
        totalPresets={SIMULATOR_PRESETS.length}
        currentStep={currentStep}
        onPrevPreset={() => {
          haptics.tap();
          setSelectedPresetIndex((prev) => (prev > 0 ? prev - 1 : SIMULATOR_PRESETS.length - 1));
        }}
        onNextPreset={() => {
          haptics.tap();
          setSelectedPresetIndex((prev) => (prev < SIMULATOR_PRESETS.length - 1 ? prev + 1 : 0));
        }}
        onStepChange={setCurrentStep}
      />

      {currentStep === 1 && (
        <WorkbenchStep1Upload
          onTriggerFilePicker={() => fileInputRef.current?.click()}
          onUseSampleMtc={() => {
            toast.success('Sample MTC Loaded', 'Loaded Howrah Precision Forgings test certificate.');
            setCurrentStep(2);
          }}
        />
      )}

      {currentStep === 2 && (
        <>
          <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <WorkbenchDocumentCanvas
              mobileTab={mobileTab}
              sha256Hash={sha256Hash}
              uploadedFileName={uploadedFileName}
              selectedPreset={selectedPreset}
              zoomLevel={zoomLevel}
              rotationDeg={rotationDeg}
              isProcessingOcr={isProcessingOcr}
              activeSection={activeSection}
              activeChemistry={activeChemistry}
              uploadTimestamp={uploadTimestamp}
              onZoomIn={() => setZoomLevel((z) => Math.min(1.75, +(z + 0.25).toFixed(2)))}
              onZoomOut={() => setZoomLevel((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))}
              onRotate={() => setRotationDeg((r) => (r + 90) % 360)}
              onResetTransform={() => {
                setZoomLevel(1);
                setRotationDeg(0);
              }}
              onDoubleClickSheet={() => setZoomLevel((z) => (z > 1 ? 1 : 1.25))}
              onSelectSection={setActiveSection}
            />

            <div
              className={`lg:col-span-6 space-y-4 ${mobileTab === 'fields' ? 'block' : 'hidden lg:block'}`}
            >
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
                    <strong className="text-[#18181A] font-medium">{selectedStandard}</strong>.
                    Dispatch clearance is blocked until amended or reassigned.
                  </p>
                </div>
              )}

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
                    .filter((f) => CORE_FIELD_IDS.includes(f.id))
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

              <WorkbenchChemistryAndMechanical
                selectedStandard={selectedStandard}
                isOffSpec={isOffSpec}
                failedCount={failedElements.length}
                activeChemistry={activeChemistry}
                fields={fields}
                cevValue={cevValue}
                cevMax={cevMax}
                isCevPass={isCevPass}
                onHoverSection={setActiveSection}
                onStartEdit={handleStartEdit}
                onConfirmField={handleConfirmField}
              />
            </div>
          </div>

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

          <div className="sticky bottom-2 z-20 px-4 py-3 bg-[#FCFBF8]/95 backdrop-blur-md border border-[#18181A]/15 rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs flex items-center gap-2">
              <span className="text-[#55544E]">Inspection Status:</span>
              {isOffSpec ? (
                <span className="font-medium text-[#DC2626]">
                  Blocked · Out-of-spec chemistry detected
                </span>
              ) : canApprove ? (
                <span className="font-medium text-[#047857]">100% Verified · Ready to Sign</span>
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

          {editingFieldId && (
            <WorkbenchQuickEditModal
              editValue={editValue}
              onEditValueChange={setEditValue}
              onClose={() => setEditingFieldId(null)}
              onSave={handleSaveEdit}
            />
          )}

          {isRejectModalOpen && (
            <WorkbenchRejectModal
              rejectReason={rejectReason}
              onRejectReasonChange={setRejectReason}
              onClose={() => setIsRejectModalOpen(false)}
              onConfirmReject={() => {
                toast.error(
                  'Certificate Rejected',
                  rejectReason || 'Rejected for metallurgical non-compliance.'
                );
                setIsRejectModalOpen(false);
              }}
            />
          )}
        </>
      )}

      {currentStep === 3 && (
        <WorkbenchStep3Allocate
          heatNumber={selectedPreset.heatNumber}
          selectedShipment={selectedShipment}
          onSelectedShipmentChange={setSelectedShipment}
          allocatedTonnes={allocatedTonnes}
          onAllocatedTonnesChange={setAllocatedTonnes}
          onBack={() => setCurrentStep(2)}
          onConfirmAllocate={() => {
            toast.success('Heat Allocated', `Allocated ${allocatedTonnes} MT to ${selectedShipment}.`);
            setCurrentStep(4);
          }}
        />
      )}

      {currentStep === 4 && (
        <WorkbenchStep4Download
          isSealed={isSealed}
          inspectorTotp={inspectorTotp}
          onInspectorTotpChange={setInspectorTotp}
          onApplySeal={() => {
            if (inspectorTotp.length === 6) {
              setIsSealed(true);
              toast.success(
                'Pack Digitally Sealed',
                'Cryptographic Ed25519 seal applied with inspector timestamp.'
              );
            } else {
              toast.error('Invalid TOTP', 'Please enter a 6-digit authenticator code.');
            }
          }}
          onBack={() => setCurrentStep(3)}
          onDownloadPdf={() =>
            toast.success('Download Started', 'Downloading combined buyer pack PDF.')
          }
          onDownloadZip={() =>
            toast.success('Download Started', 'Downloading buyer pack ZIP archive.')
          }
          onResetFlow={() => {
            setCurrentStep(1);
            setIsSealed(false);
            setInspectorTotp('');
          }}
        />
      )}

      <BuyerSpecCheckModal
        isOpen={isBuyerSpecModalOpen}
        onClose={() => setIsBuyerSpecModalOpen(false)}
        heatNumber={selectedPreset.heatNumber}
        initialGrade={selectedStandard}
      />
    </div>
  );
};
