import { ChemicalElement, MetallurgicalStandardDef } from '../types';

/**
 * Deterministic Metallurgical Standards Dictionary matching backend specification.
 */
export const METALLURGICAL_STANDARDS: Record<string, MetallurgicalStandardDef> = {
  'ASTM A105 Carbon Steel Forgings': {
    standardCode: 'ASTM A105',
    title: 'ASTM A105 Carbon Steel Forgings',
    description:
      'Standard Specification for Carbon Steel Forgings for Piping Applications (ASME B16.5)',
    cnCodes: ['7307', '7326'],
    matchingPresetId: 'preset-b',
    chemistry: {
      C: { min: 0.0, max: 0.35, unit: '%' },
      Mn: { min: 0.6, max: 1.05, unit: '%' },
      Si: { min: 0.1, max: 0.35, unit: '%' },
      P: { min: 0.0, max: 0.035, unit: '%' },
      S: { min: 0.0, max: 0.04, unit: '%' },
      Cr: { min: 0.0, max: 0.3, unit: '%' },
      Ni: { min: 0.0, max: 0.4, unit: '%' },
      Mo: { min: 0.0, max: 0.12, unit: '%' },
      CEV: { min: 0.0, max: 0.47, unit: 'IIW' },
    },
    mechanics: [
      { property: 'Tensile Strength (Rm)', requirement: '485 - 720 MPa', min: 485, max: 720 },
      { property: 'Yield Strength (0.2%)', requirement: '≥ 250 MPa', min: 250, max: 500 },
      { property: 'Elongation in 50mm', requirement: '≥ 22.0 %', min: 22.0 },
      { property: 'Hardness (Brinell)', requirement: '≤ 187 HBW', min: 137, max: 187 },
    ],
  },
  'ASTM A193 Grade B7 Alloy Fasteners': {
    standardCode: 'ASTM A193 Grade B7',
    title: 'ASTM A193 Grade B7 Alloy Fasteners',
    description:
      'High-Tensile Chromium-Molybdenum Alloy Steel Bolting for Pressure Vessels & Flanges',
    cnCodes: ['7318'],
    matchingPresetId: 'preset-c',
    chemistry: {
      C: { min: 0.37, max: 0.49, unit: '%' },
      Mn: { min: 0.65, max: 1.1, unit: '%' },
      Si: { min: 0.15, max: 0.35, unit: '%' },
      P: { min: 0.0, max: 0.035, unit: '%' },
      S: { min: 0.0, max: 0.04, unit: '%' },
      Cr: { min: 0.75, max: 1.2, unit: '%' },
      Ni: { min: 0.0, max: 0.4, unit: '%' },
      Mo: { min: 0.15, max: 0.25, unit: '%' },
      CEV: { min: 0.0, max: 0.9, unit: 'IIW' },
    },
    mechanics: [
      { property: 'Tensile Strength (Rm)', requirement: '≥ 860 MPa', min: 860, max: 1100 },
      { property: 'Yield Strength (0.2%)', requirement: '≥ 725 MPa', min: 725, max: 950 },
      { property: 'Elongation in 4D', requirement: '≥ 16.0 %', min: 16.0 },
      { property: 'Hardness (Brinell)', requirement: '220 - 321 HBW', min: 220, max: 321 },
    ],
  },
  'EN 10217-1 / ASTM A53 Welded Pipe': {
    standardCode: 'EN 10217-1 / ASTM A53',
    title: 'EN 10217-1 / ASTM A53 Welded Pipe',
    description: 'Welded Steel Tubes for Pressure Purposes & Welded Line Pipe',
    cnCodes: ['7306', '7305'],
    matchingPresetId: 'preset-a',
    chemistry: {
      C: { min: 0.0, max: 0.22, unit: '%' },
      Mn: { min: 0.9, max: 1.4, unit: '%' },
      Si: { min: 0.1, max: 0.35, unit: '%' },
      P: { min: 0.0, max: 0.03, unit: '%' },
      S: { min: 0.0, max: 0.025, unit: '%' },
      Cr: { min: 0.0, max: 0.25, unit: '%' },
      Ni: { min: 0.0, max: 0.2, unit: '%' },
      Mo: { min: 0.0, max: 0.08, unit: '%' },
      CEV: { min: 0.0, max: 0.43, unit: 'IIW' },
    },
    mechanics: [
      { property: 'Yield Strength (ReH)', requirement: '≥ 290 MPa', min: 290 },
      { property: 'Tensile Strength (Rm)', requirement: '430 - 580 MPa', min: 430, max: 580 },
      { property: 'Elongation (A5)', requirement: '≥ 21.0 %', min: 21.0 },
      { property: 'Impact Test (KV at 0°C)', requirement: '≥ 27 Joules', min: 27 },
    ],
  },
  'EN 10216-2 Alloy Steel Tubes (16Mo3)': {
    standardCode: 'EN 10216-2 16Mo3',
    title: 'EN 10216-2 Alloy Steel Tubes (16Mo3)',
    description: 'Seamless Steel Tubes for Pressure Purposes - Elevated Temperature Alloy Steel',
    cnCodes: ['7304'],
    chemistry: {
      C: { min: 0.12, max: 0.2, unit: '%' },
      Mn: { min: 0.4, max: 0.9, unit: '%' },
      Si: { min: 0.1, max: 0.35, unit: '%' },
      P: { min: 0.0, max: 0.025, unit: '%' },
      S: { min: 0.0, max: 0.015, unit: '%' },
      Cr: { min: 0.0, max: 0.3, unit: '%' },
      Ni: { min: 0.0, max: 0.3, unit: '%' },
      Mo: { min: 0.25, max: 0.35, unit: '%' },
      CEV: { min: 0.0, max: 0.45, unit: 'IIW' },
    },
    mechanics: [
      { property: 'Tensile Strength (Rm)', requirement: '450 - 600 MPa', min: 450, max: 600 },
      { property: 'Yield Strength (ReH)', requirement: '≥ 280 MPa', min: 280 },
      { property: 'Elongation (A5)', requirement: '≥ 22.0 %', min: 22.0 },
      { property: 'Hardness (Brinell)', requirement: '130 - 180 HBW', min: 130, max: 180 },
    ],
  },
  'EN 10025 S355JR Structural Steel': {
    standardCode: 'EN 10025 S355JR',
    title: 'EN 10025 S355JR Structural Steel',
    description:
      'Hot Rolled Structural Steel for Fabrications, Towers, Bridges and Engineered Structures',
    cnCodes: ['7308', '7214'],
    chemistry: {
      C: { min: 0.0, max: 0.24, unit: '%' },
      Mn: { min: 0.0, max: 1.6, unit: '%' },
      Si: { min: 0.0, max: 0.55, unit: '%' },
      P: { min: 0.0, max: 0.035, unit: '%' },
      S: { min: 0.0, max: 0.035, unit: '%' },
      Cr: { min: 0.0, max: 0.3, unit: '%' },
      Ni: { min: 0.0, max: 0.3, unit: '%' },
      Mo: { min: 0.0, max: 0.1, unit: '%' },
      CEV: { min: 0.0, max: 0.45, unit: 'IIW' },
    },
    mechanics: [
      { property: 'Tensile Strength (Rm)', requirement: '470 - 630 MPa', min: 470, max: 630 },
      { property: 'Yield Strength (ReH)', requirement: '≥ 355 MPa', min: 355 },
      { property: 'Elongation (A5)', requirement: '≥ 22.0 %', min: 22.0 },
      { property: 'Hardness (Brinell)', requirement: '140 - 190 HBW', min: 140, max: 190 },
    ],
  },
};

export const STANDARDS_LIST = Object.keys(METALLURGICAL_STANDARDS);

export const PRESET_MATCHING_STANDARDS: Record<string, string> = {
  'preset-a': 'EN 10217-1 / ASTM A53 Welded Pipe',
  'preset-b': 'ASTM A105 Carbon Steel Forgings',
  'preset-c': 'ASTM A193 Grade B7 Alloy Fasteners',
};

/**
 * Calculates IIW Carbon Equivalent Value:
 * CEV = C + (Mn / 6) + ((Cr + Mo + V) / 5) + ((Ni + Cu) / 15)
 */
export function calculateIIWCEV(chemistry: Record<string, number>): number {
  const c = chemistry['C'] ?? 0;
  const mn = chemistry['Mn'] ?? 0;
  const cr = chemistry['Cr'] ?? 0;
  const mo = chemistry['Mo'] ?? 0;
  const v = chemistry['V'] ?? 0;
  const ni = chemistry['Ni'] ?? 0;
  const cu = chemistry['Cu'] ?? 0;

  const cev = c + mn / 6.0 + (cr + mo + v) / 5.0 + (ni + cu) / 15.0;
  return Number(cev.toFixed(3));
}

/**
 * Deterministically re-evaluates chemical elements against a selected target standard.
 */
export function evaluateChemistryAgainstStandard(
  baseChemistry: ChemicalElement[],
  standardName: string
): ChemicalElement[] {
  const standard = METALLURGICAL_STANDARDS[standardName];
  if (!standard) return baseChemistry;

  const rawMap: Record<string, number> = {};
  baseChemistry.forEach((el) => {
    rawMap[el.symbol] = el.measured;
  });

  const calculatedCev = calculateIIWCEV(rawMap);

  return baseChemistry.map((el) => {
    const isCev = el.symbol === 'CEV';
    const measuredVal = isCev ? calculatedCev : el.measured;
    const limit = standard.chemistry[el.symbol];

    if (!limit) {
      return {
        ...el,
        measured: measuredVal,
        status: 'PASS' as const,
      };
    }

    let status: 'PASS' | 'FAIL_LOW' | 'FAIL_HIGH' = 'PASS';
    if (measuredVal < limit.min) {
      status = 'FAIL_LOW';
    } else if (measuredVal > limit.max) {
      status = 'FAIL_HIGH';
    }

    return {
      ...el,
      measured: measuredVal,
      min: limit.min,
      max: limit.max,
      unit: limit.unit || el.unit,
      status,
    };
  });
}

/**
 * Formats the exact delta string for out-of-spec elements.
 */
export function getElementToleranceDelta(el: ChemicalElement): string {
  const isSpecial = el.symbol === 'P' || el.symbol === 'S' || el.symbol === 'CEV';
  const decimals = isSpecial ? 3 : 2;
  const measuredStr = el.measured.toFixed(decimals);
  const minStr = el.min.toFixed(decimals);
  const maxStr = el.max.toFixed(decimals);
  const unitSuffix = el.unit === '%' ? '%' : ` ${el.unit}`;

  if (el.status === 'FAIL_LOW') {
    return `${el.symbol}: ${measuredStr}${unitSuffix} — Below min ${minStr}${unitSuffix}`;
  }
  if (el.status === 'FAIL_HIGH') {
    return `${el.symbol}: ${measuredStr}${unitSuffix} — Exceeds max ${maxStr}${unitSuffix}`;
  }
  return '';
}
