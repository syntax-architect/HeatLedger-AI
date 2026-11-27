import React from 'react';
import { Lock, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { SimulatorPreset } from '../../../../types';
import { LaserScanBeam } from '../../../effects/LaserScanBeam';
import { InspectionSection } from './workbenchHelpers';

interface ChemicalStatusItem {
  symbol: string;
  measured: number;
  status: string;
}

interface WorkbenchDocumentCanvasProps {
  mobileTab: 'document' | 'fields';
  sha256Hash: string;
  uploadedFileName: string | null;
  selectedPreset: SimulatorPreset;
  zoomLevel: number;
  rotationDeg: number;
  isProcessingOcr: boolean;
  activeSection: InspectionSection | null;
  activeChemistry: ChemicalStatusItem[];
  uploadTimestamp: string;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onResetTransform: () => void;
  onDoubleClickSheet: () => void;
  onSelectSection: (section: InspectionSection) => void;
}

export const WorkbenchDocumentCanvas: React.FC<WorkbenchDocumentCanvasProps> = ({
  mobileTab,
  sha256Hash,
  uploadedFileName,
  selectedPreset,
  zoomLevel,
  rotationDeg,
  isProcessingOcr,
  activeSection,
  activeChemistry,
  uploadTimestamp,
  onZoomIn,
  onZoomOut,
  onRotate,
  onResetTransform,
  onDoubleClickSheet,
  onSelectSection,
}) => {
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
    <div className={`lg:col-span-6 ${mobileTab === 'document' ? 'block' : 'hidden lg:block'}`}>
      <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 overflow-hidden">
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
              onClick={onZoomOut}
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
              onClick={onZoomIn}
              className="w-8 h-8 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#55544E] hover:text-[#18181A] border border-[#18181A]/12 flex items-center justify-center cursor-pointer"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={onRotate}
              className="w-8 h-8 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#55544E] hover:text-[#18181A] border border-[#18181A]/12 flex items-center justify-center ml-1 cursor-pointer"
              title="Rotate 90°"
              aria-label="Rotate 90 degrees"
            >
              <RotateCw className="w-4 h-4" strokeWidth={1.5} />
            </button>
            {(zoomLevel !== 1 || rotationDeg !== 0) && (
              <button
                type="button"
                onClick={onResetTransform}
                className="px-2 h-8 rounded-lg bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#55544E] hover:text-[#18181A] border border-[#18181A]/12 text-xs font-medium cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-[#EFECE5] overflow-auto">
          <div
            className="relative bg-[#FFFFFF] text-[#18181A] rounded-lg border border-[#18181A]/15 p-5 sm:p-6 space-y-5 select-none transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              transform: `scale(${zoomLevel}) rotate(${rotationDeg}deg)`,
              transformOrigin: 'top center',
            }}
            onDoubleClick={onDoubleClickSheet}
          >
            <LaserScanBeam isScanning={isProcessingOcr} />

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

            <div
              onClick={() => onSelectSection('origin')}
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

            <div
              onClick={() => onSelectSection('chemistry')}
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
                      <span className="block text-xs text-[#55544E] font-mono">{el.symbol}</span>
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

            <div
              onClick={() => onSelectSection('mechanical')}
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

            <div
              onClick={() => onSelectSection('stamp')}
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

        <div className="px-4 py-2.5 bg-[#F7F5F0] border-t border-[#18181A]/10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#55544E]">
          <span>Byte-identical original preservation · {uploadTimestamp}</span>
          <span className="font-mono tabular-nums text-[#047857] font-medium">Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
};
