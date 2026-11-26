export interface ScopeInfo {
  cn_code: string;
  jurisdiction: string;
  status: 'CONFIRMED_IN_SCOPE' | 'PROPOSED_NOT_IN_FORCE' | 'OUT_OF_SCOPE';
  scope_label: string;
  product_category: string;
  description: string;
  mandatory_start_date: string;
  rules_basis: string;
}

export interface CbamEnergyBill {
  id: string;
  type: string;
  provider: string;
  month: string;
  units: number;
  measure: string;
  amountInr: number;
  fileName: string;
  confirmed: boolean;
  confirmedBy: string;
}

export interface CbamCalculations {
  effectivePrecursorSee: number;
  plantDirectSee: number;
  plantIndirectSee: number;
  verifiedTotalSee: number;
  baseDefaultSee: number;
  markupRatePct: number;
  officialDefaultWithMarkup: number;
  seeDelta: number;
  invoiceEuroSavings: number;
  invoiceInrSavings: number;
  totalCarbonAvoidedTonnes: number;
}

export type CbamFuelType = 'LIGHT_FUEL_OIL' | 'NATURAL_GAS' | 'GREEN_HYDROGEN';

export const GRID_EF = 0.727; // Central Electricity Authority (CEA) India v20.0 (tCO2e/MWh)
export const EU_ETS_PRICE = 75.36; // Published Q1 2026 EU ETS benchmark
export const INR_PER_EUR = 90.5;

export const FUEL_FACTORS: Record<CbamFuelType, { ef: number; unit: string; name: string }> = {
  LIGHT_FUEL_OIL: { ef: 2.68, unit: 'kg CO₂e/L', name: 'Light Fuel Oil' },
  NATURAL_GAS: { ef: 1.98, unit: 'kg CO₂e/m³ equiv', name: 'Natural Gas' },
  GREEN_HYDROGEN: { ef: 0.0, unit: 'kg CO₂e/kg', name: 'Green Hydrogen (Electrolytic)' },
};

const CONFIRMED_EU_PREFIXES = [
  '7201', '7202', '7203', '7205', '7206', '7207', '7208', '7213', '7214', '7224', '7228',
  '7301', '7303', '7304', '7305', '7306', '7307', '7308', '7309', '7310', '7311', '7318', '7326',
];

const DOWNSTREAM_EXTENSION_PREFIXES = ['8481', '8482', '8483', '8708'];

const BASE_DEFAULTS: Record<string, number> = {
  '7307': 3.82,
  '7207': 2.45,
  '7214': 2.76,
  '7228': 2.98,
  '7326': 3.65,
  '7304': 3.42,
};

export function resolveCbamScope(cnCode: string, jurisdiction: 'EU' | 'UK'): ScopeInfo {
  const clean = cnCode.replace(/\s+/g, '');
  const prefix4 = clean.slice(0, 4);
  const isConfirmed = CONFIRMED_EU_PREFIXES.includes(prefix4);
  const isDownstreamExtension = DOWNSTREAM_EXTENSION_PREFIXES.includes(prefix4);

  if (jurisdiction === 'EU') {
    if (isConfirmed) {
      return {
        cn_code: cnCode,
        jurisdiction: 'EU',
        status: 'CONFIRMED_IN_SCOPE',
        scope_label: 'Confirmed in Scope (Regulation EU 2023/956 Annex I)',
        product_category: 'Iron and Steel Articles',
        description:
          'Mandatory quarterly reporting in definitive period from 1 Jan 2026. Financial certificates from 1 Feb 2027.',
        mandatory_start_date: '2026-01-01',
        rules_basis: 'Regulation (EU) 2023/956 & Implementing Reg (EU) 2025/2621',
      };
    }
    if (isDownstreamExtension) {
      return {
        cn_code: cnCode,
        jurisdiction: 'EU',
        status: 'PROPOSED_NOT_IN_FORCE',
        scope_label: 'Proposed Downstream Extension (Not Yet Law)',
        product_category: 'Downstream Finished Goods (Pumps/Valves/Auto)',
        description:
          'Proposed under European Parliament review for 2028-2030 inclusion. No compliance obligation active today.',
        mandatory_start_date: 'Unscheduled (Proposed 2028+)',
        rules_basis: 'European Parliament Draft Review (Non-Binding)',
      };
    }
    return {
      cn_code: cnCode,
      jurisdiction: 'EU',
      status: 'OUT_OF_SCOPE',
      scope_label: 'Out of Scope',
      product_category: 'General Goods',
      description: 'Not covered under current EU CBAM Annex I scope.',
      mandatory_start_date: 'N/A',
      rules_basis: 'Regulation (EU) 2023/956',
    };
  }

  if (isConfirmed) {
    return {
      cn_code: cnCode,
      jurisdiction: 'UK',
      status: 'CONFIRMED_IN_SCOPE',
      scope_label: 'UK CBAM Confirmed in Scope (Effective 1 Jan 2027)',
      product_category: 'Iron and Steel',
      description:
        'UK CBAM starts 1 Jan 2027. Melt-and-pour country evidence voluntary 1 Apr 2027, mandatory 1 Jul 2027.',
      mandatory_start_date: '2027-01-01',
      rules_basis: 'UK Finance Bill 2024 & CBAM Consultation Framework',
    };
  }

  return {
    cn_code: cnCode,
    jurisdiction: 'UK',
    status: 'OUT_OF_SCOPE',
    scope_label: 'Out of Scope for UK CBAM',
    product_category: 'General Goods',
    description: 'Code not covered under UK CBAM regime.',
    mandatory_start_date: 'N/A',
    rules_basis: 'UK CBAM Policy Framework',
  };
}

export function computeCbamSeeCalculations(params: {
  upstreamPrecursorSee: number;
  scrapContentPct: number;
  monthlyFuelLiters: number;
  fuelType: CbamFuelType;
  monthlyGridKwh: number;
  gridRenewableSharePct: number;
  monthlyProductionMT: number;
  shipmentCnCode: string;
  statutoryYear: number;
  shipmentMT: number;
}): CbamCalculations {
  const safeProd = Math.max(1, params.monthlyProductionMT || 1);

  const massScrapRatio = 1.08;
  const effectivePrecursorSee =
    params.upstreamPrecursorSee * (massScrapRatio - (params.scrapContentPct / 100.0) * 0.08);

  const activeFuel = FUEL_FACTORS[params.fuelType];
  const directCo2Tonnes = (params.monthlyFuelLiters * activeFuel.ef) / 1000.0;
  const plantDirectSee = directCo2Tonnes / safeProd;

  const netGridShare = Math.max(0.0, 1.0 - params.gridRenewableSharePct / 100.0);
  const netGridMwh = (params.monthlyGridKwh * netGridShare) / 1000.0;
  const indirectCo2Tonnes = netGridMwh * GRID_EF;
  const plantIndirectSee = indirectCo2Tonnes / safeProd;

  const verifiedTotalSee = effectivePrecursorSee + plantDirectSee + plantIndirectSee;

  const clean = params.shipmentCnCode.replace(/\s+/g, '').slice(0, 4);
  const baseDefaultSee = BASE_DEFAULTS[clean] || 3.82;
  const markupRate =
    params.statutoryYear === 2026 ? 0.1 : params.statutoryYear === 2027 ? 0.2 : 0.3;
  const officialDefaultWithMarkup = baseDefaultSee * (1.0 + markupRate);

  const seeDelta = Math.max(0, officialDefaultWithMarkup - verifiedTotalSee);
  const invoiceEuroSavings = (params.shipmentMT || 0) * seeDelta * EU_ETS_PRICE;
  const invoiceInrSavings = invoiceEuroSavings * INR_PER_EUR;

  return {
    effectivePrecursorSee: Number(effectivePrecursorSee.toFixed(3)),
    plantDirectSee: Number(plantDirectSee.toFixed(3)),
    plantIndirectSee: Number(plantIndirectSee.toFixed(3)),
    verifiedTotalSee: Number(verifiedTotalSee.toFixed(3)),
    baseDefaultSee: Number(baseDefaultSee.toFixed(3)),
    markupRatePct: Math.round(markupRate * 100),
    officialDefaultWithMarkup: Number(officialDefaultWithMarkup.toFixed(3)),
    seeDelta: Number(seeDelta.toFixed(3)),
    invoiceEuroSavings: Math.round(invoiceEuroSavings),
    invoiceInrSavings: Math.round(invoiceInrSavings),
    totalCarbonAvoidedTonnes: Number(((params.shipmentMT || 0) * seeDelta).toFixed(2)),
  };
}
