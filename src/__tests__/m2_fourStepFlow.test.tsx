import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CoreFourStepFlowView } from '../components/dashboard/views/CoreFourStepFlowView';
import { ToastProvider } from '../components/ui/ToastContext';

const renderFlow = () => {
  return render(
    <ToastProvider>
      <CoreFourStepFlowView />
    </ToastProvider>
  );
};

describe('Prompt M2: Core 4-Step Flow (Upload, Review, Shipment, Download)', () => {
  it('m2.1: Renders 4-step progress bar with clear steps', () => {
    renderFlow();

    expect(screen.getByText('Upload')).toBeTruthy();
    expect(screen.getByText('Review')).toBeTruthy();
    expect(screen.getByText('Shipment')).toBeTruthy();
    expect(screen.getByText('Download')).toBeTruthy();
    expect(screen.getByText('Upload Mill Test Certificate')).toBeTruthy();
    expect(screen.getByText('Click to browse or drag file here')).toBeTruthy();
  });

  it('m2.2: Advances to Step 2 (Review) with 8 core fields and confidence chips', async () => {
    renderFlow();

    // Click sample MTC button
    const sampleBtn = screen.getByText(/Use Sample MTC/i);
    fireEvent.click(sampleBtn);

    // Wait for Step 2 to render
    await waitFor(() => {
      expect(screen.getByText('Key Verification Fields')).toBeTruthy();
    });

    // Check all 8 core fields exist
    expect(screen.getByText('Manufacturer Mill')).toBeTruthy();
    expect(screen.getByText('Heat Number')).toBeTruthy();
    expect(screen.getByText('Steel Grade')).toBeTruthy();
    expect(screen.getByText('Product Type')).toBeTruthy();
    expect(screen.getByText('Dimensions / Size')).toBeTruthy();
    expect(screen.getByText('Quantity (Tonnes)')).toBeTruthy();
    expect(screen.getByText('Country of Melt and Pour')).toBeTruthy();
    expect(screen.getByText('Inspection / Test Date')).toBeTruthy();
  });

  it('m2.3: Requires confirming low-confidence field before advancing to Step 3', async () => {
    renderFlow();

    // Advance to Step 2
    fireEvent.click(screen.getByText(/Use Sample MTC/i));
    await waitFor(() => {
      expect(screen.getByText('Key Verification Fields')).toBeTruthy();
    });

    // Check that melt country requires confirmation
    const confirmBtn = screen.getByRole('button', { name: /Confirm/i });
    expect(confirmBtn).toBeTruthy();

    // Confirm the field
    fireEvent.click(confirmBtn);

    // Now all are confirmed, "Add to Shipment" button is enabled
    const nextBtn = screen.getByRole('button', { name: /Add to Shipment/i });
    expect(nextBtn.hasAttribute('disabled')).toBe(false);
    fireEvent.click(nextBtn);

    // Should now be on Step 3
    await waitFor(() => {
      expect(screen.getByText('Link Heat to Export Shipment')).toBeTruthy();
      expect(screen.getByText('Readiness Gate Checks')).toBeTruthy();
    });
  });

  it('m2.4: Step 4 renders Buyer Pack download and Inspector Seal', async () => {
    renderFlow();

    // Advance directly to step 4 by clicking on progress bar
    const step4Btn = screen.getByRole('button', { name: /Download/i });
    fireEvent.click(step4Btn);

    await waitFor(() => {
      expect(screen.getByText('Buyer Compliance Pack Ready')).toBeTruthy();
    });

    expect(screen.getByText(/Inspector Cryptographic Seal/i)).toBeTruthy();
    expect(screen.getByText(/Download Complete Buyer Pack/i)).toBeTruthy();
    expect(screen.getByText(/Copy Customs Share Link/i)).toBeTruthy();
  });
});
