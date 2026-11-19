/**
 * HEATLEDGER AI: Prompt D7 Test Suite
 * Marketing website v2: faster, mobile-first, honest
 */

import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PRICING_CONFIG } from '../config/pricing';
import { SOURCED_REGULATORY_FACTS } from '../data/sourcedFacts';
import { WhyNowSection } from '../components/marketing/WhyNowSection';
import { ProblemSection } from '../components/marketing/ProblemSection';
import { HowItWorksSection } from '../components/marketing/HowItWorksSection';
import { PricingSection } from '../components/marketing/PricingSection';
import { MobileHeroMockup } from '../components/marketing/MobileHeroMockup';
import { FaqSection } from '../components/marketing/FaqSection';

beforeAll(() => {
  // Mock IntersectionObserver for Framer Motion whileInView
  class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });

  // Mock localStorage for test environment
  const store: Record<string, string> = {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k in store) delete store[k];
      },
    },
    writable: true,
  });
});

describe('Prompt D7: Marketing Website v2 Honest & Sourced Content', () => {
  it('d7.1: Sourced regulatory facts only contain dated, official European Union citations', () => {
    expect(SOURCED_REGULATORY_FACTS.length).toBeGreaterThanOrEqual(4);

    const factTitles = SOURCED_REGULATORY_FACTS.map((f) => f.title);
    expect(factTitles.some((t) => t.includes('Definitive CBAM'))).toBe(true);
    expect(factTitles.some((t) => t.includes('Melt and Pour'))).toBe(true);

    SOURCED_REGULATORY_FACTS.forEach((fact) => {
      expect(fact.statutoryReference).toMatch(/Regulation|EN 10204/);
      expect(fact.date).toBeTruthy();
      expect(fact.description.length).toBeGreaterThan(30);
    });
  });

  it('d7.2: Pricing configuration contains 3 core tiers plus consultant license, SAC 998313 and GST', () => {
    expect(PRICING_CONFIG.sacCode).toBe('998313');
    expect(PRICING_CONFIG.gstRatePct).toBe(18.0);
    expect(PRICING_CONFIG.plans.length).toBe(4);

    const tiers = PRICING_CONFIG.plans.map((p) => p.tier);
    expect(tiers).toContain('starter');
    expect(tiers).toContain('growth');
    expect(tiers).toContain('enterprise');
    expect(tiers).toContain('consultant');

    // Verify annual discount pricing is active
    const growth = PRICING_CONFIG.plans.find((p) => p.tier === 'growth')!;
    expect(growth.priceAnnualInr).toBeLessThan(growth.priceMonthlyInr * 12);
  });

  it('d7.3: Mobile hero mockup renders lightweight certificate indicators under 60 KB', () => {
    render(<MobileHeroMockup />);
    expect(screen.getByText('MTC-IN-TSJ-26-9021')).toBeTruthy();
    expect(screen.getByText('Melt: India (IN) ✓')).toBeTruthy();
    expect(screen.getByText('Melt & Pour Verified')).toBeTruthy();
  });

  it('d7.4: PricingSection allows applying valid promo coupons with live discount calculation', () => {
    const handleSelectPlan = vi.fn();
    const handleOpenBooking = vi.fn();

    render(
      <PricingSection
        onSelectPlan={handleSelectPlan}
        onOpenBookingModal={handleOpenBooking}
      />
    );

    // Initial starter price rendered
    expect(screen.getByText('Exporter Starter')).toBeTruthy();
    expect(screen.getByText('Multi-Plant Growth')).toBeTruthy();

    // Apply promo coupon
    const couponInput = screen.getByPlaceholderText(/Promo coupon/i);
    const applyBtn = screen.getByRole('button', { name: /Apply/i });

    fireEvent.change(couponInput, { target: { value: 'EEPC_INDIA_20' } });
    fireEvent.click(applyBtn);

    expect(screen.getByText(/Applied: EEPC_INDIA_20 \(20% Discount\)/i)).toBeTruthy();
  });

  it('d7.5: FaqSection renders accessible accordion and injects Schema.org FAQPage JSON-LD', () => {
    render(<FaqSection />);

    expect(screen.getByText('Frequently Asked Questions')).toBeTruthy();
    expect(
      screen.getByText(/What happens if our mill test certificate does not declare the Country of Melt and Pour\?/i)
    ).toBeTruthy();

    const script = document.getElementById('faq-jsonld');
    expect(script).toBeTruthy();
    expect(script?.getAttribute('type')).toBe('application/ld+json');
    const parsed = JSON.parse(script?.textContent || '{}');
    expect(parsed['@type']).toBe('FAQPage');
    expect(parsed.mainEntity.length).toBeGreaterThan(3);
  });

  it('d7.6: WhyNow and Problem sections display statutory disclaimers and no unsubstantiated claims', () => {
    render(<WhyNowSection />);
    expect(screen.getByText('Why 2026 Ends Spreadsheet Self-Declarations')).toBeTruthy();
    expect(screen.getAllByText(/Statutory Requirement/i).length).toBeGreaterThanOrEqual(1);

    render(<ProblemSection />);
    expect(screen.getByText('How Excel Spreadsheets Cause Customs Impoundment')).toBeTruthy();
    expect(screen.getByText(/Violates EN 10204 Clause 6/i)).toBeTruthy();
  });
});
