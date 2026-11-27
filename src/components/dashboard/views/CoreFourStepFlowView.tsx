import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Camera,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  Share2,
  ShieldCheck,
  RotateCcw,
  QrCode,
  Building2,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { GlossaryTooltip } from '../../ui/GlossaryTooltip';
import { useToast } from '../../ui/ToastContext';

export type FlowStep = 1 | 2 | 3 | 4;

interface CoreReviewField {
  id: string;
  label: string;
  value: string;
  confidence: number;
  isConfirmed: boolean;
  boxCoords?: { top: number; left: number; width: number; height: number };
}

interface ShipmentCandidate {
  id: string;
  buyer: string;
  port: string;
  allocatedTonnes: number;
  totalTonnes: number;
  isCountryVerified: boolean;
  isHeatLinked: boolean;
  isWithinMassBalance: boolean;
}

export const CoreFourStepFlowView: React.FC<{
  onComplete?: () => void;
  onOpenVerifyPage?: () => void;
}> = ({ onComplete, onOpenVerifyPage }) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Step State
  const [currentStep, setCurrentStep] = useState<FlowStep>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('SAMPLE_MTC_TS-88190.pdf');
  const [selectedHighlightField, setSelectedHighlightField] = useState<string | null>(null);
  const [isChemistryOpen, setIsChemistryOpen] = useState<boolean>(false);
  const [allocatedTonnes, setAllocatedTonnes] = useState<number>(24.5);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('SHP-2026-0881');
  const [isSealedWithTotp, setIsSealedWithTotp] = useState<boolean>(false);
  const [totpCode, setTotpCode] = useState<string>('');
  const [lastUndoAction, setLastUndoAction] = useState<{ fieldId: string; prevValue: boolean } | null>(null);

  // 8 Essential Fields (Prompt M2 Requirement)
  const [fields, setFields] = useState<CoreReviewField[]>([
    { id: 'mill', label: 'Manufacturer Mill', value: 'Tata Steel Jamshedpur Works', confidence: 99, isConfirmed: true, boxCoords: { top: 12, left: 15, width: 45, height: 6 } },
    { id: 'heat_number', label: 'Heat Number', value: 'TS-88190-A', confidence: 98, isConfirmed: true, boxCoords: { top: 22, left: 20, width: 30, height: 5 } },
    { id: 'grade', label: 'Steel Grade', value: 'S275JR (EN 10025-2)', confidence: 96, isConfirmed: true, boxCoords: { top: 30, left: 20, width: 35, height: 5 } },
    { id: 'product', label: 'Product Type', value: 'Hot Rolled Structural Flange Beam', confidence: 94, isConfirmed: true, boxCoords: { top: 38, left: 18, width: 50, height: 5 } },
    { id: 'size', label: 'Dimensions / Size', value: '300 x 150 x 6.5 mm (12m length)', confidence: 92, isConfirmed: true, boxCoords: { top: 45, left: 20, width: 42, height: 5 } },
    { id: 'quantity', label: 'Quantity (Tonnes)', value: '48.50 t', confidence: 95, isConfirmed: true, boxCoords: { top: 52, left: 25, width: 25, height: 5 } },
    { id: 'melt_country', label: 'Country of Melt and Pour', value: 'IN (India)', confidence: 82, isConfirmed: false, boxCoords: { top: 60, left: 18, width: 38, height: 6 } },
    { id: 'test_date', label: 'Inspection / Test Date', value: '14 Oct 2026', confidence: 97, isConfirmed: true, boxCoords: { top: 70, left: 22, width: 28, height: 5 } },
  ]);

  // Secondary Chemistry & Mechanical Data (Collapsed by default)
  const chemistryData = [
    { element: 'C', value: '0.18%', status: 'PASS' },
    { element: 'Mn', value: '1.42%', status: 'PASS' },
    { element: 'Si', value: '0.24%', status: 'PASS' },
    { element: 'P', value: '0.022%', status: 'PASS' },
    { element: 'S', value: '0.015%', status: 'PASS' },
    { element: 'Yield (Re)', value: '315 MPa', status: 'PASS' },
    { element: 'Tensile (Rm)', value: '475 MPa', status: 'PASS' },
    { element: 'Elongation (A)', value: '26%', status: 'PASS' },
  ];

  // Shipments for Step 3
  const shipment: ShipmentCandidate = {
    id: selectedShipmentId,
    buyer: 'EuroStahl Trading GmbH',
    port: 'Rotterdam (NL)',
    allocatedTonnes: allocatedTonnes,
    totalTonnes: 50.0,
    isCountryVerified: fields.find((f) => f.id === 'melt_country')?.isConfirmed || false,
    isHeatLinked: true,
    isWithinMassBalance: allocatedTonnes <= 48.5,
  };

  // Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFileName(file.name);
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setCurrentStep(2);
        toast.success(`Read ${file.name}: 8 fields extracted`);
      }, 750);
    }
  };

  const confirmField = (id: string) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          setLastUndoAction({ fieldId: id, prevValue: f.isConfirmed });
          return { ...f, isConfirmed: true };
        }
        return f;
      })
    );
    toast.success('Field confirmed');
  };

  const handleUndo = () => {
    if (lastUndoAction) {
      setFields((prev) =>
        prev.map((f) => (f.id === lastUndoAction.fieldId ? { ...f, isConfirmed: lastUndoAction.prevValue } : f))
      );
      setLastUndoAction(null);
      toast.info('Action undone');
    }
  };

  const handleSealDossier = () => {
    if (totpCode.trim().length === 6) {
      setIsSealedWithTotp(true);
      toast.success('Dossier cryptographically sealed with inspector TOTP');
    } else {
      toast.error('Enter 6-digit TOTP code to seal');
    }
  };

  const unconfirmedCount = fields.filter((f) => !f.isConfirmed).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 font-sans text-[#18181A]">
      {/* 4-Step Interactive Progress Bar */}
      <nav aria-label="Core 4-Step Process" className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-3 sm:p-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto relative">
          <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-px bg-[#18181A]/15 -z-0" />
          {[
            { step: 1, title: 'Upload' },
            { step: 2, title: 'Review' },
            { step: 3, title: 'Shipment' },
            { step: 4, title: 'Download' },
          ].map((item) => {
            const isPassed = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setCurrentStep(item.step as FlowStep)}
                className="relative z-10 flex flex-col items-center gap-1.5 bg-[#FCFBF8] px-2 cursor-pointer group"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-colors ${
                    isPassed
                      ? 'bg-[#059669] text-[#FCFBF8]'
                      : isCurrent
                      ? 'bg-[#059669]/15 text-[#047857] border border-[#059669]'
                      : 'bg-[#EFECE5] text-[#78766E] border border-[#18181A]/15'
                  }`}
                >
                  {isPassed ? <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} /> : item.step}
                </div>
                <span className={`text-xs font-medium ${isCurrent ? 'text-[#18181A]' : 'text-[#55544E]'}`}>
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* STEP 1: UPLOAD (Clean, Large Dropzone, One decision) */}
      {currentStep === 1 && (
        <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-6 sm:p-10 text-center space-y-6">
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-medium tracking-tight text-[#18181A]">Upload Mill Test Certificate</h2>
            <p className="text-xs text-[#55544E]">
              Drop an authentic factory MTC or snap a phone photo. We read heat numbers and country of melt in seconds.
            </p>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-[#18181A]/25 hover:border-[#059669] rounded-xl p-8 sm:p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors bg-[#F7F5F0]"
          >
            <div className="w-12 h-12 rounded-xl bg-[#059669]/10 border border-[#059669]/20 text-[#047857] flex items-center justify-center">
              <Upload className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-[#18181A]">
                Click to browse or drag file here
              </div>
              <div className="text-xs text-[#55544E] font-mono">
                Accepted: PDF, PNG, JPEG (Max 10 MB)
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsProcessing(true);
                setTimeout(() => {
                  setIsProcessing(false);
                  setCurrentStep(2);
                }, 400);
              }}
              className="w-full sm:w-auto h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4" strokeWidth={1.5} />
              <span>Use Sample MTC (Tata Steel TS-88190)</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto h-9 px-4 rounded-lg border border-[#18181A]/15 bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
              <span>Snap Photo with Camera</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: REVIEW (Split View Desktop / Stacked Mobile, Only 8 Fields) */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#FCFBF8] px-4 py-3 rounded-xl border border-[#18181A]/10">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-[#059669] shrink-0" strokeWidth={1.5} />
              <span className="text-xs font-medium truncate text-[#18181A]">{uploadedFileName}</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#059669]/10 text-[#047857] border border-[#059669]/20">
                8 Fields Extracted
              </span>
            </div>
            {lastUndoAction && (
              <button
                type="button"
                onClick={handleUndo}
                className="text-xs text-[#55544E] hover:text-[#18181A] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Undo</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Original Document Preview with Bounding Box Overlay */}
            <div className="lg:col-span-5 bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-[#55544E] pb-2 border-b border-[#18181A]/10">
                <span className="font-medium text-[#18181A]">Original Certificate (Byte-Identical)</span>
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <Lock className="w-3 h-3 text-[#059669]" strokeWidth={1.5} /> SHA-256 Validated
                </span>
              </div>
              <div className="relative aspect-[3/4] bg-[#EFECE5] rounded-lg overflow-hidden border border-[#18181A]/10 flex items-center justify-center p-3 select-none">
                <div className="w-full h-full bg-[#FCFBF8] text-[#18181A] p-4 font-mono text-[9px] border border-[#18181A]/10 overflow-hidden relative leading-relaxed">
                  <div className="text-center font-medium text-xs pb-2 border-b border-[#18181A]/15">
                    TATA STEEL LIMITED — INSPECTION CERTIFICATE 3.1
                  </div>
                  <div className="mt-2 space-y-1">
                    <div>HEAT NUMBER: <span className="font-medium text-[#047857]">TS-88190-A</span></div>
                    <div>GRADE: S275JR | SPEC: EN 10025-2</div>
                    <div>COUNTRY OF MELT &amp; POUR: <span className="font-medium bg-amber-100 px-1">IN (INDIA)</span></div>
                    <div>QUANTITY: 48.50 MT | BUNDLES: 12</div>
                  </div>
                  {/* Dynamic Bounding Box Highlight */}
                  {selectedHighlightField && (
                    <motion.div
                      layoutId="pdf-highlight"
                      className="absolute border-2 border-[#059669] bg-[#059669]/15 rounded pointer-events-none"
                      style={{
                        top: '40%',
                        left: '10%',
                        width: '80%',
                        height: '18%',
                      }}
                    />
                  )}
                </div>
              </div>
              <p className="text-[11px] text-[#78766E] text-center">
                Tap any field on the right to locate its reading coordinates on the PDF.
              </p>
            </div>

            {/* Right: Only the 8 Fields That Matter */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#18181A]/10">
                  <h3 className="text-sm font-medium text-[#18181A]">Key Verification Fields</h3>
                  <span className="text-xs text-[#55544E]">
                    {unconfirmedCount === 0 ? (
                      <span className="text-[#047857] font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} /> All Confirmed
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium">
                        {unconfirmedCount} need human review
                      </span>
                    )}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {fields.map((field) => {
                    const isLowConfidence = field.confidence < 85 || !field.isConfirmed;
                    return (
                      <div
                        key={field.id}
                        onClick={() => setSelectedHighlightField(field.id)}
                        className={`p-3 rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                          isLowConfidence
                            ? 'bg-amber-50 border-amber-300'
                            : 'bg-[#F7F5F0] border-[#18181A]/10 hover:border-[#18181A]/25'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs text-[#55544E]">
                            <span>{field.label}</span>
                            {field.id === 'heat_number' && <GlossaryTooltip term="heat_number" iconOnly />}
                            {field.id === 'melt_country' && <GlossaryTooltip term="melt_pour" iconOnly />}
                          </div>
                          <div className="text-sm font-medium truncate text-[#18181A] mt-0.5">
                            {field.value}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-medium ${
                              field.confidence >= 90
                                ? 'bg-[#059669]/10 text-[#047857]'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {field.confidence}%
                          </span>

                          {!field.isConfirmed ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmField(field.id);
                              }}
                              className="h-8 px-2.5 rounded-md bg-amber-600 hover:bg-amber-700 text-[#FCFBF8] text-xs font-medium cursor-pointer transition-colors"
                            >
                              Confirm
                            </button>
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" strokeWidth={1.5} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Collapsed Chemistry & Mechanical Section */}
                <div className="pt-2 border-t border-[#18181A]/10">
                  <button
                    type="button"
                    onClick={() => setIsChemistryOpen(!isChemistryOpen)}
                    className="w-full flex items-center justify-between py-2 text-xs font-medium text-[#55544E] hover:text-[#18181A] cursor-pointer"
                  >
                    <span>Chemistry &amp; Mechanical Analysis (8 elements tested)</span>
                    {isChemistryOpen ? <ChevronUp className="w-4 h-4" strokeWidth={1.5} /> : <ChevronDown className="w-4 h-4" strokeWidth={1.5} />}
                  </button>

                  <AnimatePresence>
                    {isChemistryOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 overflow-hidden"
                      >
                        {chemistryData.map((c) => (
                          <div key={c.element} className="p-2 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 text-xs">
                            <div className="text-[#78766E] font-mono text-[11px]">{c.element}</div>
                            <div className="font-medium text-[#18181A] mt-0.5">{c.value}</div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Navigation Action */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="h-9 px-3 rounded-lg text-xs font-medium text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Back to Upload
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  disabled={unconfirmedCount > 0}
                  className={`h-9 px-4 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                    unconfirmedCount === 0
                      ? 'bg-[#059669] hover:bg-[#047857] text-[#FCFBF8]'
                      : 'bg-[#EFECE5] text-[#78766E] cursor-not-allowed'
                  }`}
                >
                  <span>Add to Shipment</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: ADD TO SHIPMENT (Choose or create shipment, enter tonnes, readiness checklist) */}
      {currentStep === 3 && (
        <div className="max-w-xl mx-auto bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-medium text-[#18181A]">Link Heat to Export Shipment</h2>
            <p className="text-xs text-[#55544E]">
              Allocate verified tonnage from heat <span className="font-mono font-medium text-[#18181A]">TS-88190-A</span> to an outgoing customs container.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#55544E] mb-1">
                Select Export Shipment
              </label>
              <select
                value={selectedShipmentId}
                onChange={(e) => setSelectedShipmentId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#18181A]/15 bg-[#F7F5F0] text-[#18181A] text-xs font-medium focus:outline-none focus:border-[#059669]"
              >
                <option value="SHP-2026-0881">SHP-2026-0881 · EuroStahl Trading (Rotterdam)</option>
                <option value="SHP-2026-0912">SHP-2026-0912 · Deutsche Bahn Logistics (Hamburg)</option>
                <option value="SHP-2026-1044">SHP-2026-1044 · British Steel Fabricators (Felixstowe)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-[#55544E]">Tonnage to Allocate</span>
                <span className="text-[#78766E] font-mono">Available: 48.50 t</span>
              </div>
              <input
                type="number"
                step="0.5"
                max={48.5}
                value={allocatedTonnes}
                onChange={(e) => setAllocatedTonnes(parseFloat(e.target.value) || 0)}
                className="w-full h-9 px-3 rounded-lg border border-[#18181A]/15 bg-[#F7F5F0] text-[#18181A] text-sm font-mono font-medium focus:outline-none focus:border-[#059669]"
              />
            </div>

            {/* Readiness Checklist (Red / Green) */}
            <div className="p-4 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 space-y-2.5">
              <div className="text-xs font-medium text-[#18181A]">Readiness Gate Checks</div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[#55544E]">
                    <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} /> Country of Melt &amp; Pour Verified
                  </span>
                  <span className="text-[#047857] font-medium text-[11px]">IN (India)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[#55544E]">
                    <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} /> Ladle Heat Linked to Invoices
                  </span>
                  <span className="text-[#047857] font-medium text-[11px]">Linked</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[#55544E]">
                    {allocatedTonnes <= 48.5 ? (
                      <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={1.5} />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-700" strokeWidth={1.5} />
                    )}
                    Anti-Phantom Mass Balance Check
                  </span>
                  <span className={allocatedTonnes <= 48.5 ? 'text-[#047857] font-medium text-[11px]' : 'text-rose-700 font-medium text-[11px]'}>
                    {allocatedTonnes <= 48.5 ? 'Passed' : 'Over-Allocated'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="h-9 px-3 rounded-lg text-xs font-medium text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Back to Review
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              disabled={allocatedTonnes > 48.5}
              className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-[#FCFBF8] text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>Build Buyer Pack</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: DOWNLOAD (Buyer Pack, 1-page summary, QR link, TOTP inspector seal) */}
      {currentStep === 4 && (
        <div className="max-w-xl mx-auto bg-[#FCFBF8] rounded-xl border border-[#18181A]/10 p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-medium text-[#18181A]">Buyer Compliance Pack Ready</h2>
            <p className="text-xs text-[#55544E]">
              Contains the byte-identical original MTC, single-page customs summary, and tamper-evident digital seal.
            </p>
          </div>

          {/* Inspector Seal Step-Up Box */}
          <div className="p-4 rounded-lg bg-[#F7F5F0] border border-[#18181A]/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#18181A] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#059669]" strokeWidth={1.5} /> Inspector Cryptographic Seal
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#059669]/10 text-[#047857] border border-[#059669]/20">
                Ed25519
              </span>
            </div>

            {!isSealedWithTotp ? (
              <div className="space-y-2">
                <p className="text-xs text-[#55544E]">
                  Enter your 6-digit inspector authenticator code to affix the digital seal.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 123456"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg border border-[#18181A]/15 bg-[#FCFBF8] text-[#18181A] text-sm font-mono tracking-widest text-center focus:outline-none focus:border-[#059669]"
                  />
                  <button
                    type="button"
                    onClick={handleSealDossier}
                    className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] text-xs font-medium cursor-pointer transition-colors"
                  >
                    Seal Dossier
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-[#059669]/10 border border-[#059669]/20 text-xs text-[#047857] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" strokeWidth={1.5} />
                <span>Sealed by authorised QA inspector R. K. Chatterjee (QA-04).</span>
              </div>
            )}
          </div>

          {/* Pack Download & Sharing Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                toast.success('Downloading Buyer Pack (ZIP)...');
                const link = document.createElement('a');
                link.href = '#';
                link.setAttribute('download', `BUYER_PACK_${selectedShipmentId}.zip`);
              }}
              className="w-full h-10 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
              <span>Download Complete Buyer Pack (ZIP)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                toast.success('Public customs link copied to clipboard');
                navigator.clipboard?.writeText(`https://heatledger.ai/share/tok_${selectedShipmentId}`);
              }}
              className="w-full h-9 rounded-lg border border-[#18181A]/15 bg-[#FCFBF8] hover:bg-[#EFECE5] text-[#18181A] text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-[#55544E]" strokeWidth={1.5} />
              <span>Copy Customs Share Link</span>
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setCurrentStep(1);
                setTotpCode('');
                setIsSealedWithTotp(false);
                toast.info('Reset flow for next certificate');
              }}
              className="text-xs text-[#55544E] hover:text-[#18181A] cursor-pointer"
            >
              Process Another Certificate
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
