/**
 * HEATLEDGER AI: Prompt Pack v4 Task C1 Frontend Test Suite
 * Buyer Specification Tolerance Modal & Stated Rounding Rule
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BuyerSpecCheckModal } from '../components/compliance/BuyerSpecCheckModal';

describe('Prompt Pack v4 Task C1: BuyerSpecCheckModal', () => {
  it('renders modal with plant-confirmed notice and stated rounding rule when open', () => {
    const handleClose = vi.fn();
    render(
      <BuyerSpecCheckModal
        isOpen={true}
        onClose={handleClose}
        heatNumber="#BOK-26-4910"
        initialGrade="ASTM A105"
      />
    );

    // Title and heat number
    expect(screen.getByRole('heading', { name: /buyer specification tolerance check/i })).toBeDefined();
    expect(screen.getByText(/#BOK-26-4910/)).toBeDefined();
    expect(screen.getByText(/plant-confirmed limits, check against current standard/i)).toBeDefined();

    // Rounding rule stated
    expect(screen.getByText(/ASTM E29 Rounding Method/i)).toBeDefined();

    // Summary line when passing
    expect(screen.getByText(/All 12 heats meet the entered limits/i)).toBeDefined();
  });

  it('renders certificate self-cross check items', () => {
    render(
      <BuyerSpecCheckModal
        isOpen={true}
        onClose={() => {}}
        heatNumber="#BOK-26-4910"
        initialGrade="ASTM A105"
      />
    );

    expect(screen.getByText(/Chemistry Summation/i)).toBeDefined();
    expect(screen.getByText(/IIW Carbon Equivalent \(CEV\)/i)).toBeDefined();
    expect(screen.getByText(/Chronological Date Order/i)).toBeDefined();
  });

  it('flags failure when buyer custom PO imposes stricter carbon cap below measured value', () => {
    render(
      <BuyerSpecCheckModal
        isOpen={true}
        onClose={() => {}}
        heatNumber="#BOK-26-4910"
        initialGrade="ASTM A105"
      />
    );

    // Toggle custom buyer PO limits
    const checkbox = screen.getByRole('checkbox', { name: /buyer po strict limits/i });
    fireEvent.click(checkbox);

    // Change input to 0.15 (below Bokaro's 0.20%)
    const carbonInput = screen.getByLabelText(/buyer carbon limit/i);
    fireEvent.change(carbonInput, { target: { value: '0.15' } });

    // Should now flag failure
    expect(screen.getByText(/fails limits/i)).toBeDefined();
    expect(screen.getByText(/property limits need attention/i)).toBeDefined();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <BuyerSpecCheckModal
        isOpen={true}
        onClose={handleClose}
        heatNumber="#BOK-26-4910"
        initialGrade="ASTM A105"
      />
    );

    const closeBtn = screen.getByRole('button', { name: /^close$/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
