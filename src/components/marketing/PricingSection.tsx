import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight, HelpCircle, ChevronDown, Sparkles, Building2, ShieldCheck, Zap } from 'lucide-react';
import { PRICING_CONFIG, PricingPlan, trackPricingEvent } from '../../config/pricing';
import { AnimatedNumber } from '../effects/AnimatedNumber';
import { GsapReveal, GsapStagger } from '../effects/GsapMotion';

export interface PricingSectionProps {
  onSelectPlan: (planId: string) => void;
  onOpenBookingModal: () => void;
}

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
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

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
      setCouponError('Invalid code. Try EEPC_INDIA_20 or HOWRAH_MSME.');
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
    if (plan.tier === 'pilot') {
      onOpenBookingModal();
    } else if (plan.tier === 'consultant') {
      onOpenBookingModal();
    } else {
      trackPricingEvent('start_checkout', plan.id, { billingCycle });
      onSelectPlan(plan.id);
    }
  };

  return (
    <section
      id="pricing"
      className="py-20 lg:py-28 bg-[#FFFFFF] dark:bg-slate-950 text-[#09090B] dark:text-slate-100 border-b border-[#E4E4E7] dark:border-slate-800"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header + Controls Row */}
        <GsapReveal className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold text-[#047857] dark:text-emerald-400 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Industrial Licensing · Indian GST Ready (SAC {PRICING_CONFIG.sacCode})</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold text-[#09090B] dark:text-white tracking-[-0.03em] leading-[1.12]">
              Transparent pricing for Indian steel exporters
            </h2>
            <p className="mt-4 text-base text-[#52525B] dark:text-slate-400 leading-relaxed">
              Predictable plant licensing billed in INR with GSTIN-matched tax invoices. Start with
              a single facility or scale across multiple shop floors.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Billing Cycle Segmented Control */}
            <div
              role="tablist"
              aria-label="Billing cycle"
              className="inline-flex items-center p-1 rounded-lg bg-[#F4F4F5] dark:bg-slate-900 border border-[#E4E4E7] dark:border-slate-800"
            >
              {(
                [
                  { id: 'annual', label: 'Annual · 2 Months Free' },
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
                    className={`relative px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'text-[#09090B] dark:text-slate-900 font-semibold'
                        : 'text-[#52525B] dark:text-slate-400 hover:text-[#09090B]'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="pricing-billing-pill"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        className="absolute inset-0 rounded-md bg-[#FFFFFF] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                      />
                    )}
                    <span className="relative z-10">{cycle.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Compact Cluster Subsidy Coupon Form */}
            <form onSubmit={handleApplyCoupon} className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Promo code (e.g. EEPC_INDIA_20)"
                aria-label="Promotional coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="w-44 px-3 py-2 rounded-lg bg-[#FFFFFF] dark:bg-slate-900 border border-[#E4E4E7] dark:border-slate-800 text-xs font-mono text-[#09090B] dark:text-slate-100 placeholder:text-[#52525B]/70 focus:outline-none focus:border-[#059669]"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-lg bg-[#F4F4F5] dark:bg-slate-800 hover:bg-[#E4E4E7] dark:hover:bg-slate-700 border border-[#E4E4E7] dark:border-slate-700 text-xs font-semibold text-[#09090B] dark:text-slate-200 transition-colors whitespace-nowrap cursor-pointer"
              >
                Apply
              </button>
            </form>
          </div>
        </GsapReveal>

        {(appliedCoupon || couponError) && (
          <div className="mb-8 text-xs">
            {appliedCoupon && (
              <span className="text-[#047857] dark:text-emerald-400 font-medium">
                Applied: {appliedCoupon.code} ({appliedCoupon.discountPct}% Cluster Discount)
              </span>
            )}
            {couponError && <span className="text-[#B91C1C] font-medium">{couponError}</span>}
          </div>
        )}

        {/* 3 Primary Commercial SaaS Tiers (Pilot, Plant, Plant Pro) */}
        <div className="rounded-xl border border-[#E4E4E7] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
          <GsapStagger
            stagger={0.09}
            className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[#E4E4E7] dark:divide-slate-800"
          >
            {primaryPlans.map((plan) => {
              const displayPrice = calculateDisplayPrice(plan);
              const isHighlighted = Boolean(plan.highlighted);

              return (
                <div
                  key={plan.id}
                  data-gsap-item
                  className={`relative p-6 sm:p-8 flex flex-col justify-between transition-colors duration-200 ${
                    isHighlighted
                      ? 'bg-[#FAFAFA]/90 dark:bg-slate-800/60'
                      : 'bg-[#FFFFFF] dark:bg-slate-900 hover:bg-[#FAFAFA]/50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  {/* Emerald Top Accent Bar on Recommended Tier */}
                  {isHighlighted && (
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-[3px] bg-[#059669]"
                    />
                  )}

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-[#09090B] dark:text-white tracking-[-0.02em]">
                        {plan.name}
                      </h3>
                      {plan.badge && (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#ECFDF5] dark:bg-emerald-950 text-[#047857] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">
                          {plan.badge}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#52525B] dark:text-slate-400 leading-relaxed min-h-[44px]">
                      {plan.description}
                    </p>

                    <div className="mt-5 pb-5 border-b border-[#E4E4E7] dark:border-slate-800">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-semibold font-mono tabular-nums text-[#09090B] dark:text-white tracking-[-0.02em]">
                          ₹<AnimatedNumber value={displayPrice} duration={0.4} />
                        </span>
                        <span className="text-xs text-[#52525B] dark:text-slate-400">
                          {plan.isOneTime ? 'one-time' : '/ month'}
                        </span>
                      </div>
                      <p className="text-xs font-mono tabular-nums text-[#52525B] dark:text-slate-400 mt-1">
                        {plan.isOneTime
                          ? '100% credited against 1st 3 mos subscription + 18% GST'
                          : billingCycle === 'annual'
                          ? `₹${(displayPrice * 12).toLocaleString('en-IN')}/yr billed annually + 18% GST`
                          : 'Billed monthly + 18% GST'}
                      </p>
                    </div>

                    <div className="mt-4 mb-5 grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-[#FAFAFA] dark:bg-slate-800 border border-[#E4E4E7] dark:border-slate-700">
                        <span className="text-[#52525B] dark:text-slate-400 block">MTCs</span>
                        <span className="font-mono tabular-nums font-semibold text-[#09090B] dark:text-slate-200">
                          {plan.certificateLimitMonthly}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#FAFAFA] dark:bg-slate-800 border border-[#E4E4E7] dark:border-slate-700">
                        <span className="text-[#52525B] dark:text-slate-400 block">Plants</span>
                        <span className="font-mono tabular-nums font-semibold text-[#09090B] dark:text-slate-200">
                          {plan.maxPlants}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#FAFAFA] dark:bg-slate-800 border border-[#E4E4E7] dark:border-slate-700">
                        <span className="text-[#52525B] dark:text-slate-400 block">Seats</span>
                        <span className="font-mono tabular-nums font-semibold text-[#09090B] dark:text-slate-200">
                          {plan.maxUsers}
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-2.5 text-xs text-[#09090B] dark:text-slate-200 mb-8">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-[#047857] dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePlanCta(plan)}
                    className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors duration-150 inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer group ${
                      isHighlighted
                        ? 'bg-[#047857] hover:bg-[#065F46] text-white shadow-sm'
                        : 'bg-[#FFFFFF] dark:bg-slate-800 hover:bg-[#F4F4F5] dark:hover:bg-slate-700 text-[#09090B] dark:text-white border border-[#E4E4E7] dark:border-slate-700'
                    }`}
                  >
                    <span>{plan.ctaLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              );
            })}
          </GsapStagger>
        </div>

        {/* Consultant & Multi-Plant Agency Strip */}
        {consultantPlan && (
          <GsapReveal y={18}>
            <div className="mt-6 p-6 rounded-xl border border-[#E4E4E7] dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-900 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-base font-semibold text-[#09090B] dark:text-white">
                    {consultantPlan.name}
                  </h3>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-[#FFFFFF] dark:bg-slate-800 text-[#52525B] dark:text-slate-400 border border-[#E4E4E7] dark:border-slate-700">
                    For customs brokers, CAs &amp; multi-plant foundry groups
                  </span>
                </div>
                <p className="text-xs text-[#52525B] dark:text-slate-400 mt-1.5 leading-relaxed">
                  {consultantPlan.description} Includes multi-plant switcher, white-label buyer reports,
                  and centralized compliance radar across all client facilities.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-5 shrink-0">
                <div className="text-left lg:text-right">
                  <div className="font-mono tabular-nums text-xl font-semibold text-[#09090B] dark:text-white">
                    ₹<AnimatedNumber value={calculateDisplayPrice(consultantPlan)} duration={0.4} />
                    <span className="text-xs font-sans font-normal text-[#52525B] dark:text-slate-400">
                      {' '}
                      / month
                    </span>
                  </div>
                  <div className="text-xs text-[#52525B] dark:text-slate-400">
                    5+ client plants · 25 seats included
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handlePlanCta(consultantPlan)}
                  className="px-4 py-2.5 rounded-lg bg-[#FFFFFF] dark:bg-slate-800 hover:bg-[#F4F4F5] dark:hover:bg-slate-700 border border-[#E4E4E7] dark:border-slate-700 text-xs font-semibold text-[#09090B] dark:text-white transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer group"
                >
                  <span>{consultantPlan.ctaLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </GsapReveal>
        )}

        {/* Feature Comparison Matrix: Table on Desktop, Stacked Cards on Mobile (Prompt L2) */}
        <GsapReveal y={20}>
          <div className="mt-12 rounded-xl border border-[#E4E4E7] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 overflow-hidden">
            <div className="px-6 py-4 bg-[#FAFAFA] dark:bg-slate-800/60 border-b border-[#E4E4E7] dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#09090B] dark:text-white">
                Detailed capability matrix across factory tiers
              </h3>
              <span className="hidden sm:inline-block text-xs text-[#52525B] dark:text-slate-400">
                Single source of truth (Prompt L2)
              </span>
            </div>

            {/* Desktop Table View (Visible md and above) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E4E4E7] dark:border-slate-800 text-[#52525B] dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="py-3 px-6 font-medium">Capability</th>
                    <th className="py-3 px-6 font-medium">Pilot Audit</th>
                    <th className="py-3 px-6 font-medium">Plant Standard</th>
                    <th className="py-3 px-6 font-semibold text-[#047857] dark:text-emerald-400">
                      Plant Pro
                    </th>
                    <th className="py-3 px-6 font-medium">Consultant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F4F5] dark:divide-slate-800 text-[#09090B] dark:text-slate-200">
                  {PRICING_CONFIG.matrixRows.map((row) => (
                    <tr
                      key={row.capability}
                      className="hover:bg-[#FAFAFA] dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-slate-100">
                        {row.capability}
                      </td>
                      <td className="py-3.5 px-6 text-[#52525B] dark:text-slate-400">{row.pilot}</td>
                      <td className="py-3.5 px-6 text-[#52525B] dark:text-slate-300">{row.plant}</td>
                      <td className="py-3.5 px-6 font-medium text-[#047857] dark:text-emerald-400">
                        {row.plantPro}
                      </td>
                      <td className="py-3.5 px-6 text-[#52525B] dark:text-slate-400">
                        {row.consultant}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Capability Cards (< md phones per Prompt L2) */}
            <div className="md:hidden divide-y divide-[#E4E4E7] dark:divide-slate-800 p-4 space-y-4">
              {PRICING_CONFIG.matrixRows.map((row) => (
                <div key={row.capability} className="pt-3 first:pt-0 space-y-2 text-xs">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{row.capability}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Pilot:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{row.pilot}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Plant:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{row.plant}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Plant Pro:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {row.plantPro}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Consultant:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {row.consultant}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GsapReveal>

        {/* FAQ on Limits & What Is NOT Included (Prompt L2) */}
        <GsapReveal y={20}>
          <div className="mt-14 max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h3 className="text-xl sm:text-2xl font-semibold text-[#09090B] dark:text-white">
                Frequently Asked Questions on Limits &amp; Scope
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-[#52525B] dark:text-slate-400">
                Transparent statutory boundaries and clarity on what HeatLedger provides.
              </p>
            </div>

            <div className="space-y-3">
              {PRICING_CONFIG.faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="rounded-xl border border-[#E4E4E7] dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                          isOpen ? 'rotate-180 text-emerald-600' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </GsapReveal>

        {/* GST & Hypothesis Notice (Prompt L2) */}
        <div className="mt-10 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5">
          <p>
            <strong>Statutory Billing Notice:</strong> Service Accounting Code (SAC):{' '}
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
              {PRICING_CONFIG.sacCode}
            </span>{' '}
            ({PRICING_CONFIG.sacDescription}). Subject to statutory{' '}
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
              {PRICING_CONFIG.gstRatePct}%
            </span>{' '}
            Indian GST. Official B2B tax invoices with GSTIN matching generated upon checkout.
          </p>
          <p className="italic text-slate-400 dark:text-slate-500">
            * {PRICING_CONFIG.note}
          </p>
        </div>
      </div>
    </section>
  );
};
