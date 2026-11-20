import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../brand/Logo';
import { scrollToTarget } from '../effects/LenisScroller';
import { GsapReveal } from '../effects/GsapMotion';

export interface MarketingFooterProps {
  onOpenPitchModal?: () => void;
}

export const MarketingFooter: React.FC<MarketingFooterProps> = ({ onOpenPitchModal }) => {
  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    scrollToTarget(id, { offset: -72, duration: 1.15 });
  };

  return (
    <footer className="bg-[#0A0C10] border-t border-white/[0.08] text-[#A1A1AA] py-16">
      <GsapReveal y={18} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/[0.08]">
          {/* Brand Summary */}
          <div className="md:col-span-5 space-y-4">
            <Logo size="md" />
            <p className="text-xs text-[#A1A1AA] max-w-sm leading-relaxed">
              The shop-floor-to-customs compliance operating system for Indian steel, pipe, flange,
              fastener, and engineering exporters. Built for EN 10204 3.1 Mill Test Certificates, EU
              Reg 2026/1963 Melt-and-Pour traceability, and EU/UK CBAM preparation.
            </p>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#A1A1AA]">
              <span>ISO 9001:2015</span>
              <span aria-hidden="true">·</span>
              <span>EN 10204:2004 Clause 6</span>
              <span aria-hidden="true">·</span>
              <span>EU Reg 2026/1963</span>
              <span aria-hidden="true">·</span>
              <span>UK CDS 2026</span>
            </div>
          </div>

          {/* Compliance Tools */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-semibold text-[#F4F4F5]">Platform &amp; Tools</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="#simulator"
                  onClick={(e) => handleAnchor(e, 'simulator')}
                  className="hover:text-[#F4F4F5] transition-colors"
                >
                  30-Second MTC Simulator
                </a>
              </li>
              <li>
                <a
                  href="#cn-checker"
                  onClick={(e) => handleAnchor(e, 'cn-checker')}
                  className="hover:text-[#F4F4F5] transition-colors"
                >
                  CN 7304–7318 Scope Checker
                </a>
              </li>
              <li>
                <a
                  href="#clause-6"
                  onClick={(e) => handleAnchor(e, 'clause-6')}
                  className="hover:text-[#F4F4F5] transition-colors"
                >
                  Clause 6 Byte-Identical Protocol
                </a>
              </li>
              <li>
                <a
                  href="#roi-calculator"
                  onClick={(e) => handleAnchor(e, 'roi-calculator')}
                  className="hover:text-[#F4F4F5] transition-colors"
                >
                  CBAM Cost Difference Model
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  onClick={(e) => handleAnchor(e, 'pricing')}
                  className="hover:text-[#F4F4F5] transition-colors"
                >
                  Factory OS Licensing
                </a>
              </li>
            </ul>
          </div>

          {/* Access & Field Resources */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold text-[#F4F4F5]">Access</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/app" className="hover:text-[#F4F4F5] transition-colors">
                  Factory QA Console
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#F4F4F5] transition-colors">
                  Inspector Sign In
                </Link>
              </li>
              <li>
                <Link to="/verify" className="hover:text-[#F4F4F5] transition-colors">
                  Public Cryptographic Verifier
                </Link>
              </li>
              <li>
                <Link to="/design" className="hover:text-[#F4F4F5] transition-colors">
                  Design System
                </Link>
              </li>
              {onOpenPitchModal && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenPitchModal}
                    className="hover:text-[#F4F4F5] transition-colors text-left cursor-pointer"
                  >
                    Exporter Field Pitch Guide
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Regional Field Hubs */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold text-[#F4F4F5]">Field Engineering</h4>
            <div className="text-xs space-y-1.5 leading-relaxed">
              <p className="text-[#F4F4F5] font-medium">West Bengal Cluster</p>
              <p>Liluah, Belur &amp; Howrah</p>
              <p>Dankuni Engineering Zone</p>
              <p className="text-[#F4F4F5] font-medium pt-1">Upstream Corridors</p>
              <p>Jamshedpur &amp; Rourkela</p>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Mandatory Legal Notice */}
        <div className="pt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="text-[#A1A1AA]">
            © 2026 HeatLedger AI Technologies. All rights reserved.
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[#A1A1AA]">
            <span className="text-emerald-400 font-medium">
              Tamper-evident SHA-256 Annex A verification
            </span>
            <span aria-hidden="true">·</span>
            <span>EU &amp; UK CBAM preparation</span>
          </div>
        </div>

        <p className="mt-6 pt-5 border-t border-white/[0.06] text-xs text-[#A1A1AA] leading-relaxed">
          HeatLedger supports compliance preparation. It is not legal advice and not an accredited
          verification body.
        </p>
      </GsapReveal>
    </footer>
  );
};
