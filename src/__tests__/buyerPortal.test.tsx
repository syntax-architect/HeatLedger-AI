import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SharePage } from '../pages/SharePage';

describe('Prompt P4: Buyer and Customs-Broker Portal', () => {
  it('renders read-only buyer portal with shipment summary and melt-and-pour country by heat', async () => {
    render(
      <MemoryRouter initialEntries={['/share/hl_demo_token']}>
        <Routes>
          <Route path="/share/:token" element={<SharePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Header & Shipment ID
    await waitFor(() => {
      expect(screen.getByText(/EU CBAM Compliance & EN 10204 Clause 6 Dossier/i)).toBeTruthy();
    });

    expect(screen.getAllByText(/EXP-2026-109/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Port of Rotterdam/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Howrah Precision Forgings/i)).toBeTruthy();

    // Heats table with Melt and Pour Country
    expect(screen.getByText('TSJ-26-9021')).toBeTruthy();
    expect(screen.getAllByText(/India \(IN\)/i).length).toBeGreaterThanOrEqual(1);

    // Downloads section
    expect(screen.getByText(/Complete Clause 6 ZIP Package/i)).toBeTruthy();
    expect(screen.getByText(/Official EU CBAM Data Sheet \(XML\)/i)).toBeTruthy();

    // Growth loop
    expect(screen.getAllByText(/Prepared with HeatLedger/i).length).toBeGreaterThanOrEqual(1);
  });

  it('allows buyer to open action modal and submit feedback without account', async () => {
    render(
      <MemoryRouter initialEntries={['/share/hl_demo_token']}>
        <Routes>
          <Route path="/share/:token" element={<SharePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Accept Dossier/i)).toBeTruthy();
    });

    // Click 'Ask Question'
    const askBtn = screen.getByRole('button', { name: /Ask Question/i });
    fireEvent.click(askBtn);

    // Modal opens
    expect(screen.getByText(/Raise a Question to Exporter/i)).toBeTruthy();

    // Fill name & question
    const nameInput = screen.getByPlaceholderText(/e\.g\. Hans Gruber/i);
    fireEvent.change(nameInput, { target: { value: 'Klaus Mueller' } });

    const msgInput = screen.getByPlaceholderText(/Describe your question/i);
    fireEvent.change(msgInput, { target: { value: 'Please confirm tensile test method.' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Notification/i });
    fireEvent.click(submitBtn);

    // Success notice shown (matches both online response and offline/demo fallback)
    await waitFor(() => {
      expect(screen.getByText(/exporter QA/i)).toBeTruthy();
    });
  });
});
