import React from 'react';
import { useToast } from '../../../ui/ToastContext';
import {
  WorkbenchStep3Allocate,
  WorkbenchStep4Download,
} from './WorkbenchSteps3And4';
import {
  WorkbenchQuickEditModal,
  WorkbenchRejectModal,
} from './WorkbenchModals';
import { BuyerSpecCheckModal } from '../../compliance/BuyerSpecCheckModal';

interface WorkbenchModalsAndSteps34Props {
  currentStep: 1 | 2 | 3 | 4;
  heatNumber: string;
  selectedStandard: string;
  selectedShipment: string;
  onSelectedShipmentChange: (val: string) => void;
  allocatedTonnes: number;
  onAllocatedTonnesChange: (val: number) => void;
  onStepChange: (step: 1 | 2 | 3 | 4) => void;
  isSealed: boolean;
  onIsSealedChange: (sealed: boolean) => void;
  inspectorTotp: string;
  onInspectorTotpChange: (totp: string) => void;
  editingFieldId: string | null;
  editValue: string;
  onEditValueChange: (val: string) => void;
  onCloseEdit: () => void;
  onSaveEdit: () => void;
  isRejectModalOpen: boolean;
  rejectReason: string;
  onRejectReasonChange: (val: string) => void;
  onCloseReject: () => void;
  onConfirmReject: () => void;
  isBuyerSpecModalOpen: boolean;
  onCloseBuyerSpec: () => void;
}

export const WorkbenchModalsAndSteps34: React.FC<WorkbenchModalsAndSteps34Props> = ({
  currentStep,
  heatNumber,
  selectedStandard,
  selectedShipment,
  onSelectedShipmentChange,
  allocatedTonnes,
  onAllocatedTonnesChange,
  onStepChange,
  isSealed,
  onIsSealedChange,
  inspectorTotp,
  onInspectorTotpChange,
  editingFieldId,
  editValue,
  onEditValueChange,
  onCloseEdit,
  onSaveEdit,
  isRejectModalOpen,
  rejectReason,
  onRejectReasonChange,
  onCloseReject,
  onConfirmReject,
  isBuyerSpecModalOpen,
  onCloseBuyerSpec,
}) => {
  const toast = useToast();

  return (
    <>
      {editingFieldId && (
        <WorkbenchQuickEditModal
          editValue={editValue}
          onEditValueChange={onEditValueChange}
          onClose={onCloseEdit}
          onSave={onSaveEdit}
        />
      )}

      {isRejectModalOpen && (
        <WorkbenchRejectModal
          rejectReason={rejectReason}
          onRejectReasonChange={onRejectReasonChange}
          onClose={onCloseReject}
          onConfirmReject={onConfirmReject}
        />
      )}

      {currentStep === 3 && (
        <WorkbenchStep3Allocate
          heatNumber={heatNumber}
          selectedShipment={selectedShipment}
          onSelectedShipmentChange={onSelectedShipmentChange}
          allocatedTonnes={allocatedTonnes}
          onAllocatedTonnesChange={onAllocatedTonnesChange}
          onBack={() => onStepChange(2)}
          onConfirmAllocate={() => {
            toast.success('Heat Allocated', `Allocated ${allocatedTonnes} MT to ${selectedShipment}.`);
            onStepChange(4);
          }}
        />
      )}

      {currentStep === 4 && (
        <WorkbenchStep4Download
          isSealed={isSealed}
          inspectorTotp={inspectorTotp}
          onInspectorTotpChange={onInspectorTotpChange}
          onApplySeal={() => {
            if (inspectorTotp.length === 6) {
              onIsSealedChange(true);
              toast.success(
                'Pack Digitally Sealed',
                'Cryptographic Ed25519 seal applied with inspector timestamp.'
              );
            } else {
              toast.error('Invalid TOTP', 'Please enter a 6-digit authenticator code.');
            }
          }}
          onBack={() => onStepChange(3)}
          onDownloadPdf={() =>
            toast.success('Download Started', 'Downloading combined buyer pack PDF.')
          }
          onDownloadZip={() =>
            toast.success('Download Started', 'Downloading buyer pack ZIP archive.')
          }
          onResetFlow={() => {
            onStepChange(1);
            onIsSealedChange(false);
            onInspectorTotpChange('');
          }}
        />
      )}

      <BuyerSpecCheckModal
        isOpen={isBuyerSpecModalOpen}
        onClose={onCloseBuyerSpec}
        heatNumber={heatNumber}
        initialGrade={selectedStandard}
      />
    </>
  );
};
