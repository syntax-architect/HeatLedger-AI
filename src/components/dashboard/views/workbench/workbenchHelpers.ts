import { SimulatorPreset } from '../../../../types';

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

export type InspectionSection = 'origin' | 'chemistry' | 'mechanical' | 'stamp';

export function buildWorkbenchFields(preset: SimulatorPreset): WorkbenchField[] {
  return [
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
}
