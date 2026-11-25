import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { PRICING_CONFIG, PricingPlan, trackPricingEvent } from '../../config/pricing';
import { AnimatedNumber } from '../effects/AnimatedNumber';
import { GsapReveal } from '../effects/GsapMotion';

export interface PricingSectionProps {
  onSelectPlan: (planId: string) => void;
  onOpenBookingModal: () => void;
}

const BADGE_LABELS: Record<string, string> = {
  RECOMMENDED: 'Recommended',
  'FOR CA & BROKERS': 'For CA and brokers',
};

export const PricingSection: React.FC<PricingSectionProps> = ({
  onSelectPlan,
  onOpenBookingModal,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPct: number;
  } | null>(null);
  const [couponError, setCouponError] = useState('');

  const primaryPlans = PRICING_CONFIG.plans.filter((p) => p.tier !== 'consultant');
  const consultantPlan = PRICING_CONFIG.plans.find((p) => p.tier === 'consultant');

  const handleCycleChange = (cycle: 'monthly' | 'annual') => {
    setBillingCycle(cycle);
    trackPricingEvent('toggle_billing_cycle', undefined, { cycle });
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    const found = PRICING_CONFIG.coupons.find(
      (c) => c.code.toUpperCase() === couponCode.trim().toUpperCase()
    );
    if (found) {
      setAppliedCoupon({ code: found.code, discountPct: found.discountPct });
      trackPricingEvent('select_plan', undefined, { applied_coupon: found.code });
    } else {
      setCouponError('Invalid code. Try EEPC_INDIA_20 or HOWRAH_MSME');
      setAppliedCoupon(null);
    }
  };

  const calculateDisplayPrice = (plan: PricingPlan) => {
    if (plan.isOneTime) {
      const base = plan.priceOneTimeInr || plan.priceMonthlyInr;
      if (!appliedCoupon) return base;
      return Math.round(base * (1 - appliedCoupon.discountPct / 100));
    }
    const raw = billingCycle === 'annual' ? plan.priceAnnualInr / 12 : plan.priceMonthlyInr;
    if (!appliedCoupon) return Math.round(raw);
    return Math.round(raw * (1 - appliedCoupon.discountPct / 100));
  };

  const handlePlanCta = (plan: PricingPlan) => {
    trackPricingEvent('select_plan', plan.id, { billingCycle });
    if (plan.tier === 'pilot' || plan.tier === 'consultant') {
      onOpenBookingModal();
    } else {
      trackPricingEvent('start_checkout', plan.id, { billingCycle });
      onSelectPlan(plan.id);
    }
  };

  return (
    <section
      id="pricing"
      className="py-20 lg:py-28 bg-[#F7F5F0] text-[#18181A] border-b border-[#18181A]/[0.08]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header + Controls Row */}
        <GsapReveal className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div className="max-w-2xl">
            <div className="text-xs font-mono text-[#047857] mb-3">
              Indian GST ready · SAC {PRICING_CONFIG.sacCode}
            </div>
            <h2 className="text-3xl sm:text-4xl font-medium text-[#18181A] tracking-[-0.025em] leading-[1.12]">
              Transparent pricing for Indian steel exporters
            </h2>
            <p className="mt-4 text-base text-[#55544E] leading-relaxed">
              Predictable plant licensing billed in INR with GSTIN-matched tax invoices. Start with
              a single facility or license across multiple foundry bays.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Billing Cycle Segmented Control */}
            <div
              role="tablist"
              aria-label="Billing cycle"
              className="inline-flex items-center p-1 rounded-lg bg-[#EFECE5] border border-[#18181A]/[0.08]"
            >
              {(
                [
                  { id: 'annual', label: 'Annual · 2 months free' },
                  { id: 'monthly', label: 'Monthly' },
                ] as const
              ).map((cycle) => {
                const isSelected = billingCycle === cycle.id;
                return (
                  <button
                    key={cycle.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => handleCycleChange(cycle.id)}
                    className={`relative px-3.5 py-1.5 rounded text-xs transition-colors whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'text-[#18181A] font-medium'
                        : 'text-[#55544E] hover:text-[#18181A]'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="pricing-billing-pill"
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-0 rounded bg-[#FCFBF8] border border-[#18181A]/[0.08]"
                      />
                    )}
                    <span className="relative z-10">{cycle.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Cluster Subsidy Coupon Form */}
            <form onSubmit={handleApplyCoupon} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Promo code (e.g. EEPC_INDIA_20)"
                aria-label="Promotional coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="w-48 h-9 px-3 rounded-lg bg-[#FCFBF8] border border-[#18181A]/12 text-xs font-mono text-[#18181A] placeholder:text-[#78766E] focus:outline-none focus:border-[#059669]"
              />
              <button
                type="submit"
                className="h-9 px-4 rounded-lg bg-[#EFECE5] hover:bg-[#E5E0D6] border border-[#18181A]/10 text-xs font-medium text-[#18181A] transition-colors whitespace-nowrap cursor-pointer"
              >
                Apply
              </button>
            </form>
          </div>
        </GsapReveal>

        {(appliedCoupon || couponError) && (
          <div className="mb-8 text-xs">
            {appliedCoupon && (
              <span className="text-[#047857] font-medium">
                Applied: {appliedCoupon.code} ({appliedCoupon.discountPct}% cluster discount)
              </span>
            )}
            {couponError && <span className="text-[#DC2626] font-medium">{couponError}</span>}
          </div>
        )}

        {/* 3 Primary Commercial Tiers */}
        <div className="rounded-2xl border border-[#18181A]/10 bg-[#FCFBF8] overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[#18181A]/[0.08]">
            {primaryPlans.map((plan) => {
              const displayPrice = calculateDisplayPrice(plan);
              const isHighlighted = Boolean(plan.highlighted);
              const formattedBadge = plan.badge
                ? BADGE_LABELS[plan.badge] || plan.badge
                : undefined;

              return (
                <div
                  key={plan.id}
                  className={`relative p-6 sm:p-8 flex flex-col justify-between transition-colors duration-150 ${
                    isHighlighted ? 'bg-[#EFECE5]/45' : 'bg-[#FCFBF8]'
                  }`}
                >
                  {isHighlighted && (
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-[2px] bg-[#059669]"
                    />
                  )}

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-lg font-medium text-[#18181A] tracking-[-0.015em]">
                        {plan.name}
                      </h3>
                      {formattedBadge && (
                        <span className="text-xs font-mono text-[#047857]">
                          {formattedBadge}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#55544E] leading-relaxed min-h-[40px]">
                      {plan.description}
                    </p>

                    <div className="mt-5 pb-5 border-b border-[#18181A]/[0.08]">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-medium font-mono tabular-nums text-[#18181A] tracking-[-0.02em]">
                          ₹<AnimatedNumber value={displayPrice} duration={0.4} />
                        </span>
                        <span className="text-xs text-[#78766E]">
                          {plan.isOneTime ? 'one-time' : '/ month'}
                        </span>
                      </div>
                      <p className="text-xs font-mono tabular-nums text-[#78766E] mt-1">
                        {plan.isOneTime
                          ? '100% credited against first 3 months + 18% GST'
                          : billingCycle === 'annual'
                          ? `₹${(displayPrice * 12).toLocaleString('en-IN')}/yr billed annually + 18% GST`
                          : 'Billed monthly + 18% GST'}
                      </p>
                    </div>

                    <div className="mt-4 mb-5 grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/[0.08]">
                        <span className="text-[#78766E] block">MTCs</span>
                        <span className="font-mono tabular-nums font-medium text-[#18181A]">
                          {plan.certificateLimitMonthly}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/[0.08]">
                        <span className="text-[#78766E] block">Plants</span>
                        <span className="font-mono tabular-nums font-medium text-[#18181A]">
                          {plan.maxPlants}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#F7F5F0] border border-[#18181A]/[0.08]">
                        <span className="text-[#78766E] block">Seats</span>
                        <span className="font-mono tabular-nums font-medium text-[#18181A]">
                          {plan.maxUsers}
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-2.5 text-xs text-[#18181A] mb-8">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <Check
                            className="w-4 h-4 text-[#047857] shrink-0 mt-0.5"
                            strokeWidth={1.5}
                          />
                          <span className="leading-relaxed text-[#55544E]">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePlanCta(plan)}
                    className={`w-full h-10 px-4 rounded-lg text-xs font-medium transition-colors duration-150 inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer active:scale-[0.98] ${
                      isHighlighted
                        ? 'bg-[#18181A] hover:bg-black text-[#FCFBF8]'
                        : 'bg-[#F7F5F0] hover:bg-[#EFECE5] text-[#18181A] border border-[#18181A]/12'
                    }`}
                  >
                    <span>{plan.ctaLabel}</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Consultant & Multi-Plant Agency Strip */}
        {consultantPlan && (
          <GsapReveal y={12}>
            <div className="mt-6 p-6 rounded-2xl border border-[#18181A]/10 bg-[#FCFBF8] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-medium text-[#18181A]">
                    {consultantPlan.name}
                  </h3>
                  <span className="text-xs font-mono text-[#78766E]">
                    For customs brokers, CAs, and multi-plant foundry groups
                  </span>
                </div>
                <p className="text-xs text-[#55544E] mt-1.5 leading-relaxed">
                  {consultantPlan.description} Includes multi-plant switcher, white-label buyer
                  reports, and centralized compliance radar across client facilities.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-6 shrink-0">
                <div className="text-left lg:text-right">
                  <div className="font-mono tabular-nums text-xl font-medium text-[#18181A]">
                    ₹<AnimatedNumber value={calculateDisplayPrice(consultantPlan)} duration={0.4} />
                    <span className="text-xs font-sans font-normal text-[#78766E]"> / month</span>
                  </div>
                  <div className="text-xs text-[#78766E]">5+ client plants · 25 seats included</div>
                </div>

                <button
                  type="button"
                  onClick={() => handlePlanCta(consultantPlan)}
                  className="h-10 px-4 rounded-lg bg-[#F7F5F0] hover:bg-[#EFECE5] border border-[#18181A]/12 text-xs font-medium text-[#18181A] transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <span>{consultantPlan.ctaLabel}</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </GsapReveal>
        )}

        {/* Feature Comparison Matrix */}
        <GsapReveal y={12}>
          <div className="mt-12 rounded-2xl border border-[#18181A]/10 bg-[#FCFBF8] overflow-hidden">
            <div className="px-6 py-4 bg-[#EFECE5]/50 border-b border-[#18181A]/[0.08] flex items-center justify-between">
              <h3 className="text-sm font-medium text-[#18181A]">
                Capability breakdown by plant tier
              </h3>
              <span className="hidden sm:inline-block text-xs font-mono text-[#78766E]">
                All prices exclude 18% GST
              </span>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#18181A]/[0.08] text-[#78766E] bg-[#F7F5F0]/60">
                    <th className="py-3 px-6 font-medium">Capability</th>
                    <th className="py-3 px-6 font-medium">Pilot Audit</th>
                    <th className="py-3 px-6 font-medium">Plant Standard</th>
                    <th className="py-3 px-6 font-medium text-[#047857]">Plant Pro</th>
                    <th className="py-3 px-6 font-medium">Consultant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#18181A]/[0.06] text-[#18181A]">
                  {PRICING_CONFIG.matrixRows.map((row) => (
                    <tr
                      key={row.capability}
                      className="hover:bg-[#F7F5F0]/60 transition-colors"
                    >
                      <td className="py-3.5 px-6 font-medium text-[#18181A]">{row.capability}</td>
                      <td className="py-3.5 px-6 text-[#55544E]">{row.pilot}</td>
                      <td className="py-3.5 px-6 text-[#55544E]">{row.plant}</td>
                      <td className="py-3.5 px-6 font-medium text-[#047857]">{row.plantPro}</td>
                      <td className="py-3.5 px-6 text-[#55544E]">{row.consultant}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Capability Cards (< md phones) */}
            <div className="md:hidden divide-y divide-[#18181A]/[0.08] p-4 space-y-4">
              {PRICING_CONFIG.matrixRows.map((row) => (
                <div key={row.capability} className="pt-3 first:pt-0 space-y-2 text-xs">
                  <div className="font-medium text-[#18181A]">{row.capability}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#F7F5F0] p-3 rounded-lg border border-[#18181A]/[0.08]">
                    <div>
                      <span className="text-[#78766E] block">Pilot</span>
                      <span className="font-medium text-[#18181A]">{row.pilot}</span>
                    </div>
                    <div>
                      <span className="text-[#78766E] block">Plant</span>
                      <span className="font-medium text-[#18181A]">{row.plant}</span>
                    </div>
                    <div>
                      <span className="text-[#78766E] block">Plant Pro</span>
                      <span className="font-medium text-[#047857]">{row.plantPro}</span>
                    </div>
                    <div>
                      <span className="text-[#78766E] block">Consultant</span>
                      <span className="font-medium text-[#18181A]">{row.consultant}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GsapReveal>

        {/* Statutory Billing Notice */}
        <div className="mt-8 p-4 rounded-xl bg-[#EFECE5]/60 border border-[#18181A]/[0.08] text-xs text-[#55544E] space-y-1.5">
          <p>
            <span className="font-medium text-[#18181A]">Statutory billing terms:</span> Service
            Accounting Code (SAC){' '}
            <span className="font-mono tabular-nums font-medium text-[#18181A]">
              {PRICING_CONFIG.sacCode}
            </span>{' '}
            ({PRICING_CONFIG.sacDescription}). Subject to{' '}
            <span className="font-mono tabular-nums font-medium text-[#18181A]">
              {PRICING_CONFIG.gstRatePct}%
            </span>{' '}
            Indian GST with GSTIN tax invoice reconciliation upon checkout.
          </p>
          <p className="text-[#78766E]">{PRICING_CONFIG.note}</p>
        </div>
      </div>
    </section>
  );
};
