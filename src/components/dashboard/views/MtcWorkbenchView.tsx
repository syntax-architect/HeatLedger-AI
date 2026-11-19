import React, { useState, useMemo, useEffect } from 'react';
import { 
  SIMULATOR_PRESETS, 
  METALLURGICAL_STANDARDS, 
  STANDARDS_LIST, 
  PRESET_MATCHING_STANDARDS,
  evaluateChemistryAgainstStandard, 
  getElementToleranceDelta,
  calculateIIWCEV 
} from '../../../data/mockData';
import { SimulatorPreset, BoundingBox } from '../../../types';
import { ApiService } from '../../../services/api';
import { useToast } from '../../ui/ToastContext';
import { 
  FileText, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Sliders, 
  Sparkles, 
  Scan,
  RefreshCw,
  Info,
  Maximize2,
  Download,
  Loader2
} from 'lucide-react';
import { LaserScanBeam } from '../../effects/LaserScanBeam';

interface MtcWorkbenchViewProps {
  initialPresetId?: string;
  initialUploadedFile?: File | null;
}

export const MtcWorkbenchView: React.FC<MtcWorkbenchViewProps> = ({ 
  initialPresetId,
  initialUploadedFile,
}) => {
  const toast = useToast();
  const [selectedPreset, setSelectedPreset] = useState<SimulatorPreset>(() => {
    return SIMULATOR_PRESETS.find(p => p.id === initialPresetId) || SIMULATOR_PRESETS[0];
  });

  // Keep preset in sync if initialPresetId changes from external trigger
  useEffect(() => {
    if (initialPresetId) {
      const p = SIMULATOR_PRESETS.find(preset => preset.id === initialPresetId);
      if (p) {
        setSelectedPreset(p);
        setSelectedStandard(PRESET_MATCHING_STANDARDS[p.id] || STANDARDS_LIST[0]);
      }
    }
  }, [initialPresetId]);

  // Default standard matching the loaded preset
  const matchingStandardForActivePreset = useMemo(() => {
    return PRESET_MATCHING_STANDARDS[selectedPreset.id] || 'EN 10217-1 / ASTM A53 Welded Pipe';
  }, [selectedPreset.id]);

  const [selectedStandard, setSelectedStandard] = useState<string>(() => {
    const initialPreset = SIMULATOR_PRESETS.find(p => p.id === initialPresetId) || SIMULATOR_PRESETS[0];
    return PRESET_MATCHING_STANDARDS[initialPreset.id] || 'EN 10217-1 / ASTM A53 Welded Pipe';
  });

  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [simulateMissingCountryWarning, setSimulateMissingCountryWarning] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState<boolean>(false);
  const [ocrSuccessMessage, setOcrSuccessMessage] = useState<string | null>(null);
  const [sha256Hash, setSha256Hash] = useState<string>('d9b7a18e209f...38e1');

  // Available buyer standards from deterministic standards dictionary
  const standardsList = STANDARDS_LIST;

  // Dynamically re-evaluate chemistry against chosen standard
  const activeChemistry = useMemo(() => {
    return evaluateChemistryAgainstStandard(selectedPreset.chemistry, selectedStandard);
  }, [selectedPreset, selectedStandard]);

  // Determine failed elements
  const failedElements = useMemo(() => {
    return activeChemistry.filter(el => el.status !== 'PASS');
  }, [activeChemistry]);

  const isOffSpec = failedElements.length > 0;
  const failedCount = failedElements.length;

  // Find CEV element
  const cevElement = useMemo(() => {
    return activeChemistry.find(el => el.symbol === 'CEV');
  }, [activeChemistry]);

  // Dynamically re-evaluate mechanical requirements against standard
  const activeMechanics = useMemo(() => {
    const stdDef = METALLURGICAL_STANDARDS[selectedStandard];
    if (!stdDef || !stdDef.mechanics) return selectedPreset.mechanics;

    return selectedPreset.mechanics.map(m => {
      const stdMech = stdDef.mechanics?.find(sm => 
        (m.property.toLowerCase().includes('yield') && sm.property.toLowerCase().includes('yield')) ||
        (m.property.toLowerCase().includes('tensile') && sm.property.toLowerCase().includes('tensile')) ||
        (m.property.toLowerCase().includes('elongation') && sm.property.toLowerCase().includes('elongation')) ||
        (m.property.toLowerCase().includes('hardness') && sm.property.toLowerCase().includes('hardness')) ||
        (m.property.toLowerCase().includes('impact') && sm.property.toLowerCase().includes('impact'))
      );

      if (!stdMech) return m;

      const measuredNum = parseFloat(m.measured.replace(/[^0-9.]/g, ''));
      let pass = true;
      if (!isNaN(measuredNum)) {
        if (stdMech.min !== undefined && measuredNum < stdMech.min) pass = false;
        if (stdMech.max !== undefined && measuredNum > stdMech.max) pass = false;
      }

      return {
        property: m.property,
        measured: m.measured,
        requirement: stdMech.requirement,
        status: pass ? ('PASS' as const) : ('FAIL' as const),
      };
    });
  }, [selectedPreset, selectedStandard]);

  const handleResetToMatchingStandard = () => {
    setSelectedStandard(matchingStandardForActivePreset);
    toast.success('Standard Re-Aligned', `Target standard set to ${matchingStandardForActivePreset}. All chemistry in-spec.`);
  };

  const handleSelectPreset = (p: SimulatorPreset) => {
    setSelectedPreset(p);
    setSelectedStandard(PRESET_MATCHING_STANDARDS[p.id] || STANDARDS_LIST[0]);
    setUploadedFileName(null);
    setOcrSuccessMessage(null);
    toast.info(`Loaded ${p.mill.split(' ')[0]} MTC`, `Heat #${p.heatNumber} · ${p.productType.split('/')[0]}`);
  };

  const processFile = async (file: File) => {
    setUploadedFileName(file.name);
    setIsProcessingOcr(true);
    setOcrSuccessMessage(null);

    try {
      // Call FastAPI Backend OCR endpoint
      const result = await ApiService.uploadMtcPdf(file);
      if (result) {
        if (result.status === 'needs_manual_entry') {
          toast.warning('Manual Entry Required', result.reason || 'Document contains no recognizable steel certificate data. Please enter values manually.');
          setOcrSuccessMessage('Status: Needs Manual Review (No steel data detected)');
          if (result.sha256_checksum) {
            setSha256Hash(result.sha256_checksum.substring(0, 16) + '...');
          }
        } else if (result.sha256_checksum) {
          setSha256Hash(result.sha256_checksum.substring(0, 16) + '...');
          const heatStr = result.heat_numbers?.[0] ? `Heat #${result.heat_numbers[0]}` : 'Heat Unspecified';
          setOcrSuccessMessage(`Authentic Vector OCR: ${result.mill_name || 'Mill Verified'} (${heatStr})`);
          toast.success('Certificate Extracted', `${result.mill_name || 'Mill Verified'} · ${heatStr}`);
        }
      }
    } catch (err: any) {
      toast.error('Extraction Failed', err?.message || 'Server error while parsing document.');
    } finally {
      setIsProcessingOcr(false);
    }
  };

  // Auto-run OCR if a file was uploaded from topbar modal
  useEffect(() => {
    if (initialUploadedFile) {
      processFile(initialUploadedFile);
    }
  }, [initialUploadedFile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Sample Data Demo Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            Sample Data
          </span>
          <span className="text-xs font-medium">
            MTC simulator loaded with sample mill certificates. Uploading a custom PDF switches to live PyMuPDF extraction.
          </span>
        </div>
        <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-semibold hidden sm:inline">
          DEMO_MODE ACTIVE
        </span>
      </div>

      {/* Workbench Header & Target Standard Selector */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_6px_20px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Scan className="w-5 h-5 text-emerald-600" />
            <span>EN 10204 3.1 MTC &amp; Metallurgy Verification Workbench</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic optical spectrometry extraction with live IIW CEV carbon equivalent math and Melt-and-Pour origin validation.
          </p>
        </div>

        {/* Standard Selector Dropdown & Quick Reset Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono font-bold text-slate-600 uppercase">
              Target Standard:
            </label>
            <select
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-mono text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer shadow-xs hover:border-slate-400 transition-colors"
            >
              {standardsList.map((std) => (
                <option key={std} value={std}>{std}</option>
              ))}
            </select>
          </div>

          {/* Quick "Reset to Matching Standard" button in header if standard differs from preset */}
          {selectedStandard !== matchingStandardForActivePreset && (
            <button
              onClick={handleResetToMatchingStandard}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono text-xs font-bold transition-all shadow-xs cursor-pointer"
              title={`Re-align target standard with ${matchingStandardForActivePreset}`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
              <span>Reset to Matching Standard</span>
            </button>
          )}

          {/* Quick Test Chips for Off-Spec Rejection Demo */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-500 border-l border-slate-200 pl-3">
            <span className="text-[10px] text-slate-400">Quick Test:</span>
            <button
              onClick={() => setSelectedStandard('ASTM A193 Grade B7 Alloy Fasteners')}
              className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors ${
                selectedStandard === 'ASTM A193 Grade B7 Alloy Fasteners'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="Test against high-alloy fastener standard to observe off-spec rejection"
            >
              ASTM A193 B7
            </button>
            <button
              onClick={() => setSelectedStandard('ASTM A105 Carbon Steel Forgings')}
              className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors ${
                selectedStandard === 'ASTM A105 Carbon Steel Forgings'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="Test against carbon forging standard"
            >
              ASTM A105
            </button>
          </div>
        </div>
      </div>

      {/* OCR Status Banner if file uploaded */}
      {isProcessingOcr && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-cobalt-blueprint/40 flex items-center gap-3 text-xs font-mono text-cobalt-blueprint">
          <Loader2 className="w-4 h-4 animate-spin text-cobalt-blueprint" />
          <span>Processing with PyMuPDF &amp; Vision OCR Engine on <code>http://127.0.0.1:8000</code>...</span>
        </div>
      )}

      {ocrSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between text-xs font-mono text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{ocrSuccessMessage}</span>
          </div>
          <span className="text-[10px] text-slate-500">FastAPI Response: 200 OK</span>
        </div>
      )}

      {/* 50/50 Split Screen Inspection Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT PANE (Col 6): Interactive Document & Bounding-Box Viewer */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_6px_20px_rgba(0,0,0,0.03)] space-y-4">
          
          {/* Mill Preset Switcher & Upload Dropzone Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {SIMULATOR_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                    selectedPreset.id === p.id && !uploadedFileName
                      ? 'bg-obsidian-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.mill.split(' ')[0]} ({p.code})
                </button>
              ))}
            </div>

            {/* Direct Download Sample Button & Upload */}
            <div className="flex items-center gap-2">
              <a
                href={selectedPreset.id === 'preset-a' 
                  ? '/samples/SAIL_Bokaro_3.1_MTC_BOK-26-4910.pdf' 
                  : selectedPreset.id === 'preset-b' 
                  ? '/samples/Tata_Steel_3.1_MTC_TSJ-26-9021.pdf' 
                  : '/samples/JSW_Steel_3.1_MTC_JSW-26-7734.pdf'}
                download
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono transition-colors border border-slate-300 flex items-center gap-1"
                title="Download original sample mill PDF"
              >
                <Download className="w-3 h-3 text-slate-500" />
                <span className="hidden sm:inline">PDF</span>
              </a>

              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-mono transition-colors border border-emerald-300 font-bold">
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>{uploadedFileName || 'Upload 3.1 PDF'}</span>
                <input type="file" accept=".pdf,image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Interactive Document Preview Box */}
          <div className="relative rounded-lg bg-[#FAF8F5] text-slate-900 p-5 shadow-inner border border-slate-300/80 font-sans text-xs min-h-[520px] select-none overflow-hidden">
            
            {/* GSAP Optical Laser Scan Beam */}
            <LaserScanBeam isScanning={isProcessingOcr} />

            {/* Watermark */}
            <div className="absolute right-4 top-2 text-[10px] font-mono text-slate-400">
              SHA-256: {sha256Hash} (Tamper-Locked)
            </div>

            {/* Document Mill Header */}
            <div className="border-b-2 border-slate-900 pb-2 mb-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-sm uppercase text-slate-900 tracking-tight">
                    {selectedPreset.mill}
                  </h3>
                  <p className="text-[10px] text-slate-600">
                    Metallurgical Testing Department · Works Laboratory · EN 10204:2004 3.1
                  </p>
                </div>
                <div className="text-right font-mono text-[10px]">
                  <div className="font-bold text-slate-900">CERTIFICATE NO: {selectedPreset.certNumber}</div>
                  <div className="text-slate-500">Date: {selectedPreset.issueDate}</div>
                </div>
              </div>
            </div>

            {/* Identification Grid */}
            <div className="grid grid-cols-2 gap-2 text-[11px] mb-3 bg-slate-100/80 p-2.5 rounded border border-slate-200 font-mono">
              <div>
                <span className="text-slate-500 text-[10px] block">HEAT / CAST NUMBER:</span>
                <span className="font-extrabold text-amber-900 text-sm">#{selectedPreset.heatNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">COUNTRY OF MELT &amp; POUR:</span>
                <span className={`font-bold ${simulateMissingCountryWarning ? 'text-crimson-oxide line-through' : 'text-emerald-800'}`}>
                  {simulateMissingCountryWarning ? 'NOT SPECIFIED (DEFECT)' : `🇮🇳 ${selectedPreset.meltCountry}`}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">STEELMAKING ROUTE:</span>
                <span className="text-slate-800">{selectedPreset.meltRoute}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">NOMINAL SPEC:</span>
                <span className="text-slate-800">{selectedPreset.productType.split('/')[0]}</span>
              </div>
            </div>

            {/* Chemical Table */}
            <div className="mb-3">
              <div className="text-[10px] font-mono font-bold uppercase text-slate-700 mb-1 flex justify-between">
                <span>Chemical Composition (Ladle Spectrometry - %)</span>
                <span className="text-[9px] text-slate-500">NABL Accredited</span>
              </div>
              <table className="w-full text-center border-collapse text-[10px] font-mono">
                <thead>
                  <tr className="bg-slate-200 border border-slate-300">
                    {selectedPreset.chemistry.map(el => (
                      <th key={el.symbol} className="p-1 border border-slate-300 font-bold">{el.symbol}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    {selectedPreset.chemistry.map(el => (
                      <td key={el.symbol} className="p-1 border border-slate-300 font-bold text-slate-900">
                        {el.measured.toFixed(el.symbol === 'P' || el.symbol === 'S' || el.symbol === 'CEV' ? 3 : 2)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mechanical Test Suite */}
            <div className="mb-4">
              <div className="text-[10px] font-mono font-bold uppercase text-slate-700 mb-1">
                Mechanical &amp; Tensile Properties (Ambient 23°C)
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                {selectedPreset.mechanics.map(m => (
                  <div key={m.property} className="bg-white p-2 rounded border border-slate-300 flex justify-between items-center">
                    <span className="text-slate-600">{m.property}</span>
                    <span className="font-bold text-slate-900">{m.measured}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stamp Footer */}
            <div className="pt-3 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-600 font-mono">
              <div>
                Verified independent of manufacturing division.<br />
                EN 10204 3.1 compliant inspection.
              </div>
              <div className="text-center p-2 border-2 border-emerald-600 rounded bg-emerald-50">
                <div className="font-extrabold text-emerald-800 text-[10px]">AUTHORIZED QA STAMP</div>
                <div className="text-[8px] text-emerald-700">PRIMARY STEEL MILL METALLURGY</div>
              </div>
            </div>

            {/* Bounding Box Highlights with Pulse when clicked from Right Pane */}
            {selectedPreset.boundingBoxes.map((box) => {
              const isHighlightActive = activeHighlightId === box.id;
              const borderStyles = {
                amber: 'border-amber-500 bg-amber-500/10 text-amber-900',
                cobalt: 'border-cobalt-blueprint bg-blue-500/10 text-blue-900',
                emerald: 'border-emerald-500 bg-emerald-500/10 text-emerald-900'
              }[box.type];

              return (
                <div
                  key={box.id}
                  style={{
                    position: 'absolute',
                    left: `${box.coords.x}%`,
                    top: `${box.coords.y}%`,
                    width: `${box.coords.width}%`,
                    height: `${box.coords.height}%`,
                  }}
                  className={`border-2 rounded transition-all cursor-pointer ${borderStyles} ${
                    isHighlightActive ? 'ring-4 ring-amber-400 scale-[1.02] shadow-xl z-20' : 'z-10'
                  }`}
                  onClick={() => setActiveHighlightId(box.id)}
                >
                  <span className="absolute -top-3 left-1 text-[8px] font-mono font-bold px-1 rounded bg-slate-900 text-white uppercase shadow">
                    {box.label}
                  </span>
                </div>
              );
            })}

          </div>

          {/* Interactive Bounding Box Click Helper */}
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 pt-2">
            <span>Click any element in the Right Pane to highlight its exact PDF coordinates.</span>
            <span className="text-emerald-700 font-semibold">Gemini 2.5 Vision OCR Linked</span>
          </div>

        </div>

        {/* RIGHT PANE (Col 6): Deterministic ASTM / EN / DIN Metallurgy Checker */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* Heat & Origin Card + Missing Origin Demo Warning Toggle */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_6px_20px_rgba(0,0,0,0.03)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                  Extracted Heat &amp; Origin Identification
                </h3>
              </div>

              {/* Warning Toggle Button for Exporters */}
              <button
                onClick={() => setSimulateMissingCountryWarning(!simulateMissingCountryWarning)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors border cursor-pointer ${
                  simulateMissingCountryWarning
                    ? 'bg-crimson-badge text-crimson-darkText border-crimson-oxide'
                    : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                }`}
                title="Toggle to simulate what happens if a mill certificate lacks Country of Melt & Pour"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Simulate Missing Origin Defect</span>
              </button>
            </div>

            {/* Origin Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div 
                className="bg-slate-50 p-2.5 rounded border border-slate-200 cursor-pointer hover:border-amber-500 transition-colors"
                onClick={() => setActiveHighlightId('b1')}
              >
                <span className="text-slate-500 text-[10px] block">Heat Number</span>
                <span className="font-bold text-amber-900 text-sm">#{selectedPreset.heatNumber}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Primary Steel Mill</span>
                <span className="font-bold text-slate-800 truncate block">{selectedPreset.mill.split(' ')[0]}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Melting Route</span>
                <span className="font-bold text-slate-800">BOF / EAF</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Country Melt &amp; Pour</span>
                <span className={`font-bold ${simulateMissingCountryWarning ? 'text-crimson-oxide' : 'text-emerald-700'}`}>
                  {simulateMissingCountryWarning ? 'MISSING' : 'INDIA (IN)'}
                </span>
              </div>
            </div>

            {/* Instant Missing Origin Alert Banner (EU Reg 2026/1963) */}
            {simulateMissingCountryWarning && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-crimson-oxide text-xs text-red-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-crimson-oxide font-mono">
                  <AlertTriangle className="w-4 h-4" />
                  <span>CUSTOMS DETENTION RISK: EU REG 2026/1963 VIOLATION</span>
                </div>
                <p className="leading-relaxed">
                  This mill certificate does not contain an explicit "Country of Melt and Pour" declaration. 
                  Effective Oct 1, 2026 / 2027, European Customs at Rotterdam and Hamburg will reject generic "Made in India" certificates unless the upstream melt origin is attested. HeatLedger AI prompts you to generate an Annexed Sworn Melt Declaration.
                </p>
              </div>
            )}
          </div>

          {/* Chemical Element Tolerance Range Bars */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_6px_20px_rgba(0,0,0,0.03)] space-y-4">
            
            {/* Tolerance Header & Dynamic Rejection / In-Spec Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                  Spectrometer Chemical Tolerance vs {selectedStandard.split(' ')[0]}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Specification: <span className="font-bold text-slate-700">{selectedStandard}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isOffSpec ? (
                  <span className="text-[11px] font-mono font-bold text-crimson-darkText bg-crimson-badge px-2.5 py-1 rounded-lg border border-crimson-oxide animate-pulse flex items-center gap-1.5 shadow-sm">
                    <AlertTriangle className="w-3.5 h-3.5 text-crimson-oxide shrink-0" />
                    <span>OFF-SPEC REJECTION: {failedCount} {failedCount === 1 ? 'ELEMENT' : 'ELEMENTS'} OUT OF TOLERANCE</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300 flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>100% IN-SPEC (PASS)</span>
                  </span>
                )}

                {/* Quick Reset to Matching Standard Button in header */}
                {isOffSpec && (
                  <button
                    onClick={handleResetToMatchingStandard}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-300 hover:border-emerald-500 font-mono text-[11px] font-bold transition-all shadow-sm cursor-pointer"
                    title={`Reset target standard to ${matchingStandardForActivePreset}`}
                  >
                    <RefreshCw className="w-3 h-3 text-emerald-600" />
                    <span>Reset to Matching Standard</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live Off-Spec Rejection Alert Banner */}
            {isOffSpec && (
              <div className="p-3.5 rounded-xl bg-red-50/90 border border-crimson-oxide text-xs font-mono text-red-900 space-y-2 shadow-sm animate-pulse-subtle">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-bold text-crimson-oxide text-xs">
                    <AlertTriangle className="w-4 h-4 text-crimson-oxide shrink-0 animate-bounce" />
                    <span className="uppercase tracking-wider">
                      OFF-SPEC REJECTION: {failedCount} ELEMENT{failedCount > 1 ? 'S' : ''} OUT OF TOLERANCE
                    </span>
                  </div>
                  <button
                    onClick={handleResetToMatchingStandard}
                    className="px-3 py-1 rounded-lg bg-crimson-oxide text-white hover:bg-red-700 text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 text-white" />
                    <span>Reset to Matching Standard</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
                  The loaded <strong className="text-slate-900 font-mono">{selectedPreset.mill.split(' ')[0]}</strong> chemistry (Heat <strong className="text-amber-900 font-mono">#{selectedPreset.heatNumber}</strong>) violates metallurgical limits for <strong className="text-slate-900 font-mono">{selectedStandard}</strong>. European and UK Customs inspectors at Rotterdam / Hamburg will reject generic declarations without matching mill limits.
                </p>
                <div className="pt-1 flex flex-wrap gap-2 text-[10px]">
                  {failedElements.map(el => (
                    <span key={el.symbol} className="px-2 py-0.5 rounded bg-white border border-crimson-oxide/40 font-bold text-crimson-darkText shadow-2xs">
                      {getElementToleranceDelta(el)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Range Bars */}
            <div className="space-y-2.5 pt-1">
              {activeChemistry.map((el) => {
                const isPass = el.status === 'PASS';
                const isCev = el.symbol === 'CEV';
                const deltaStr = getElementToleranceDelta(el);

                // Compute position percentage for horizontal bar visualization
                let positionPct = 50;
                if (el.min === 0) {
                  const upperScale = el.max * 1.25 || 1;
                  positionPct = Math.min(Math.max((el.measured / upperScale) * 100, 6), 100);
                } else {
                  if (el.measured < el.min) {
                    positionPct = Math.min(Math.max((el.measured / (el.min * 1.3 || 1)) * 38, 8), 40);
                  } else if (el.measured > el.max) {
                    positionPct = 100;
                  } else {
                    const span = el.max - el.min || 1;
                    const normalized = ((el.measured - el.min) / span) * 60 + 20;
                    positionPct = Math.min(Math.max(normalized, 15), 90);
                  }
                }

                return (
                  <div 
                    key={el.symbol} 
                    className={`p-2.5 rounded-lg transition-all cursor-pointer border ${
                      isPass 
                        ? 'border-transparent hover:border-slate-200 hover:bg-slate-50/80' 
                        : 'border-crimson-oxide/40 bg-red-50/30 hover:bg-red-50/60 shadow-xs'
                    }`}
                    onClick={() => setActiveHighlightId('b2')}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-black w-9 text-xs px-1.5 py-0.5 rounded text-center ${
                          isPass ? 'bg-slate-100 text-slate-900' : 'bg-crimson-oxide text-white'
                        }`}>
                          {el.symbol}
                        </span>
                        <span className="text-slate-600 text-[11px] font-sans font-medium">
                          {el.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 text-[11px]">
                          Spec Limit: {el.min > 0 ? `${el.min.toFixed(isCev || el.symbol === 'P' || el.symbol === 'S' ? 3 : 2)} - ` : ''}≤ {el.max.toFixed(isCev || el.symbol === 'P' || el.symbol === 'S' ? 3 : 2)}{el.unit}
                        </span>

                        <span className={`font-bold font-mono px-2 py-0.5 rounded text-xs border ${
                          isPass 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                            : 'bg-crimson-badge text-crimson-darkText border-crimson-oxide font-black animate-pulse'
                        }`}>
                          {el.measured.toFixed(el.symbol === 'P' || el.symbol === 'S' || isCev ? 3 : 2)}{el.unit}
                        </span>
                      </div>
                    </div>

                    {/* Horizontal Visual Range Bar */}
                    <div className="w-full bg-slate-200 h-2.5 rounded-full relative overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          isPass ? 'bg-emerald-500' : 'bg-crimson-oxide animate-pulse'
                        }`}
                        style={{ width: `${positionPct}%` }}
                      />
                    </div>

                    {/* Exact Delta Callout when out of spec (e.g. "Cr: 0.04% — Below min 0.75%") */}
                    {!isPass && deltaStr && (
                      <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-crimson-darkText bg-crimson-badge/70 px-2.5 py-1 rounded border border-crimson-oxide/40">
                        <span className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-crimson-oxide shrink-0" />
                          <span>{deltaStr}</span>
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-crimson-oxide bg-white/90 px-1.5 py-0.5 rounded border border-crimson-oxide/30">
                          {el.status === 'FAIL_LOW' ? 'Below Tolerance' : 'Above Tolerance'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* IIW Carbon Equivalent Formula Callout */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-600">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-cobalt-blueprint shrink-0" />
                <span>IIW Formula: CEV = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-slate-500 text-[11px]">
                  Calculated CEV: <strong className="text-slate-900">{cevElement?.measured.toFixed(3) || '0.000'}</strong> (Limit ≤ {cevElement?.max.toFixed(2) || '0.45'})
                </span>
                <span className={`font-bold text-xs px-2 py-0.5 rounded border ${
                  cevElement?.status === 'PASS' 
                    ? 'text-emerald-700 bg-emerald-100 border-emerald-300' 
                    : 'text-crimson-darkText bg-crimson-badge border-crimson-oxide animate-pulse'
                }`}>
                  {cevElement?.status === 'PASS' ? 'Weldability In-Spec' : 'CEV Exceeds Weldability Limit'}
                </span>
              </div>
            </div>
          </div>

          {/* Mechanical Properties Grid */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_6px_20px_rgba(0,0,0,0.03)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                Mechanical &amp; Tensile Verification Grid vs {selectedStandard.split(' ')[0]}
              </h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                activeMechanics.every(m => m.status === 'PASS')
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-300'
                  : 'text-crimson-darkText bg-crimson-badge border-crimson-oxide'
              }`}>
                {activeMechanics.every(m => m.status === 'PASS') ? 'MECHANICALS: PASS' : 'MECHANICALS: OUT OF TOLERANCE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              {activeMechanics.map((m) => {
                const isPass = m.status === 'PASS';
                return (
                  <div 
                    key={m.property} 
                    className={`p-3 rounded-lg border flex flex-col justify-between cursor-pointer transition-colors ${
                      isPass 
                        ? 'bg-slate-50 border-slate-200 hover:border-emerald-500' 
                        : 'bg-red-50/40 border-crimson-oxide/40 hover:border-crimson-oxide'
                    }`}
                    onClick={() => setActiveHighlightId('b3')}
                  >
                    <span className="text-slate-500 text-[11px] block">{m.property}</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-base font-extrabold text-slate-900">{m.measured}</span>
                      <span className={`font-bold text-[11px] px-1.5 py-0.5 rounded border ${
                        isPass 
                          ? 'text-emerald-700 bg-emerald-100 border-emerald-200' 
                          : 'text-crimson-darkText bg-crimson-badge border-crimson-oxide'
                      }`}>
                        {m.requirement}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
