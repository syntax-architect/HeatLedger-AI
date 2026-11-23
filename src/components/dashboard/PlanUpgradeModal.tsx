import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  ShieldCheck,
  Check,
  ArrowRight,
  Sparkles,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 text-xs text-slate-800 dark:text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            <Zap className="w-5 h-5" />
            <span>Upgrade Plant Quota &amp; Features</span>
          </div>
          <button
            onClick={() => {
              trackPricingEvent('checkout_dropoff', selectedPlanId, { reason: 'user_closed_modal' });
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Plan Usage Bar */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 block">Active Plan</span>
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {currentPlan.name}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">Certificate Quota</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {usageStats.certificatesUsed} / {usageStats.certificateLimit} used
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                certUsagePct > 90
                  ? 'bg-red-500'
                  : certUsagePct > 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${certUsagePct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Plants: {usageStats.plantsUsed} / {usageStats.plantLimit}</span>
            <span>Seats: {usageStats.seatsUsed} / {usageStats.seatLimit}</span>
          </div>
        </div>

        {/* Plan Upgrade Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              Select Target Tier
            </span>
            {/* Annual / Monthly Toggle */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px]">
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  billingCycle === 'annual'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Annual (2 Mos Free)
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
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
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {plan.name}
                      </span>
                      {plan.badge && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-3 min-h-[32px]">
                      {plan.description}
                    </p>
                    <div className="font-mono font-bold text-base text-slate-900 dark:text-slate-100">
                      ₹{price.toLocaleString('en-IN')}{' '}
                      <span className="text-[11px] font-normal text-slate-500">/ mo</span>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
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
            className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 font-semibold"
          >
            Apply
          </button>
        </form>
        {couponMessage && (
          <p
            className={`text-[11px] ${
              appliedDiscount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
            }`}
          >
            {couponMessage}
          </p>
        )}

        {/* GST & Total Breakdown */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Base Subscription ({billingCycle})</span>
            <span className="font-mono">₹{calculateTargetPrice().toLocaleString('en-IN')}/mo</span>
          </div>
          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>Statutory Indian GST (18% SAC 998313)</span>
            <span className="font-mono">
              + ₹{Math.round(calculateTargetPrice() * 0.18).toLocaleString('en-IN')}/mo
            </span>
          </div>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-sm text-slate-900 dark:text-slate-100">
            <span>Total Effective</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">
              ₹{Math.round(calculateTargetPrice() * 1.18).toLocaleString('en-IN')}/mo
            </span>
          </div>
        </div>

        {upgradeError && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{upgradeError}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          disabled={isProcessing}
          onClick={handleInitiateUpgrade}
          className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {isProcessing ? (
            <span>Connecting to Payment Gateway...</span>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              <span>Confirm &amp; Upgrade to {targetPlan.name}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
          * {PRICING_CONFIG.note} Indian GST compliant tax invoice issued on capture.
        </p>
      </div>
    </div>
  );
};
