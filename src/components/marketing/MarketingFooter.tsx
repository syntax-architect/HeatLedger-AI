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
    scrollToTarget(id, { offset: -72, duration: 1.0 });
  };

  return (
    <footer className="bg-[#0D0E11] border-t border-[#EAEAEA]/[0.08] text-[#9FA3AD] py-16">
      <GsapReveal y={12} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#EAEAEA]/[0.08]">
          {/* Brand Summary */}
          <div className="md:col-span-5 space-y-4">
            <Logo size="md" />
            <p className="text-xs text-[#9FA3AD] max-w-sm leading-relaxed">
              Compliance preparation software for Indian steel, pipe, flange, fastener, and
              engineering exporters. Built for EN 10204 3.1 Mill Test Certificates, EU Reg 2026/1963
              Melt-and-Pour traceability, and EU or UK CBAM preparation.
            </p>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono text-[#6F7480]">
              <span>ISO 9001:2015</span>
              <span aria-hidden="true">·</span>
              <span>EN 10204:2004 Clause 6</span>
              <span aria-hidden="true">·</span>
              <span>EU Reg 2026/1963</span>
              <span aria-hidden="true">·</span>
              <span>UK CDS 2026</span>
            </div>
          </div>

          {/* Real Sections & Public Tools */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-medium text-[#EAEAEA]">Platform and tools</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="#how-it-works"
                  onClick={(e) => handleAnchor(e, 'how-it-works')}
                  className="hover:text-[#EAEAEA] transition-colors"
                >
                  Three-stage intake pipeline
                </a>
              </li>
              <li>
                <a
                  href="#sample-pack"
                  onClick={(e) => handleAnchor(e, 'sample-pack')}
                  className="hover:text-[#EAEAEA] transition-colors"
                >
                  Sample buyer customs pack
                </a>
              </li>
              <li>
                <Link to="/check" className="hover:text-[#EAEAEA] transition-colors">
                  Free public MTC evaluator
                </Link>
              </li>
              <li>
                <a
                  href="#pricing"
                  onClick={(e) => handleAnchor(e, 'pricing')}
                  className="hover:text-[#EAEAEA] transition-colors"
                >
                  Plant licensing and GST
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  onClick={(e) => handleAnchor(e, 'faq')}
                  className="hover:text-[#EAEAEA] transition-colors"
                >
                  Regulatory FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Access & Field Resources */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-medium text-[#EAEAEA]">Access</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/app" className="hover:text-[#EAEAEA] transition-colors">
                  Factory QA console
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#EAEAEA] transition-colors">
                  Inspector sign in
                </Link>
              </li>
              <li>
                <Link to="/verify" className="hover:text-[#EAEAEA] transition-colors">
                  Public tamper verifier
                </Link>
              </li>
              <li>
                <Link to="/seo/melt-and-pour-eu-steel" className="hover:text-[#EAEAEA] transition-colors">
                  EU regulatory guides
                </Link>
              </li>
              {onOpenPitchModal && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenPitchModal}
                    className="hover:text-[#EAEAEA] transition-colors text-left cursor-pointer"
                  >
                    Exporter field guide
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Regional Field Hubs */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-medium text-[#EAEAEA]">Field corridors</h4>
            <div className="text-xs space-y-1.5 leading-relaxed">
              <p className="text-[#EAEAEA]">West Bengal cluster</p>
              <p>Liluah, Belur and Howrah</p>
              <p>Dankuni engineering zone</p>
              <p className="text-[#EAEAEA] pt-1">Primary steel mills</p>
              <p>Jamshedpur and Rourkela</p>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Statutory Notice */}
        <div className="pt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="text-[#6F7480]">© 2026 HeatLedger AI Technologies</div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[#9FA3AD]">
            <span className="text-[#10B981]">Tamper-evident SHA-256 Annex A verification</span>
            <span aria-hidden="true">·</span>
            <span>EU and UK CBAM preparation</span>
          </div>
        </div>

        <p className="mt-6 pt-5 border-t border-[#EAEAEA]/[0.06] text-xs text-[#6F7480] leading-relaxed">
          HeatLedger supports compliance preparation. Prepares documents for review, not legal advice.
        </p>
      </GsapReveal>
    </footer>
  );
};
