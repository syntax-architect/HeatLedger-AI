import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Send,
  FileCheck,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { GsapReveal } from '../effects/GsapMotion';

type GateScenario = 'ready' | 'blocked';

interface GateRule {
  id: string;
  label: string;
  detail: string;
  state: 'pass' | 'warning' | 'blocked';
}

const SCENARIOS: Record<
  GateScenario,
  {
    shipmentId: string;
    destination: string;
    scoreNum: number;
    score: string;
    gateLabel: string;
    gateTone: 'pass' | 'blocked';
    rules: GateRule[];
  }
> = {
  ready: {
    shipmentId: 'EXP-2026-ROTTERDAM-04',
    destination: 'Rotterdam (NL) · 24.5 MT',
    scoreNum: 100,
    score: '100 / 100',
    gateLabel: 'Dispatch unlocked · Approved by Plant QA',
    gateTone: 'pass',
    rules: [
      {
        id: 'mp',
        label: 'Country of Melt and Pour declared',
        detail: 'India (IN) · Tata Steel Jamshedpur BOF',
        state: 'pass',
      },
      {
        id: 'chem',
        label: 'Ladle chemistry within ASTM A106 Gr. B',
        detail: '8/8 elements passed · CEV 0.408 (≤ 0.48)',
        state: 'pass',
      },
      {
        id: 'mass',
        label: 'Heat mass-balance reconciled',
        detail: '24.5 MT allocated within 40.0 MT heat #TSJ-26-9021',
        state: 'pass',
      },
      {
        id: 'sig',
        label: 'Authorised inspector digital signature',
        detail: 'Digitally Signed (Ed25519) with step-up PIN',
        state: 'pass',
      },
      {
        id: 'annex',
        label: 'Byte-identical upstream MTC attached',
        detail: 'Tamper-evident SHA-256 Annex A verified',
        state: 'pass',
      },
    ],
  },
  blocked: {
    shipmentId: 'EXP-2026-HAMBURG-11',
    destination: 'Hamburg (DE) · 32.0 MT',
    scoreNum: 54,
    score: '54 / 100',
    gateLabel: 'Release blocked · 2 blocking checks failed',
    gateTone: 'blocked',
    rules: [
      {
        id: 'mp',
        label: 'Country of Melt and Pour declared',
        detail: 'Missing primary crude steel melt facility on mill sheet',
        state: 'blocked',
      },
      {
        id: 'chem',
        label: 'Ladle chemistry within ASTM A105',
        detail: 'Manganese OCR confidence 78% — requires QA confirmation',
        state: 'warning',
      },
      {
        id: 'mass',
        label: 'Heat mass-balance reconciled',
        detail: 'Over-allocation deficit of 7.5 MT on heat #BOK-26-4910',
        state: 'blocked',
      },
      {
        id: 'sig',
        label: 'Authorised inspector digital signature',
        detail: 'Pending blocking resolution before sign-off',
        state: 'warning',
      },
      {
        id: 'annex',
        label: 'Byte-identical upstream MTC attached',
        detail: 'Original PDF uploaded · SHA-256 recorded',
        state: 'pass',
      },
    ],
  },
};

export const ReadinessGateShowcase: React.FC = () => {
  const [scenario, setScenario] = useState<GateScenario>('ready');
  const active = SCENARIOS[scenario];

  return (
    <section
      id="readiness-gate"
      className="py-20 lg:py-28 bg-[#FFFFFF] text-[#09090B] border-b border-[#E4E4E7]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Left-aligned Editorial Header */}
        <GsapReveal className="max-w-2xl mb-14">
          <div className="text-xs font-semibold text-[#047857] mb-3">
            Dispatch Release Gate · Pre-Shipment Verification
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-[#09090B] tracking-[-0.03em] leading-[1.12] [text-wrap:balance]">
            Block non-conforming containers before factory gate release
          </h2>
          <p className="mt-4 text-base text-[#52525B] leading-relaxed">
            Dispatch clerks cannot release an export lot when mandatory origin, mass-balance, or
            signature checks fail. Toggle between a cleared container and a blocked shipment below.
          </p>
        </GsapReveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: High-Contrast Authentic UI Preview Frame */}
          <GsapReveal y={24} className="lg:col-span-7">
            <div className="rounded-xl border border-[#E4E4E7] bg-[#FFFFFF] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
              {/* Animated Score Hairline */}
              <div className="h-[3px] w-full bg-[#F4F4F5] overflow-hidden">
                <motion.div
                  animate={{
                    width: `${active.scoreNum}%`,
                    backgroundColor: active.gateTone === 'pass' ? '#059669' : '#DC2626',
                  }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full"
                />
              </div>

              {/* Frame Top Bar with Scenario Switcher */}
              <div className="px-5 py-3.5 bg-[#FAFAFA] border-b border-[#E4E4E7] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-mono tabular-nums text-sm font-semibold text-[#09090B]">
                    {active.shipmentId}
                  </div>
                  <div className="text-xs text-[#52525B]">{active.destination}</div>
                </div>

                <div className="inline-flex items-center p-0.5 rounded-lg bg-[#F4F4F5] border border-[#E4E4E7]">
                  {(
                    [
                      { id: 'ready', label: 'Ready to Release' },
                      { id: 'blocked', label: 'Blocked at Gate' },
                    ] as const
                  ).map((item) => {
                    const isSelected = scenario === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setScenario(item.id)}
                        className={`relative px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                          isSelected ? 'text-[#09090B] font-semibold' : 'text-[#52525B] hover:text-[#09090B]'
                        }`}
                      >
                        {isSelected && (
                          <motion.span
                            layoutId="readiness-scenario-pill"
                            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                            className="absolute inset-0 rounded-md bg-[#FFFFFF] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                          />
                        )}
                        <span className="relative z-10">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rule Checks List */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={scenario}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="divide-y divide-[#F4F4F5]"
                >
                  {active.rules.map((rule) => {
                    const badge =
                      rule.state === 'pass'
                        ? {
                            icon: <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0 mt-0.5" />,
                            label: 'Passed',
                            cls: 'bg-[#ECFDF5] text-[#047857] border-emerald-200',
                          }
                        : rule.state === 'warning'
                          ? {
                              icon: (
                                <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                              ),
                              label: 'Warning',
                              cls: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
                            }
                          : {
                              icon: <XCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />,
                              label: 'Blocked',
                              cls: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
                            };

                    return (
                      <div
                        key={rule.id}
                        className="px-5 py-3.5 flex items-start justify-between gap-4 hover:bg-[#FAFAFA] transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {badge.icon}
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[#09090B]">{rule.label}</div>
                            <div className="text-xs text-[#52525B] mt-0.5">{rule.detail}</div>
                          </div>
                        </div>

                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-md border whitespace-nowrap shrink-0 ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>

              {/* Gate Status Footer */}
              <div className="px-5 py-3.5 bg-[#FAFAFA] border-t border-[#E4E4E7] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Lock
                    className={`w-3.5 h-3.5 ${
                      active.gateTone === 'pass' ? 'text-[#047857]' : 'text-[#DC2626]'
                    }`}
                  />
                  <span
                    className={`font-semibold ${
                      active.gateTone === 'pass' ? 'text-[#047857]' : 'text-[#B91C1C]'
                    }`}
                  >
                    {active.gateLabel}
                  </span>
                </div>
                <span className="font-mono tabular-nums font-semibold text-[#09090B]">
                  Readiness {active.score}
                </span>
              </div>
            </div>
          </GsapReveal>

          {/* Right: Supplier Precursor Collaboration Column */}
          <GsapReveal y={24} delay={0.1} className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div>
              <div className="text-xs font-semibold text-[#B45309] mb-2">
                Upstream Supplier Intake
              </div>
              <h3 className="text-2xl font-semibold text-[#09090B] tracking-[-0.025em] leading-snug">
                Collect precursor emissions without chasing PDFs by phone
              </h3>
              <p className="mt-3 text-sm text-[#52525B] leading-relaxed">
                When a shipment is missing sub-tier mill fuel or route disclosures, HeatLedger
                issues a scoped, no-login intake link so primary mills and rerollers submit
                documents straight from mobile.
              </p>
            </div>

            <div className="rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] divide-y divide-[#E4E4E7]">
              <div className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] flex items-center justify-center text-[#09090B] shrink-0 mt-0.5">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#09090B]">
                    WhatsApp &amp; dedicated plant email intake
                  </h4>
                  <p className="text-xs text-[#52525B] mt-1 leading-relaxed">
                    Suppliers forward mill 3.1 PDFs or high-resolution sheet photos directly into
                    your plant intake queue without creating an account.
                  </p>
                </div>
              </div>

              <div className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] flex items-center justify-center text-[#047857] shrink-0 mt-0.5">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#09090B]">
                    Automatic precursor heat linkage
                  </h4>
                  <p className="text-xs text-[#52525B] mt-1 leading-relaxed">
                    Once approved by QA, supplier emissions disclosures attach directly to matching
                    heat records and recalculate container CBAM SEE automatically.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#E4E4E7] bg-[#FFFFFF] hover:border-[#059669]/40 transition-colors flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-[#52525B]">
                Test live readiness gates with sample heats
              </span>
              <Link
                to="/app?view=command-center"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#047857] hover:text-[#065F46] whitespace-nowrap shrink-0 transition-colors group"
              >
                <span>Open QA Console</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </GsapReveal>
        </div>
      </div>
    </section>
  );
};
