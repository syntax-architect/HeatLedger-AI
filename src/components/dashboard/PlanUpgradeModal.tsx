import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  ShieldCheck,
  Check,
  ArrowRight,
  Layers,
  AlertCircle,
  Building,
  CreditCard,
} from 'lucide-react';
import { PRICING_CONFIG, PricingPlan, trackPricingEvent } from '../../config/pricing';

export interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanId?: string;
  usageStats?: {
    certificatesUsed: number;
    certificateLimit: number;
    plantsUsed: number;
    plantLimit: number;
    seatsUsed: number;
    seatLimit: number;
  };
  onSuccess?: () => void;
}

export const PlanUpgradeModal: React.FC<PlanUpgradeModalProps> = ({
  isOpen,
  onClose,
  currentPlanId = 'PLANT',
  usageStats = {
    certificatesUsed: 94,
    certificateLimit: 150,
    plantsUsed: 1,
    plantLimit: 1,
    seatsUsed: 2,
    seatLimit: 3,
  },
  onSuccess,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('PLANT_PRO');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [upgradeError, setUpgradeError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      trackPricingEvent('view_pricing', currentPlanId, { mode: 'in_app_upgrade_modal' });
    }
  }, [isOpen, currentPlanId]);

  if (!isOpen) return null;

  const currentPlan =
    PRICING_CONFIG.plans.find((p) => p.id === currentPlanId) || PRICING_CONFIG.plans[1];
  const targetPlan =
    PRICING_CONFIG.plans.find((p) => p.id === selectedPlanId) || PRICING_CONFIG.plans[2];

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setUpgradeError('');
    const found = PRICING_CONFIG.coupons.find(
      (c) => c.code.toUpperCase() === couponCode.trim().toUpperCase()
    );
    if (found) {
      setAppliedDiscount(found.discountPct);
      setCouponMessage(`Applied ${found.code}: ${found.discountPct}% Discount`);
    } else {
      setAppliedDiscount(0);
      setCouponMessage('Invalid coupon code. Try EEPC_INDIA_20 or HOWRAH_MSME.');
    }
  };

  const calculateTargetPrice = () => {
    const raw =
      billingCycle === 'annual'
        ? targetPlan.priceAnnualInr / 12
        : targetPlan.priceMonthlyInr;
    if (!appliedDiscount) return Math.round(raw);
    return Math.round(raw * (1 - appliedDiscount / 100));
  };

  const handleInitiateUpgrade = async () => {
    setIsProcessing(true);
    setUpgradeError('');
    trackPricingEvent('start_checkout', targetPlan.id, {
      billingCycle,
      appliedDiscount,
      source: 'in_app_modal',
    });

    try {
      const response = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: targetPlan.id,
          billing_cycle: billingCycle.toUpperCase(),
          coupon_code: couponCode.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Upgrade request failed. Please try again.');
      }

      trackPricingEvent('select_plan', targetPlan.id, { status: 'success' });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      trackPricingEvent('checkout_dropoff', targetPlan.id, { error: err.message });
      setUpgradeError(err.message || 'Payment processing error');
    } finally {
      setIsProcessing(false);
    }
  };

  const certUsagePct = Math.min(
    100,
    Math.round((usageStats.certificatesUsed / (usageStats.certificateLimit || 1)) * 100)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0E11]/70 backdrop-blur-sm">
      <div className="bg-[#FCFBF8] rounded-xl max-w-2xl w-full border border-[#18181A]/15 p-6 sm:p-8 space-y-6 text-xs text-[#18181A] max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#18181A]/10">
          <div className="flex items-center gap-2 text-[#047857] font-medium text-sm">
            <Zap className="w-4 h-4" strokeWidth={1.5} />
            <span>Upgrade Plant Quota &amp; Features</span>
          </div>
          <button
            onClick={() => {
              trackPricingEvent('checkout_dropoff', selectedPlanId, { reason: 'user_closed_modal' });
              onClose();
            }}
            className="h-8 w-8 rounded-lg text-[#55544E] hover:text-[#18181A] hover:bg-[#EFECE5] flex items-center justify-center transition-colors"
            aria-label="Close upgrade modal"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Current Plan Usage Bar */}
        <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#18181A]/10 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#78766E] block">Active Plan</span>
              <span className="font-medium text-sm text-[#18181A]">
                {currentPlan.name}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#78766E] block">Certificate Quota</span>
              <span className="font-mono font-medium text-[#18181A]">
                {usageStats.certificatesUsed} / {usageStats.certificateLimit} used
              </span>
            </div>
          </div>

          <div className="w-full bg-[#EFECE5] h-2 rounded-sm overflow-hidden">
            <div
              className={`h-full transition-colors duration-300 ${
                certUsagePct > 90
                  ? 'bg-rose-700'
                  : certUsagePct > 70
                  ? 'bg-amber-600'
                  : 'bg-[#059669]'
              }`}
              style={{ width: `${certUsagePct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#55544E]">
            <span>Plants: {usageStats.plantsUsed} / {usageStats.plantLimit}</span>
            <span>Seats: {usageStats.seatsUsed} / {usageStats.seatLimit}</span>
          </div>
        </div>

        {/* Plan Upgrade Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[#18181A]">
              Select Target Tier
            </span>
            {/* Annual / Monthly Toggle */}
            <div className="inline-flex items-center p-1 rounded-lg bg-[#EFECE5] border border-[#18181A]/10 text-[11px]">
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`h-7 px-2.5 rounded-md font-medium transition-colors ${
                  billingCycle === 'annual'
                    ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                    : 'text-[#55544E] hover:text-[#18181A]'
                }`}
              >
                Annual (2 Mos Free)
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`h-7 px-2.5 rounded-md font-medium transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-[#FCFBF8] text-[#18181A] border border-[#18181A]/10'
                    : 'text-[#55544E] hover:text-[#18181A]'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRICING_CONFIG.plans
              .filter((p) => p.tier === 'plant_pro' || p.tier === 'consultant')
              .map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const price =
                  billingCycle === 'annual'
                    ? Math.round(plan.priceAnnualInr / 12)
                    : plan.priceMonthlyInr;

                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-[#059669] bg-[#059669]/10'
                        : 'border-[#18181A]/10 hover:border-[#18181A]/25 bg-[#F7F5F0]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-[#18181A]">
                        {plan.name}
                      </span>
                      {plan.badge && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#059669]/10 text-[#047857] border border-[#059669]/20">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#55544E] mb-3 min-h-[32px]">
                      {plan.description}
                    </p>
                    <div className="font-mono font-medium text-base text-[#18181A]">
                      ₹{price.toLocaleString('en-IN')}{' '}
                      <span className="text-[11px] font-sans font-normal text-[#78766E]">/ mo</span>
                    </div>
                    <div className="mt-2 text-[11px] text-[#55544E] flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.5} />
                      <span>{plan.certificateLimitMonthly} MTCs/mo · {plan.maxPlants} Plants · {plan.maxUsers} Seats</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Coupon Form */}
        <form onSubmit={handleApplyCoupon} className="flex items-center gap-2 pt-2">
          <input
            type="text"
            placeholder="Coupon / Cluster Code (e.g. EEPC_INDIA_20)"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            className="flex-1 h-9 px-3 rounded-lg bg-[#F7F5F0] border border-[#18181A]/15 font-mono text-xs text-[#18181A] focus:outline-none focus:border-[#059669]"
          />
          <button
            type="submit"
            className="h-9 px-4 rounded-lg bg-[#EFECE5] hover:bg-[#18181A]/10 border border-[#18181A]/15 font-medium text-[#18181A] transition-colors"
          >
            Apply
          </button>
        </form>
        {couponMessage && (
          <p
            className={`text-[11px] ${
              appliedDiscount > 0 ? 'text-[#047857]' : 'text-rose-700'
            }`}
          >
            {couponMessage}
          </p>
        )}

        {/* GST & Total Breakdown */}
        <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#18181A]/10 space-y-1.5 text-xs">
          <div className="flex justify-between text-[#55544E]">
            <span>Base Subscription ({billingCycle})</span>
            <span className="font-mono text-[#18181A]">₹{calculateTargetPrice().toLocaleString('en-IN')}/mo</span>
          </div>
          <div className="flex justify-between text-[#78766E] text-[11px]">
            <span>Statutory Indian GST (18% SAC 998313)</span>
            <span className="font-mono">
              + ₹{Math.round(calculateTargetPrice() * 0.18).toLocaleString('en-IN')}/mo
            </span>
          </div>
          <div className="pt-2 border-t border-[#18181A]/10 flex justify-between font-medium text-sm text-[#18181A]">
            <span>Total Effective</span>
            <span className="font-mono text-[#047857]">
              ₹{Math.round(calculateTargetPrice() * 1.18).toLocaleString('en-IN')}/mo
            </span>
          </div>
        </div>

        {upgradeError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span>{upgradeError}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          disabled={isProcessing}
          onClick={handleInitiateUpgrade}
          className="w-full h-10 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FCFBF8] font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {isProcessing ? (
            <span>Connecting to Payment Gateway...</span>
          ) : (
            <>
              <CreditCard className="w-4 h-4" strokeWidth={1.5} />
              <span>Confirm &amp; Upgrade to {targetPlan.name}</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </>
          )}
        </button>

        <p className="text-[11px] text-center text-[#78766E]">
          * {PRICING_CONFIG.note} Indian GST compliant tax invoice issued on capture.
        </p>
      </div>
    </div>
  );
};
