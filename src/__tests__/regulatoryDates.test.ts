import { describe, it, expect } from 'vitest';
import { REGULATORY_MILESTONES, STANDARD_DISCLAIMER } from '../config/regulatoryDates';

describe('Regulatory Dates & Milestones Configuration', () => {
  it('contains valid ISO-8601 effective dates and legal sources for all milestones', () => {
    expect(REGULATORY_MILESTONES.length).toBeGreaterThanOrEqual(6);
    for (const milestone of REGULATORY_MILESTONES) {
      expect(milestone.id).toBeTruthy();
      expect(milestone.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(milestone.legalSource).toBeTruthy();
      expect(milestone.sourceUrl).toMatch(/^https?:\/\//);
      expect(['EU', 'UK']).toContain(milestone.jurisdiction);
      expect(['IN_FORCE', 'UPCOMING', 'PROPOSED']).toContain(milestone.status);
    }
  });

  it('verifies the exact EU Melt-and-Pour mandatory evidence deadline is 2026-10-01', () => {
    const meltPour = REGULATORY_MILESTONES.find((m) => m.id === 'EU_MELT_POUR_EVIDENCE_APPLIES');
    expect(meltPour).toBeDefined();
    expect(meltPour?.effectiveDate).toBe('2026-10-01');
    expect(meltPour?.legalSource).toContain('2026/1963');
  });

  it('verifies the non-MTC standalone document cutoff date is 2027-10-01', () => {
    const nonMtcCutoff = REGULATORY_MILESTONES.find((m) => m.id === 'EU_NON_MTC_CUTOFF');
    expect(nonMtcCutoff).toBeDefined();
    expect(nonMtcCutoff?.effectiveDate).toBe('2027-10-01');
  });

  it('verifies the EU CBAM definitive start date is 2026-01-01', () => {
    const euStart = REGULATORY_MILESTONES.find((m) => m.id === 'EU_CBAM_DEFINITIVE_START');
    expect(euStart).toBeDefined();
    expect(euStart?.effectiveDate).toBe('2026-01-01');
  });

  it('verifies the UK CBAM start date is 2027-01-01', () => {
    const ukStart = REGULATORY_MILESTONES.find((m) => m.id === 'UK_CBAM_START');
    expect(ukStart).toBeDefined();
    expect(ukStart?.effectiveDate).toBe('2027-01-01');
  });

  it('ensures the standard legal disclaimer is accurately worded', () => {
    expect(STANDARD_DISCLAIMER).toBe(
      'HeatLedger supports compliance preparation. It is not legal advice and not an accredited verification body.'
    );
  });
});
