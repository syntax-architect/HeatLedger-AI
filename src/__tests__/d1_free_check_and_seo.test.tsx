/**
 * HEATLEDGER AI: Task D1 Frontend Test Suite
 * Public /check Free Evaluator & SEO Regulatory Guide Hub
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { CheckPage } from '../pages/CheckPage';
import { SeoGuidePage } from '../pages/SeoGuidePage';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('Prompt Pack v4 Task D1: Public Check & SEO Hub', () => {
  it('renders CheckPage initial dropzone with 24h auto-delete policy note', () => {
    render(
      <BrowserRouter>
        <CheckPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Free Instant MTC Evaluator/i)).toBeDefined();
    expect(screen.getByText(/Check EU Melt-and-Pour Evidence/i)).toBeDefined();
    expect(screen.getByText(/Tap or drop your MTC here/i)).toBeDefined();
    expect(screen.getByText(/Files automatically deleted after 24 hours/i)).toBeDefined();
  });

  it('renders evaluation results with What We Read, Melt-and-Pour Status, 3 Plausibility Checks, and CTA', async () => {
    const mockReport = {
      check_id: 'chk_test_9921',
      filename: 'sample_bokaro_mtc.pdf',
      what_we_read: {
        mill_name: 'SAIL Bokaro Steel Plant',
        heat_number: '#BOK-26-4910',
        grade: 'EN 10025-2 S355JR',
        certificate_number: 'BSP/2026/8841-A',
        chemistry_elements_count: 6,
        dimensions: 'Plates 25 x 2500 x 12000 mm'
      },
      melt_and_pour_evidence: {
        status: 'COMPLETE',
        badge: 'Present on Certificate',
        summary: 'Melt Country: India | Pour Country: India | Heat #BOK-26-4910',
        heat_number_present: true,
        country_of_melt: 'India',
        country_of_pour: 'India',
        regulatory_reference: 'Regulation (EU) 2026/1384 Annex I (CN 7208-7306)'
      },
      plausibility_checks: [
        {
          check_id: 'chem_plausibility',
          name: 'Chemical Composition Limits',
          status: 'PASS',
          finding: 'Extracted 6 chemical elements',
          details: 'Elements within physical carbon-steel ranges.',
          action: 'No chemical anomalies detected.'
        },
        {
          check_id: 'mech_plausibility',
          name: 'Mechanical Properties Plausibility',
          status: 'PASS',
          finding: 'Tensile and yield values physically consistent',
          details: 'Yield (355 MPa) <= Tensile (510 MPa) with ductility satisfied.',
          action: 'Physical strength curve conforms to expected profile.'
        },
        {
          check_id: 'date_plausibility',
          name: 'Certificate Chronology & Authenticity',
          status: 'PASS',
          finding: 'Issue date 12-Feb-2026 valid',
          details: 'Date precedes export dispatch and conforms to chronological invariants.',
          action: 'Chronological audit checks cleared.'
        }
      ],
      suggestions: [
        'Melt-and-pour verified (India / India). Ensure invoice directly cites Heat #BOK-26-4910.',
        'Extracted 6 chemical elements within standard ladle tolerances.',
        'Use our Buyer Spec Check to verify if this heat meets your customer stricter PO limits.'
      ],
      remaining_checks: 2,
      call_to_action: {
        headline: 'Get the full pack for your next shipment',
        subheadline: 'Generate tamper-evident EU melt-and-pour dossiers with cryptographic seals in under 60 seconds.',
        signup_url: '/app?action=signup&source=free_check&check_id=chk_test_9921',
        keeps_result: true
      },
      footer_disclaimer: 'Prepares documents for review. Tamper-evident seal. Not legal advice.'
    };

    // Mock globalThis.fetch
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/analytics/event')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: 'recorded' })
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockReport
      });
    });

    render(
      <BrowserRouter>
        <CheckPage />
      </BrowserRouter>
    );

    // Trigger file input
    const fileInput = document.getElementById('mtc-file-input') as HTMLInputElement;
    const testFile = new File(['dummy bytes'], 'sample_bokaro_mtc.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(screen.getByText(/SAIL Bokaro Steel Plant/i)).toBeDefined();
      expect(screen.getAllByText(/#BOK-26-4910/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Present on Certificate/i)).toBeDefined();
      expect(screen.getByText(/Chemical Composition Limits/i)).toBeDefined();
      expect(screen.getByText(/Mechanical Properties Plausibility/i)).toBeDefined();
      expect(screen.getByText(/Certificate Chronology & Authenticity/i)).toBeDefined();
      expect(screen.getByText(/Get the full pack for your next shipment/i)).toBeDefined();
      expect(screen.getByText(/Sign Up & Keep This Result/i)).toBeDefined();
    });
  });

  it('renders SeoGuidePage with statutory citations and verified dates', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        slug: 'melt-and-pour-eu-steel',
        title: 'Melt and Pour Certificate Requirement for EU Steel Imports',
        official_source: 'Regulation (EU) 2026/1384 Annex I & Implementing Reg (EU) 2026/1963',
        last_checked: '2026-10-01',
        summary: 'Mandatory requirement from 1 October 2026 for all EU steel imports under CN codes 7208 to 7306.',
        key_points: [
          'Covers flat and long steel products under CN codes 7208 through 7306.',
          'Fasteners (CN 7318) and fittings (CN 7307) are out of melt-and-pour scope but remain subject to CBAM.',
          'Importers must show mill test certificate with heat number and country of melt and pour.'
        ]
      })
    });

    render(
      <MemoryRouter initialEntries={['/seo/melt-and-pour-eu-steel']}>
        <Routes>
          <Route path="/seo/:slug" element={<SeoGuidePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Melt and Pour Certificate Requirement for EU Steel Imports/i)).toBeDefined();
      expect(screen.getByText(/Regulation \(EU\) 2026\/1384/i)).toBeDefined();
      expect(screen.getByText(/Instant Compliance Audit: Test Your MTC Now/i)).toBeDefined();
    });
  });
});
