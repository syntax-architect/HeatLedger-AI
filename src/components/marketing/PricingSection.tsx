import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { PRICING_CONFIG, PricingPlan } from '../../config/pricing';
import { AnimatedNumber } from '../effects/AnimatedNumber';
import { GsapReveal, GsapStagger } from '../effects/GsapMotion';

export interface PricingSectionProps {
  onSelectPlan: (planId: string) => void;
  onOpenBookingModal: () => void;
}

const MATRIX_ROWS = [
  {
    feature: 'Monthly EN 10204 3.1 OCR certificates',
    starter: 'Up to 50',
    growth: 'Up to 200',
    enterprise: 'Unlimited',
  },
  {
    feature: 'Clause 6 byte-identical Annex A preservation',
    starter: 'Included',
    growth: 'Included',
    enterprise: 'Included',
  },
  {
    feature: 'Anti-phantom heat mass-balance ledger',
    starter: 'Single plant',
    growth: 'Up to 3 plants',
    enterprise: 'Multi-site + ERP sync',
  },
  {
    feature: 'Digitally Signed (Ed25519) inspector queue',
    starter: 'Draft export',
    growth: 'Included',
    enterprise: 'Included + HSM option',
  },
  {
    feature: 'EU / UK CBAM SEE trace & draft XML export',
    starter: 'Draft preview',
    growth: 'Included',
    enterprise: 'Included + verifier portal',
  },
  {
    feature: 'Supplier precursor intake links (no-login)',
    starter: '—',
    growth: 'Included',
    enterprise: 'Custom domain + API',
  },
];

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

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    const found = PRICING_CONFIG.coupons.find(
      (c) => c.code.toUpperCase() === couponCode.trim().toUpperCase()
    );
    if (found) {
      setAppliedCoupon({ code: found.code, discountPct: found.discountPct });
    } else {
      setCouponError('Invalid code. Try EEPC_INDIA_20 or HOWRAH_MSME.');
      setAppliedCoupon(null);
    }
  };

  const calculateDisplayPrice = (plan: PricingPlan) => {
    const raw = billingCycle === 'annual' ? plan.priceAnnualInr / 12 : plan.priceMonthlyInr;
    if (!appliedCoupon) return Math.round(raw);
    return Math.round(raw * (1 - appliedCoupon.discountPct / 100));
  };

  return (
    <section
      id="pricing"
      className="py-20 lg:py-28 bg-[#FFFFFF] text-[#09090B] border-b border-[#E4E4E7]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header + Controls Row */}
        <GsapReveal className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold text-[#047857] mb-3">
              Industrial Licensing · Indian GST Ready (SAC {PRICING_CONFIG.sacCode})
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold text-[#09090B] tracking-[-0.03em] leading-[1.12] [text-wrap:balance]">
              Transparent pricing for Indian steel exporters
            </h2>
            <p className="mt-4 text-base text-[#52525B] leading-relaxed">
              Predictable plant licensing billed in INR with GSTIN-matched tax invoices. Start with
              a single facility or scale across multiple shop floors.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Billing Cycle Segmented Control with Spring Pill */}
            <div
              role="tablist"
              aria-label="Billing cycle"
              className="inline-flex items-center p-1 rounded-lg bg-[#F4F4F5] border border-[#E4E4E7]"
            >
              {(
                [
                  { id: 'annual', label: 'Annual · Save 17%' },
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
                    onClick={() => setBillingCycle(cycle.id)}
                    className={`relative px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'text-[#09090B] font-semibold'
                        : 'text-[#52525B] hover:text-[#09090B]'
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
                placeholder="Promo coupon / Cluster code (e.g. EEPC_INDIA_20)"
                aria-label="Promotional coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="w-48 px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] text-xs font-mono text-[#09090B] placeholder:text-[#52525B]/70 focus:outline-none focus:border-[#059669]"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-lg bg-[#F4F4F5] hover:bg-[#E4E4E7] border border-[#E4E4E7] text-xs font-semibold text-[#09090B] transition-colors whitespace-nowrap cursor-pointer"
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
                Applied: {appliedCoupon.code} ({appliedCoupon.discountPct}% Discount)
              </span>
            )}
            {couponError && <span className="text-[#B91C1C] font-medium">{couponError}</span>}
          </div>
        )}

        {/* 3-Column Architectural Pricing Table */}
        <div className="rounded-xl border border-[#E4E4E7] bg-[#FFFFFF] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
          <GsapStagger
            stagger={0.09}
            className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[#E4E4E7]"
          >
            {primaryPlans.map((plan) => {
              const displayMonthly = calculateDisplayPrice(plan);
              const isHighlighted = Boolean(plan.highlighted);

              return (
                <div
                  key={plan.id}
                  data-gsap-item
                  className={`relative p-6 sm:p-8 flex flex-col justify-between transition-colors duration-200 ${
                    isHighlighted ? 'bg-[#FAFAFA]/80' : 'bg-[#FFFFFF] hover:bg-[#FAFAFA]/40'
                  }`}
                >
                  {/* Crisp 2px Emerald Top Accent Bar on Recommended Tier */}
                  {isHighlighted && (
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-[2px] bg-[#059669]"
                    />
                  )}

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-[#09090B] tracking-[-0.02em]">
                        {plan.name}
                      </h3>
                      {plan.badge && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#047857] border border-emerald-200 whitespace-nowrap">
                          Recommended
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#52525B] leading-relaxed min-h-[40px]">
                      {plan.description}
                    </p>

                    <div className="mt-5 pb-5 border-b border-[#E4E4E7]">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-semibold font-mono tabular-nums text-[#09090B] tracking-[-0.02em]">
                          ₹<AnimatedNumber value={displayMonthly} duration={0.4} />
                        </span>
                        <span className="text-xs text-[#52525B]">/ month</span>
                      </div>
                      <p className="text-xs font-mono tabular-nums text-[#52525B] mt-1">
                        {billingCycle === 'annual'
                          ? `₹${(displayMonthly * 12).toLocaleString('en-IN')}/yr billed annually + 18% GST`
                          : 'Billed monthly + 18% GST'}
                      </p>
                    </div>

                    <div className="mt-4 mb-5 grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7]">
                        <span className="text-[#52525B] block">MTCs/mo</span>
                        <span className="font-mono tabular-nums font-semibold text-[#09090B]">
                          {plan.certificateLimitMonthly}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7]">
                        <span className="text-[#52525B] block">Plants</span>
                        <span className="font-mono tabular-nums font-semibold text-[#09090B]">
                          {plan.maxPlants}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7]">
                        <span className="text-[#52525B] block">Seats</span>
                        <span className="font-mono tabular-nums font-semibold text-[#09090B]">
                          {plan.maxUsers}
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-2.5 text-xs text-[#09090B] mb-8">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-[#047857] shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (plan.tier === 'enterprise') {
                        onOpenBookingModal();
                      } else {
                        onSelectPlan(plan.id);
                      }
                    }}
                    className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors duration-150 inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer group ${
                      isHighlighted
                        ? 'bg-[#047857] hover:bg-[#065F46] text-white'
                        : 'bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#09090B] border border-[#E4E4E7]'
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

        {/* Consultant & Trade Verifier Agency Strip */}
        {consultantPlan && (
          <GsapReveal y={18}>
            <div className="mt-6 p-6 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-base font-semibold text-[#09090B]">{consultantPlan.name}</h3>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-[#FFFFFF] text-[#52525B] border border-[#E4E4E7]">
                    For customs brokers &amp; trade consultants
                  </span>
                </div>
                <p className="text-xs text-[#52525B] mt-1.5 leading-relaxed">
                  {consultantPlan.description} Includes multi-client switcher, co-branded
                  verification packages, and up to {consultantPlan.certificateLimitMonthly}{' '}
                  certificates/month.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-5 shrink-0">
                <div className="text-left lg:text-right">
                  <div className="font-mono tabular-nums text-xl font-semibold text-[#09090B]">
                    ₹<AnimatedNumber value={calculateDisplayPrice(consultantPlan)} duration={0.4} />
                    <span className="text-xs font-sans font-normal text-[#52525B]"> / month</span>
                  </div>
                  <div className="text-xs text-[#52525B]">
                    {consultantPlan.maxUsers} seats · Unlimited client plants
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPlan(consultantPlan.id)}
                  className="px-4 py-2.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F4F5] border border-[#E4E4E7] text-xs font-semibold text-[#09090B] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer group"
                >
                  <span>{consultantPlan.ctaLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </GsapReveal>
        )}

        {/* Feature Comparison Matrix */}
        <GsapReveal y={20}>
          <div className="mt-12 rounded-xl border border-[#E4E4E7] bg-[#FFFFFF] overflow-hidden">
            <div className="px-6 py-4 bg-[#FAFAFA] border-b border-[#E4E4E7]">
              <h3 className="text-sm font-semibold text-[#09090B]">
                Capability comparison across factory tiers
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E4E4E7] text-[#52525B]">
                    <th className="py-3 px-6 font-medium">Capability</th>
                    <th className="py-3 px-6 font-medium">Starter</th>
                    <th className="py-3 px-6 font-semibold text-[#047857]">Growth</th>
                    <th className="py-3 px-6 font-medium">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F4F5] text-[#09090B]">
                  {MATRIX_ROWS.map((row) => (
                    <tr key={row.feature} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="py-3 px-6 font-medium">{row.feature}</td>
                      <td className="py-3 px-6 text-[#52525B]">{row.starter}</td>
                      <td className="py-3 px-6 font-medium text-[#047857]">{row.growth}</td>
                      <td className="py-3 px-6 text-[#09090B]">{row.enterprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </GsapReveal>

        {/* GST & SAC Notice */}
        <p className="mt-6 text-xs text-[#52525B] leading-relaxed">
          Service Accounting Code (SAC):{' '}
          <span className="font-mono tabular-nums font-semibold text-[#09090B]">
            {PRICING_CONFIG.sacCode}
          </span>{' '}
          ({PRICING_CONFIG.sacDescription}). Subject to statutory{' '}
          <span className="font-mono tabular-nums font-semibold text-[#09090B]">
            {PRICING_CONFIG.gstRatePct}%
          </span>{' '}
          Indian GST. Formal B2B tax invoices with GSTIN matching issued on checkout.
        </p>
      </div>
    </section>
  );
};
