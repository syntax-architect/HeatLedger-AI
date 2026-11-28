import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  STANDARDS_LIST,
  PRESET_MATCHING_STANDARDS,
} from '../../../lib/metallurgicalStandards';
import { SIMULATOR_PRESETS } from '../../../data/marketingSamples';
import { useToast } from '../../ui/ToastContext';
import { haptics } from '../../../lib/motion';
import { Flag } from 'lucide-react';
import {
  WorkbenchField,
  InspectionSection,
  buildWorkbenchFields,
  calculateWorkbenchMetrics,
} from './workbench/workbenchHelpers';
import {
  WorkbenchHeaderAndSteps,
  WorkbenchStep1Upload,
} from './workbench/WorkbenchHeaderAndSteps';
import { WorkbenchDocumentCanvas } from './workbench/WorkbenchDocumentCanvas';
import { WorkbenchToolbar } from './workbench/WorkbenchToolbar';
import { WorkbenchVerificationPanel } from './workbench/WorkbenchVerificationPanel';
import { WorkbenchBottomBar } from './workbench/WorkbenchBottomBar';
import { WorkbenchModalsAndSteps34 } from './workbench/WorkbenchModalsAndSteps34';

export type { WorkbenchField };

interface MtcWorkbenchViewProps {
  initialPresetId?: string;
  initialUploadedFile?: File | null;
}

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
        `${file.name} preserved byte-identical with SHA-256 checksum.`
      );
    }, 900);
  };

  const {
    activeChemistry,
    cevValue,
    cevMax,
    isCevPass,
    failedElements,
    isOffSpec,
    unconfirmedFields,
    canApprove,
  } = useMemo(
    () =>
      calculateWorkbenchMetrics({
        selectedPreset,
        fields,
        simulateDefect,
        selectedStandard,
      }),
    [selectedPreset, fields, simulateDefect, selectedStandard]
  );

  const handleJumpToNextFlaggedField = () => {
    haptics.tap();
    if (unconfirmedFields.length === 0) {
      toast.success('All Confirmed', 'All extracted fields have been checked by the inspector.');
      return;
    }
    const nextField = unconfirmedFields[0];
    setMobileTab('fields');
    if (nextField?.sectionKey) setActiveSection(nextField.sectionKey);
    if (nextField) {
      document.getElementById(`field-${nextField.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  const handleConfirmField = (fieldId: string) => {
    haptics.tap();
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, isConfirmed: true, confidence: 100 } : f))
    );
    toast.success('Field Confirmed', 'Checked by QA Inspector.');
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
              correctedBy: 'QA Inspector',
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
            toast.success('Sample MTC Loaded', 'Loaded sample mill test certificate.');
            setCurrentStep(2);
          }}
        />
      )}

      {currentStep === 2 && (
        <>
          <WorkbenchToolbar
            selectedPresetIndex={selectedPresetIndex}
            selectedStandard={selectedStandard}
            simulateDefect={simulateDefect}
            mobileTab={mobileTab}
            unconfirmedCount={unconfirmedFields.length}
            fileInputRef={fileInputRef}
            onSelectPreset={setSelectedPresetIndex}
            onSelectStandard={setSelectedStandard}
            onFileSelected={handleProcessUploadedFile}
            onToggleDefect={() => {
              setSimulateDefect((prev) => !prev);
              setActiveSection('chemistry');
            }}
            onOpenBuyerSpec={() => setIsBuyerSpecModalOpen(true)}
            onMobileTabChange={setMobileTab}
          />

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

            <WorkbenchVerificationPanel
              mobileTab={mobileTab}
              selectedPreset={selectedPreset}
              selectedStandard={selectedStandard}
              isOffSpec={isOffSpec}
              failedElementsCount={failedElements.length}
              activeChemistry={activeChemistry}
              fields={fields}
              cevValue={cevValue}
              cevMax={cevMax}
              isCevPass={isCevPass}
              isChemMechCollapsed={isChemMechCollapsed}
              lastAction={lastAction}
              onResetDefectAndStandard={() => {
                setSimulateDefect(false);
                setSelectedStandard(PRESET_MATCHING_STANDARDS[selectedPreset.id]);
              }}
              onLocateOrigin={() => {
                setActiveSection('origin');
                setMobileTab('document');
              }}
              onUndo={handleUndo}
              onSelectSection={setActiveSection}
              onStartEdit={handleStartEdit}
              onConfirmField={handleConfirmField}
              onToggleChemMech={() => setIsChemMechCollapsed((c) => !c)}
            />
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

          <WorkbenchBottomBar
            isOffSpec={isOffSpec}
            canApprove={canApprove}
            unconfirmedCount={unconfirmedFields.length}
            heatNumber={selectedPreset.heatNumber}
            onReject={() => setIsRejectModalOpen(true)}
            onRequestScan={() =>
              toast.info(
                'Upload Requested',
                'Request sent to mill supplier for a higher-resolution 3.1 PDF scan.'
              )
            }
            onApprove={() =>
              toast.success(
                'Certificate Approved',
                `Heat #${selectedPreset.heatNumber} queued for Clause 6 QA Sign-Off.`
              )
            }
            onProceedToStep3={() => {
              toast.success('Proceeding to Shipment', 'Heat checked. Assign to export shipment.');
              setCurrentStep(3);
            }}
          />
        </>
      )}

      <WorkbenchModalsAndSteps34
        currentStep={currentStep}
        heatNumber={selectedPreset.heatNumber}
        selectedStandard={selectedStandard}
        selectedShipment={selectedShipment}
        onSelectedShipmentChange={setSelectedShipment}
        allocatedTonnes={allocatedTonnes}
        onAllocatedTonnesChange={setAllocatedTonnes}
        onStepChange={setCurrentStep}
        isSealed={isSealed}
        onIsSealedChange={setIsSealed}
        inspectorTotp={inspectorTotp}
        onInspectorTotpChange={setInspectorTotp}
        editingFieldId={editingFieldId}
        editValue={editValue}
        onEditValueChange={setEditValue}
        onCloseEdit={() => setEditingFieldId(null)}
        onSaveEdit={handleSaveEdit}
        isRejectModalOpen={isRejectModalOpen}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onCloseReject={() => setIsRejectModalOpen(false)}
        onConfirmReject={() => {
          toast.error(
            'Certificate Rejected',
            rejectReason || 'Rejected for metallurgical non-compliance.'
          );
          setIsRejectModalOpen(false);
        }}
        isBuyerSpecModalOpen={isBuyerSpecModalOpen}
        onCloseBuyerSpec={() => setIsBuyerSpecModalOpen(false)}
      />
    </div>
  );
};
