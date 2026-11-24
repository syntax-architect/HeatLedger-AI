/**
 * HEATLEDGER AI: Unified Pricing & Plan Configuration (Prompt L2)
 *
 * NOTE: Prices and limits are commercial hypotheses subject to validation with initial exporter cohorts until customers pay.
 *
 * Statutory Service Accounting Code (SAC): 998313 (IT Software Services)
 * Statutory Indian GST: 18.0% (CGST 9% + SGST 9% or IGST 18%)
 */

import plansData from '../../data/plans.json';

export interface PricingPlan {
  id: string;
  name: string;
  tier: 'pilot' | 'plant' | 'plant_pro' | 'consultant' | 'addon';
  badge?: string;
  priceMonthlyInr: number;
  priceAnnualInr: number;
  priceOneTimeInr?: number;
  isOneTime?: boolean;
  certificateLimitMonthly: number | 'Unlimited';
  maxPlants: number | 'Unlimited';
  maxUsers: number | 'Unlimited';
  description: string;
  features: string[];
  ctaLabel: string;
  highlighted?: boolean;
}

export interface CouponCode {
  code: string;
  discountPct: number;
  description: string;
}

export interface PricingFaqItem {
  question: string;
  answer: string;
}

export interface PricingMatrixRow {
  capability: string;
  category: 'core' | 'traceability' | 'cbam' | 'workflow';
  pilot: string;
  plant: string;
  plantPro: string;
  consultant: string;
}

// Hypotheses note to comply with Prompt L2
export const PRICING_HYPOTHESIS_NOTE =
  'Prices and limits are commercial hypotheses subject to validation with initial exporter cohorts until customers pay.';

const canonicalPlans = plansData.plans;

export const PRICING_CONFIG = {
  sacCode: plansData.sac_code,
  sacDescription: plansData.sac_description,
  gstRatePct: plansData.gst_rate_percent,
  currency: plansData.currency,
  note: plansData.note,

  plans: [
    {
      id: 'PILOT',
      name: canonicalPlans.PILOT.name,
      tier: 'pilot',
      isOneTime: true,
      priceOneTimeInr: canonicalPlans.PILOT.price_inr,
      priceMonthlyInr: canonicalPlans.PILOT.price_monthly_inr,
      priceAnnualInr: canonicalPlans.PILOT.price_annual_inr,
      certificateLimitMonthly: canonicalPlans.PILOT.certificate_limit_monthly,
      maxPlants: canonicalPlans.PILOT.max_plants,
      maxUsers: canonicalPlans.PILOT.max_users,
      description: canonicalPlans.PILOT.description,
      features: canonicalPlans.PILOT.features,
      ctaLabel: canonicalPlans.PILOT.cta_label,
      highlighted: canonicalPlans.PILOT.highlighted,
    },
    {
      id: 'PLANT',
      name: canonicalPlans.PLANT.name,
      tier: 'plant',
      priceMonthlyInr: canonicalPlans.PLANT.price_monthly_inr,
      priceAnnualInr: canonicalPlans.PLANT.price_annual_inr,
      certificateLimitMonthly: canonicalPlans.PLANT.certificate_limit_monthly,
      maxPlants: canonicalPlans.PLANT.max_plants,
      maxUsers: canonicalPlans.PLANT.max_users,
      description: canonicalPlans.PLANT.description,
      features: canonicalPlans.PLANT.features,
      ctaLabel: canonicalPlans.PLANT.cta_label,
      highlighted: canonicalPlans.PLANT.highlighted,
    },
    {
      id: 'PLANT_PRO',
      name: canonicalPlans.PLANT_PRO.name,
      tier: 'plant_pro',
      badge: 'RECOMMENDED',
      priceMonthlyInr: canonicalPlans.PLANT_PRO.price_monthly_inr,
      priceAnnualInr: canonicalPlans.PLANT_PRO.price_annual_inr,
      certificateLimitMonthly: canonicalPlans.PLANT_PRO.certificate_limit_monthly,
      maxPlants: canonicalPlans.PLANT_PRO.max_plants,
      maxUsers: canonicalPlans.PLANT_PRO.max_users,
      description: canonicalPlans.PLANT_PRO.description,
      features: canonicalPlans.PLANT_PRO.features,
      ctaLabel: canonicalPlans.PLANT_PRO.cta_label,
      highlighted: true,
    },
    {
      id: 'CONSULTANT',
      name: canonicalPlans.CONSULTANT.name,
      tier: 'consultant',
      badge: 'FOR CA & BROKERS',
      priceMonthlyInr: canonicalPlans.CONSULTANT.price_monthly_inr,
      priceAnnualInr: canonicalPlans.CONSULTANT.price_annual_inr,
      certificateLimitMonthly: canonicalPlans.CONSULTANT.certificate_limit_monthly,
      maxPlants: canonicalPlans.CONSULTANT.max_plants,
      maxUsers: canonicalPlans.CONSULTANT.max_users,
      description: canonicalPlans.CONSULTANT.description,
      features: canonicalPlans.CONSULTANT.features,
      ctaLabel: canonicalPlans.CONSULTANT.cta_label,
      highlighted: false,
    },
  ] as PricingPlan[],

  coupons: [
    { code: 'EEPC_INDIA_20', discountPct: 20, description: 'EEPC India Member Cluster Incentive (20% Off)' },
    { code: 'EEPC20', discountPct: 20, description: 'EEPC India Member Cluster Incentive (20% Off)' },
    { code: 'HOWRAH_MSME', discountPct: 25, description: 'Howrah Foundry & Forging Cluster Initiative (25% Off)' },
    { code: 'HOWRAH25', discountPct: 25, description: 'Howrah Foundry & Forging Cluster Initiative (25% Off)' },
    { code: 'PILOT100', discountPct: 100, description: 'Full Pilot Audit Credit voucher against subscription' },
  ] as CouponCode[],

  matrixRows: [
    {
      capability: 'MTC Vector Extraction (OCR + Validation)',
      category: 'core',
      pilot: '50 certs',
      plant: '100 / mo',
      plantPro: '300 / mo',
      consultant: '500+ / mo',
    },
    {
      capability: 'Shipment Readiness Score & Gate',
      category: 'core',
      pilot: '1 shipment',
      plant: 'Included',
      plantPro: 'Included',
      consultant: 'Included',
    },
    {
      capability: 'Anti-Phantom Mass-Balance Ledger',
      category: 'traceability',
      pilot: 'Basic',
      plant: 'Included',
      plantPro: 'Included',
      consultant: 'Included',
    },
    {
      capability: 'Ed25519 Cryptographic Digital Signing',
      category: 'traceability',
      pilot: 'Draft watermark',
      plant: 'Included',
      plantPro: 'Included',
      consultant: 'Included + white-label',
    },
    {
      capability: 'CBAM SEE Carbon Trace & XML Dossier',
      category: 'cbam',
      pilot: 'Exposure estimate',
      plant: 'CBAM data sheet',
      plantPro: 'Full trace & XML export',
      consultant: 'Full trace & batch export',
    },
    {
      capability: 'Automated WhatsApp & Email Supplier Intake',
      category: 'workflow',
      pilot: '—',
      plant: 'PWA camera capture',
      plantPro: 'Automated intake + alerts',
      consultant: 'Automated intake + portal',
    },
    {
      capability: 'Supplier Precursor Emissions Request Portal',
      category: 'cbam',
      pilot: '—',
      plant: '—',
      plantPro: 'Included',
      consultant: 'Included',
    },
    {
      capability: 'Regulatory Deadline Radar & Monthly ROI Reports',
      category: 'workflow',
      pilot: '1-page audit',
      plant: 'Quarterly view',
      plantPro: 'Monthly ROI + live radar',
      consultant: 'Executive report across clients',
    },
    {
      capability: 'Multi-Client Organization Switcher & White-Labeling',
      category: 'workflow',
      pilot: '—',
      plant: '—',
      plantPro: '—',
      consultant: 'Included',
    },
  ] as PricingMatrixRow[],

  faqs: [
    {
      question: 'What is included in the ₹25,000 Pilot Audit, and how does the credit work?',
      answer:
        'In the Pilot Audit, our compliance team reviews one real past shipment from your plant (up to 50 mill test certificates) end-to-end. We run chemistry validation, melt-and-pour verification, and CBAM default penalty exposure analysis, delivering a one-page findings report. If you subscribe to Plant or Plant Pro, the entire ₹25,000 fee is credited against your first 3 months.',
    },
    {
      question: 'What is strictly NOT included in HeatLedger AI subscriptions?',
      answer:
        'HeatLedger AI is specialized document preparation and verification software. It strictly DOES NOT provide statutory legal advice, does not perform physical laboratory tensile or spectrometry destructive testing, and does not provide an unconditional guarantee of customs release at EU borders. Final release sign-off remains the statutory legal responsibility of the exporter’s authorized inspector (EN 10204 Clause 3.1).',
    },
    {
      question: 'What happens if our plant exceeds the monthly certificate limit?',
      answer:
        'We never block your dispatch at the factory gate unexpectedly. When you reach 100% of your quota, you receive an in-app notice and an email alert. You can seamlessly add a single container check pack (₹2,499 for 5 certs) or upgrade to Plant Pro with one click, prorated immediately.',
    },
    {
      question: 'Are prices and plan limits fixed or negotiable?',
      answer:
        'Prices and limits are commercial hypotheses subject to validation with initial exporter cohorts until customers pay. We actively support regional cluster incentives (such as the EEPC India 20% subsidy and Howrah Foundry Cluster 25% discount). Contact our team for multi-foundry cluster licensing.',
    },
    {
      question: 'How are taxes and GST invoices handled?',
      answer:
        'All prices are in Indian Rupees (INR) and subject to statutory 18.0% Indian GST under Service Accounting Code (SAC) 998313 (IT Software Services). Formal B2B tax invoices with GSTIN verification (CGST + SGST for West Bengal, IGST for other states) are automatically generated and downloadable instantly upon payment.',
    },
  ] as PricingFaqItem[],
};

/**
 * Privacy-Friendly Analytics Click & Drop-Off Tracker (Prompt L2)
 * Dispatches non-PII events to telemetry endpoint without blocking UX.
 */
export function trackPricingEvent(
  eventType: 'view_pricing' | 'toggle_billing_cycle' | 'select_plan' | 'start_checkout' | 'checkout_dropoff',
  planId?: string,
  metadata?: Record<string, any>
) {
  try {
    const payload = {
      event: eventType,
      plan_id: planId || null,
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
    };
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/telemetry/pricing-event',
        new Blob([JSON.stringify(payload)], { type: 'application/json' })
      );
    } else {
      fetch('/api/telemetry/pricing-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Fail silently to ensure user experience is never degraded
  }
}
