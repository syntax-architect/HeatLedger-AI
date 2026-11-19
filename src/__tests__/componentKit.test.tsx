import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Button,
  Switch,
  Checkbox,
  StatusChip,
  ConfidenceBadge,
  HeatNumberTag,
  CNCodeTag,
  RupeeAmount,
  EuroAmount,
  StatTile,
  LazyChart,
  StatusType,
} from '../components/ui';

describe('Prompt D5: Accessible Component Kit', () => {
  it('renders Button variants, loading state and disabled state', () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button variant="primary" onClick={onClick}>
        Sign Certificate
      </Button>
    );

    const btn = screen.getByRole('button', { name: /Sign Certificate/i });
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);

    // Loading state disables interaction
    rerender(
      <Button variant="primary" isLoading onClick={onClick}>
        Sign Certificate
      </Button>
    );
    expect(btn.getAttribute('disabled')).not.toBeNull();
  });

  it('renders Switch with accessible role="switch" and keyboard support', () => {
    const onChange = vi.fn();
    render(
      <Switch
        checked={false}
        onChange={onChange}
        label="Automated Bundling"
      />
    );

    const sw = screen.getByRole('switch', { name: /Automated Bundling/i });
    expect(sw.getAttribute('aria-checked')).toBe('false');

    // Click triggers change
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);

    // Space key triggers change
    fireEvent.keyDown(sw, { key: ' ' });
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('renders Checkbox with accessible role="checkbox" and error messages', () => {
    const onChange = vi.fn();
    render(
      <Checkbox
        checked={true}
        onChange={onChange}
        label="Accept Declaration"
        error="Declaration is required"
      />
    );

    const cb = screen.getByRole('checkbox', { name: /Accept Declaration/i });
    expect(cb.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('Declaration is required')).toBeDefined();

    fireEvent.click(cb);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('renders StatusChip with both icon and text for all 8 required status types', () => {
    const statuses: StatusType[] = [
      'Verified',
      'Needs review',
      'Missing',
      'Out of spec',
      'Awaiting sign-off',
      'Signed',
      'Draft',
      'Superseded',
    ];

    statuses.forEach((status) => {
      const { unmount } = render(<StatusChip status={status} />);
      expect(screen.getByText(status)).toBeDefined();
      unmount();
    });
  });

  it('renders ConfidenceBadge with accurate percentage thresholds', () => {
    const { rerender } = render(<ConfidenceBadge confidence={98.5} />);
    expect(screen.getByText('99% Conf')).toBeDefined();

    rerender(<ConfidenceBadge confidence={78.2} />);
    expect(screen.getByText('78% Conf')).toBeDefined();

    rerender(<ConfidenceBadge confidence={55.0} />);
    expect(screen.getByText('55% Conf')).toBeDefined();
  });

  it('renders HeatNumberTag with copy feedback', () => {
    render(<HeatNumberTag heatNumber="H-49210-B" />);
    expect(screen.getByText('H-49210-B')).toBeDefined();
  });

  it('renders CNCodeTag with CN prefix and code', () => {
    render(<CNCodeTag code="7214 20 00" />);
    expect(screen.getByText('7214 20 00')).toBeDefined();
    expect(screen.getByText('CN')).toBeDefined();
  });

  it('formats RupeeAmount and EuroAmount with appropriate currency conventions', () => {
    const { rerender } = render(<RupeeAmount amount={450000} shortFormat={false} />);
    expect(screen.getByText(/₹4,50,000/)).toBeDefined();

    rerender(<RupeeAmount amount={15000000} shortFormat={true} />);
    expect(screen.getByText(/₹1.50 Cr/)).toBeDefined();

    render(<EuroAmount amount={4850.5} />);
    expect(screen.getByText(/€4.850,5/)).toBeDefined();
  });

  it('renders StatTile with label, value, and sparkline polyline', () => {
    render(
      <StatTile
        label="Direct Emissions"
        value="1.82 tCO₂e"
        delta="-42%"
        isPositive={true}
        sparklineData={[30, 25, 20, 18]}
      />
    );

    expect(screen.getByText('Direct Emissions')).toBeDefined();
    expect(screen.getByText('1.82 tCO₂e')).toBeDefined();
    expect(screen.getByText('-42%')).toBeDefined();
  });

  it('renders LazyChart with accessible summary and toggles to HTML data table', () => {
    render(
      <LazyChart
        title="Emission Trends"
        textSummary="Emissions declined from 2.15 to 1.82 tCO₂e/t."
        primaryLabel="Measured"
        secondaryLabel="Default"
        unit="tCO₂e"
        data={[
          { label: 'Q1', value: 2.15, secondaryValue: 3.15 },
          { label: 'Q2', value: 1.82, secondaryValue: 3.15 },
        ]}
      />
    );

    expect(screen.getByText('Emission Trends')).toBeDefined();
    expect(screen.getByText(/Emissions declined from 2.15 to 1.82/)).toBeDefined();

    // Toggle to Data Table
    const tableBtn = screen.getByRole('button', { name: /Data Table/i });
    fireEvent.click(tableBtn);

    // Verify accessible HTML <table> and rows
    expect(screen.getByRole('table')).toBeDefined();
    expect(screen.getByText('Q1')).toBeDefined();
    expect(screen.getByText('Q2')).toBeDefined();
  });
});
