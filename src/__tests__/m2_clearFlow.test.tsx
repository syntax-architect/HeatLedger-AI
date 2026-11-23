import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MtcWorkbenchView } from '../components/dashboard/views/MtcWorkbenchView';
import { ToastProvider } from '../components/ui/ToastContext';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const renderWorkbench = () => {
  return render(
    <ToastProvider>
      <MtcWorkbenchView />
    </ToastProvider>
  );
};

describe('Prompt M2: One Clear Flow (Upload, Review, Add to Shipment, Download)', () => {
  it('renders the 4-step progress stepper at the top of the flow', () => {
    renderWorkbench();

    const progressNav = screen.getByRole('navigation', { name: /Progress/i });
    expect(progressNav).toBeTruthy();

    expect(screen.getByText('1. Upload')).toBeTruthy();
    expect(screen.getByText('2. Review')).toBeTruthy();
    expect(screen.getByText('3. Add to Shipment')).toBeTruthy();
    expect(screen.getByText('4. Download Pack')).toBeTruthy();
  });

  it('navigates to Step 1: Upload and displays drag-and-drop zone and camera capture', () => {
    renderWorkbench();

    // Click step 1
    const uploadStepBtn = screen.getByText('1. Upload');
    fireEvent.click(uploadStepBtn);

    expect(screen.getByText('Step 1: Upload Inspection Certificate')).toBeTruthy();
    expect(screen.getByText(/Drop MTC here or tap to browse/i)).toBeTruthy();
    expect(screen.getByText(/Accepted: PDF, PNG, JPG/i)).toBeTruthy();
    expect(screen.getByText(/Camera Capture/i)).toBeTruthy();
  });

  it('verifies Step 2: Review shows the 8 critical fields with confidence chips and undo action', () => {
    renderWorkbench();

    // Switch to step 2
    fireEvent.click(screen.getByText('2. Review'));

    // 8 Core fields
    expect(screen.getByText(/8 Core Certificate Fields/i)).toBeTruthy();
    expect(screen.getAllByText(/Manufacturer Mill/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Heat \/ Cast Number/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Steel Grade')).toBeTruthy();
    expect(screen.getByText('Product Form')).toBeTruthy();
    expect(screen.getByText('Dimensions / Size')).toBeTruthy();
    expect(screen.getByText('Batch Quantity')).toBeTruthy();
    expect(screen.getAllByText(/Country of Melt & Pour/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Inspection Issue Date')).toBeTruthy();

    // Autosaved indicator
    expect(screen.getByText('Autosaved')).toBeTruthy();
  });

  it('navigates to Step 3: Add to Export Shipment with readiness checklist', () => {
    renderWorkbench();

    // Navigate to step 3
    fireEvent.click(screen.getByText('3. Add to Shipment'));

    expect(screen.getByText('Step 3: Add to Export Shipment')).toBeTruthy();
    expect(screen.getByText(/Statutory Readiness Checklist/i)).toBeTruthy();
    expect(screen.getByText(/Melt & Pour Origin Verified/i)).toBeTruthy();
    expect(screen.getByText(/Product CN Code in Scope/i)).toBeTruthy();
    expect(screen.getByText(/Heat Mass-Balance Reconciled/i)).toBeTruthy();
    expect(screen.getByText(/Confirm & Build Buyer Pack/i)).toBeTruthy();
  });

  it('navigates to Step 4: Download Buyer Pack with inspector TOTP seal and download options', () => {
    renderWorkbench();

    // Navigate to step 4
    fireEvent.click(screen.getByText('4. Download Pack'));

    expect(screen.getByText('Step 4: Buyer Pack Ready for Download')).toBeTruthy();
    expect(screen.getByText(/Buyer Pack Contents/i)).toBeTruthy();
    expect(screen.getByText(/Original Mill Test Certificate \(byte-identical, unmodified\)/i)).toBeTruthy();
    expect(screen.getByText(/Inspector Seal \(TOTP\)/i)).toBeTruthy();

    // Download buttons
    expect(screen.getByText(/Download Buyer Pack \(PDF\)/i)).toBeTruthy();
    expect(screen.getByText(/Download ZIP \(Manifest \+ Originals\)/i)).toBeTruthy();
  });

  it('executes inspector TOTP sealing in Step 4', () => {
    renderWorkbench();

    fireEvent.click(screen.getByText('4. Download Pack'));

    const totpInput = screen.getByPlaceholderText(/Enter 6-digit TOTP/i);
    fireEvent.change(totpInput, { target: { value: '817293' } });

    const sealBtn = screen.getByRole('button', { name: /Apply Inspector Seal/i });
    fireEvent.click(sealBtn);

    expect(screen.getByText('SEALED & TIMESTAMPED')).toBeTruthy();
  });
});
