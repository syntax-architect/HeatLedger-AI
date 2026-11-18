import React, { useState, useMemo } from 'react';
import { ApiService } from '../../../services/api';
import { 
  FileCode, 
  Download, 
  Share2, 
  Flame, 
  Zap, 
  TrendingDown, 
  FileCheck2, 
  Globe2, 
  CheckCircle2, 
  Copy, 
  ExternalLink,
  X,
  FileSpreadsheet
} from 'lucide-react';

export const CbamDossierView: React.FC = () => {
  // Monthly Energy Inputs
  const [electricityKWh, setElectricityKWh] = useState<number>(145000); // CESC / WBSEDCL kWh
  const [solarOffsetKWh, setSolarOffsetKWh] = useState<number>(35000); // Rooftop solar or green PPA
  const [fuelLiters, setFuelLiters] = useState<number>(12000); // Furnace oil / LPG
  const [monthlyProductionMT, setMonthlyProductionMT] = useState<number>(450); // Total factory tonnage

  // Precursor math state
  const upstreamPrecursorSee = 1.65; // SAIL/Tata upstream SEE
  const massScrapRatio = 1.08; // 8% scale/flash loss in forging
  const shipmentMT = 24.5;
  const euEtsPrice = 85; // €85/tCO2e

  // Modals
  const [activeModal, setActiveModal] = useState<'bundle' | 'customs' | 'xml' | 'share' | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Calculations
  const calculations = useMemo(() => {
    // Grid emission factor for Eastern India ~0.82 kg CO2/kWh
    const netGridKWh = Math.max(0, electricityKWh - solarOffsetKWh);
    const indirectCo2Tonnes = (netGridKWh * 0.82) / 1000;
    const directCo2Tonnes = (fuelLiters * 2.68) / 1000; // ~2.68 kg CO2/L for fuel

    const plantIndirectSee = indirectCo2Tonnes / monthlyProductionMT;
    const plantDirectSee = directCo2Tonnes / monthlyProductionMT;
    const plantTotalProcessSee = plantIndirectSee + plantDirectSee; // e.g. ~0.28 tCO2e/t

    // Recursive Precursor Formula
    const verifiedTotalSee = (upstreamPrecursorSee * massScrapRatio) + plantTotalProcessSee;
    const defaultEuBaseline = 3.28; // EU default value + 2026 10% penalty markup
    const seeDelta = Math.max(0, defaultEuBaseline - verifiedTotalSee);
    const invoiceEuroSavings = shipmentMT * seeDelta * euEtsPrice;

    return {
      indirectCo2Tonnes: indirectCo2Tonnes.toFixed(1),
      directCo2Tonnes: directCo2Tonnes.toFixed(1),
      plantDirectSee: plantDirectSee.toFixed(2),
      plantIndirectSee: plantIndirectSee.toFixed(2),
      plantTotalProcessSee: plantTotalProcessSee.toFixed(2),
      verifiedTotalSee: verifiedTotalSee.toFixed(2),
      defaultEuBaseline: defaultEuBaseline.toFixed(2),
      invoiceEuroSavings: Math.round(invoiceEuroSavings),
      seeDelta: seeDelta.toFixed(2),
    };
  }, [electricityKWh, solarOffsetKWh, fuelLiters, monthlyProductionMT, upstreamPrecursorSee, massScrapRatio, shipmentMT]);

  const handleCopy = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadXml = async () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<CBAMCommunication xmlns="urn:eu:cbam:declarant:v1" version="2026.1">
  <Installation>
    <InstallationID>IN-WB-4409</InstallationID>
    <OperatorName>Howrah Precision Forgings Pvt. Ltd.</OperatorName>
    <Country>IN</Country>
    <UNLOCODE>IN CCU</UNLOCODE>
    <Coordinates>
      <Latitude>22.6105</Latitude>
      <Longitude>88.3421</Longitude>
    </Coordinates>
  </Installation>
  <ImportedGoodsItem>
    <CNCode>73079100</CNCode>
    <NetMassTonnes>${shipmentMT.toFixed(2)}</NetMassTonnes>
    <SpecificEmbeddedEmissions>
      <TotalSEE_tCO2ePerTonne>${calculations.verifiedTotalSee}</TotalSEE_tCO2ePerTonne>
      <DirectSEE_tCO2ePerTonne>${calculations.plantDirectSee}</DirectSEE_tCO2ePerTonne>
      <IndirectSEE_tCO2ePerTonne>${calculations.plantIndirectSee}</IndirectSEE_tCO2ePerTonne>
    </SpecificEmbeddedEmissions>
    <PrecursorSteel>
      <PrecursorSEE_tCO2ePerTonne>${upstreamPrecursorSee}</PrecursorSEE_tCO2ePerTonne>
      <UpstreamHeatNumber>TSJ-26-9021</UpstreamHeatNumber>
      <CountryOfMeltAndPour>IN</CountryOfMeltAndPour>
    </PrecursorSteel>
  </ImportedGoodsItem>
</CBAMCommunication>`;

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CBAM_Communication_EXP-2026-109.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setActiveModal(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-xl border border-border-crisp p-5 shadow-card-light space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <FileCode className="w-5 h-5 text-emerald-600" />
              <span>EU/UK CBAM Precursor Math &amp; Container Customs Dossier Builder</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated recursive calculation per EU Implementing Regulation 2023/1773 &amp; UK CBAM.
            </p>
          </div>

          <div className="px-3 py-1 rounded-full bg-emerald-badge text-emerald-darkText font-mono text-xs font-bold border border-emerald-300">
            Installation ID: IN-WB-4409 (Liluah Works)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SECTION 1: Monthly Plant Energy & Direct Emissions Input (Col 5) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-border-crisp p-5 shadow-card-light space-y-4">
          <div className="flex items-center justify-between border-b border-border-crisp pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Monthly Energy &amp; Fuel Inputs</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Billing Cycle: Jan 2026</span>
          </div>

          {/* Electricity Input */}
          <div className="space-y-1">
            <label className="text-xs font-mono font-semibold text-slate-700 block">
              Grid Electricity Consumed (CESC / WBSEDCL kWh):
            </label>
            <input
              type="number"
              value={electricityKWh}
              onChange={(e) => setElectricityKWh(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Green Solar Offset */}
          <div className="space-y-1">
            <label className="text-xs font-mono font-semibold text-emerald-800 block">
              Renewable Solar PPA / Captive Solar Offset (kWh):
            </label>
            <input
              type="number"
              value={solarOffsetKWh}
              onChange={(e) => setSolarOffsetKWh(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-emerald-50/50 border border-emerald-300 text-emerald-900 font-mono text-xs font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Fuel Input */}
          <div className="space-y-1">
            <label className="text-xs font-mono font-semibold text-slate-700 block">
              Reheating Furnace Fuel / LPG / FO (Liters):
            </label>
            <input
              type="number"
              value={fuelLiters}
              onChange={(e) => setFuelLiters(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Production Tonnage */}
          <div className="space-y-1">
            <label className="text-xs font-mono font-semibold text-slate-700 block">
              Total Factory Monthly Finished Production (MT):
            </label>
            <input
              type="number"
              value={monthlyProductionMT}
              onChange={(e) => setMonthlyProductionMT(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Plant Direct + Indirect Result Badge */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-xs font-mono">
            <div className="flex justify-between text-slate-600">
              <span>Plant Direct Fuel SEE:</span>
              <span className="font-bold text-slate-900">{calculations.plantDirectSee} tCO₂e/t</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Plant Indirect Power SEE:</span>
              <span className="font-bold text-slate-900">{calculations.plantIndirectSee} tCO₂e/t</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-emerald-800">
              <span>Total Plant Processing SEE:</span>
              <span>{calculations.plantTotalProcessSee} tCO₂e / tonne</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: Recursive Precursor Math & Invoice Container Card (Col 7) */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white rounded-xl border border-border-crisp p-5 shadow-card-light space-y-4">
            <div className="flex items-center justify-between border-b border-border-crisp pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400">Selected Export Shipment</span>
                <h3 className="text-sm font-bold text-slate-900 font-mono">
                  Invoice #EXP-2026-109 · 24.5 MT Forged Flanges (CN 7307 91)
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-500">Destination: Bremen, Germany</span>
            </div>

            {/* Formula Breakdown Banner */}
            <div className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs space-y-1.5 border border-slate-800">
              <div className="text-[10px] uppercase text-emerald-400 font-bold tracking-wider">
                Official EU Regulation 2023/1773 Formula:
              </div>
              <div className="text-slate-200 font-semibold text-[11px]">
                Total SEE = (Upstream Steel Precursor SEE × Mass Ratio) + Factory Direct Fuel SEE + Factory Indirect Electricity SEE
              </div>
              <div className="text-emerald-400 text-[11px] pt-1">
                = ({upstreamPrecursorSee} × {massScrapRatio}) + {calculations.plantDirectSee} + {calculations.plantIndirectSee} = <strong className="text-white text-sm">{calculations.verifiedTotalSee} tCO₂e/t</strong>
              </div>
            </div>

            {/* Emissions Comparison Bar */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-600">Your Verified Actual Emissions:</span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  {calculations.verifiedTotalSee} tCO₂e / t
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full" 
                  style={{ width: `${(Number(calculations.verifiedTotalSee) / Number(calculations.defaultEuBaseline)) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono pt-1">
                <span className="text-slate-500">Unverified EU Default Value + Markup:</span>
                <span className="font-bold text-crimson-oxide">
                  {calculations.defaultEuBaseline} tCO₂e / t
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-crimson-oxide h-full rounded-full w-full opacity-80" />
              </div>

              {/* Big Euro Savings Box */}
              <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">
                    Net CBAM Certificate Savings for Your EU Importer:
                  </span>
                  <span className="text-2xl font-black text-emerald-700 font-mono tracking-tight flex items-center gap-1.5">
                    <TrendingDown className="w-5 h-5 text-emerald-600" />
                    €{calculations.invoiceEuroSavings.toLocaleString()} Saved
                  </span>
                </div>
                <div className="text-right text-[11px] font-mono text-slate-500">
                  <span>Based on €{euEtsPrice}/t EU ETS</span><br />
                  <span className="text-slate-700 font-bold">{shipmentMT} Tonne Shipment</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: One-Click Container Dossier Export Panel (4 Buttons) */}
          <div className="bg-white rounded-xl border border-border-crisp p-5 shadow-card-light space-y-4">
            <div className="flex items-center justify-between border-b border-border-crisp pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-600" />
                <span>One-Click Container Dossier Deliverables</span>
              </h3>
              <span className="text-[11px] font-mono text-emerald-700 font-bold">4 Official Formats Ready</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Button 1: Signed Factory 3.1 + Upstream Mill PDF Bundle */}
              <button
                onClick={() => setActiveModal('bundle')}
                className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-300 text-left transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                    <span>Merged 3.1 PDF Dossier</span>
                  </span>
                  <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900" />
                </div>
                <span className="text-[11px] text-slate-500 leading-tight">
                  Cover 3.1 certificate + locked unaltered upstream SAIL/Tata 3.1 Annex A.
                </span>
              </button>

              {/* Button 2: EU Reg 2026/1963 Country of Melt & Pour Statement */}
              <button
                onClick={() => setActiveModal('customs')}
                className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-300 text-left transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-amber-700 flex items-center gap-1.5">
                    <Globe2 className="w-4 h-4 text-amber-600" />
                    <span>Melt &amp; Pour Customs Statement</span>
                  </span>
                  <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900" />
                </div>
                <span className="text-[11px] text-slate-500 leading-tight">
                  EU Reg 2026/1963 &amp; UK CDS ISO-3166 Melt &amp; Pour legal attestation.
                </span>
              </button>

              {/* Button 3: Official EU CBAM Communication XML & Excel Sheet */}
              <button
                onClick={() => setActiveModal('xml')}
                className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-300 text-left transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-cobalt-blueprint flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-cobalt-blueprint" />
                    <span>CBAM XML &amp; Excel Packet</span>
                  </span>
                  <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900" />
                </div>
                <span className="text-[11px] text-slate-500 leading-tight">
                  Official XML format for EU Declarant portal upload + Excel summary.
                </span>
              </button>

              {/* Button 4: Share Verified Buyer Link via WhatsApp / Email */}
              <button
                onClick={() => setActiveModal('share')}
                className="p-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-left transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <Share2 className="w-4 h-4 text-emerald-700" />
                    <span>Share Verified Buyer Link</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="text-[11px] text-emerald-800 leading-tight">
                  Instant secure link for German/Dutch importer customs agents.
                </span>
              </button>

            </div>
          </div>

        </div>

      </div>

      {/* DELIVERABLE PREVIEW MODALS */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-300 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Content: Merged PDF Bundle */}
            {activeModal === 'bundle' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                  <FileCheck2 className="w-6 h-6 text-emerald-600" />
                  <span>Preview: Merged EN 10204 3.1 PDF Dossier Bundle</span>
                </div>
                <p className="text-xs text-slate-500">
                  Compiled strictly under EN 10204 Clause 6. Exporter cover sheet is dynamically fused with the unaltered upstream steel mill certificate.
                </p>

                <div className="p-4 rounded-lg bg-slate-100 border border-slate-300 font-mono text-xs space-y-2 text-slate-800">
                  <div className="font-bold border-b border-slate-300 pb-1">DOSSIER INDEX:</div>
                  <div>PAGE 1: Howrah Precision Forgings Pvt. Ltd. — 3.1 Inspection Certificate (Stamped)</div>
                  <div>PAGE 2: Chemical &amp; Mechanical Reconciliation with ASTM A105 / ASME B16.5</div>
                  <div>PAGE 3 (Annex A): Tata Steel Jamshedpur Unaltered Original 3.1 MTC (#TSJ-26-9021)</div>
                  <div className="text-[11px] text-emerald-700 font-bold pt-1">
                    ✓ SHA-256 Checksum Verified: 4f98e219...b921
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Close
                  </button>
                  <a
                    href="/samples/Tata_Steel_3.1_MTC_TSJ-26-9021.pdf"
                    download="EXP-2026-109_Clause6_Merged_Dossier.pdf"
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-obsidian-900 font-bold text-xs flex items-center gap-1.5 shadow"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF Dossier (A4 Merged)</span>
                  </a>
                </div>
              </div>
            )}

            {/* Modal Content: Customs Statement */}
            {activeModal === 'customs' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                  <Globe2 className="w-6 h-6 text-amber-600" />
                  <span>EU Reg 2026/1963 &amp; UK CDS "Country of Melt &amp; Pour" Statement</span>
                </div>
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-300 text-xs font-mono text-amber-900 space-y-2">
                  <div className="font-bold uppercase">OFFICIAL DECLARATION OF ORIGINAL STEEL ORIGIN:</div>
                  <p>
                    "We hereby declare that for Goods exported under Invoice EXP-2026-109 (CN 7307 91), the raw steel was melted and poured exclusively in INDIA at Tata Steel Jamshedpur (BOF Route). No Russian iron or intermediate input was utilized, in full conformance with EU Regulation 2026/1963 and UK Customs Notice."
                  </p>
                  <div className="text-[10px] text-amber-800 pt-1">
                    Country Code: IN (India) · ISO 3166-1 alpha-2
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Close
                  </button>
                  <a
                    href="/samples/Tata_Steel_3.1_MTC_TSJ-26-9021.pdf"
                    download="Melt_and_Pour_Attestation_EXP-2026-109.pdf"
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-obsidian-900 font-bold text-xs flex items-center gap-1.5 shadow"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Signed Statement</span>
                  </a>
                </div>
              </div>
            )}

            {/* Modal Content: CBAM XML */}
            {activeModal === 'xml' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                  <FileSpreadsheet className="w-6 h-6 text-cobalt-blueprint" />
                  <span>Official EU CBAM Communication XML &amp; Excel Packet</span>
                </div>
                <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg max-h-48 overflow-y-auto">
                  <code>{`<?xml version="1.0" encoding="UTF-8"?>
<CBAMCommunication xmlns="urn:eu:cbam:v1">
  <Installation>
    <ID>IN-WB-4409</ID>
    <Name>Howrah Precision Forgings Pvt. Ltd.</Name>
    <Country>IN</Country>
    <Coordinates lat="22.6105" lon="88.3421"/>
  </Installation>
  <GoodsItem>
    <CNCode>73079100</CNCode>
    <NetMassMT>24.50</NetMassMT>
    <TotalSEE>1.93</TotalSEE>
    <DirectSEE>0.12</DirectSEE>
    <IndirectSEE>0.16</IndirectSEE>
    <PrecursorSEE>1.65</PrecursorSEE>
    <HeatNumbers>TSJ-26-9021</HeatNumbers>
  </GoodsItem>
</CBAMCommunication>`}</code>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleDownloadXml}
                    className="px-4 py-2 rounded-lg bg-cobalt-blueprint hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download CBAM XML (.xml)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Modal Content: Share Link */}
            {activeModal === 'share' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                  <Share2 className="w-6 h-6 text-emerald-600" />
                  <span>Share Verified Customs Link with European Buyer</span>
                </div>
                <p className="text-xs text-slate-500">
                  Send this one-click link to your buyer in Germany, Netherlands, or the UK. Their customs declarant can inspect the SHA-256 certificate and download the CBAM XML directly.
                </p>
                
                <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-between gap-2 font-mono text-xs">
                  <span className="text-slate-800 truncate">
                    https://heatledger.ai/verify/dossier/IN-WB-4409/EXP-2026-109?token=9f8a32
                  </span>
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded bg-slate-900 text-white hover:bg-slate-800 shrink-0 flex items-center gap-1 font-sans text-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
