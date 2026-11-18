import React from 'react';
import { Logo } from '../brand/Logo';
import { ShieldCheck, Scale, FileText, CheckCircle2 } from 'lucide-react';

export const MarketingFooter: React.FC = () => {
  return (
    <footer className="bg-obsidian-deep border-t border-slate-tempered text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Logo size="md" />
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              The shop-floor-to-customs compliance operating system for Indian steel, pipe, flange, fastener, and engineering exporters.
              Automating EN 10204 3.1 Mill Test Certificates, EU Reg 2026/1963 Melt-and-Pour proof, and EU/UK CBAM emissions defense.
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] font-mono text-emerald-400">
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">ISO 9001:2015</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">EN 10204:2004 Clause 6</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">EU Reg 2026/1963</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">UK CDS Notice 2026</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold font-mono uppercase text-slate-200 tracking-wider">
              Compliance Tools
            </h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#simulator" className="hover:text-emerald-400 transition-colors">30-Second MTC Simulator</a></li>
              <li><a href="#cn-checker" className="hover:text-emerald-400 transition-colors">CN 7304 - 7318 Scope Checker</a></li>
              <li><a href="#clause-6" className="hover:text-emerald-400 transition-colors">Clause 6 Zero-Forgery Architecture</a></li>
              <li><a href="#roi-calculator" className="hover:text-emerald-400 transition-colors">CBAM Euro Tax Savings Calculator</a></li>
              <li><a href="#pricing" className="hover:text-emerald-400 transition-colors">Factory OS Pricing</a></li>
            </ul>
          </div>

          {/* Industrial Exporter Hubs */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold font-mono uppercase text-slate-200 tracking-wider">
              Regional Field Engineering
            </h4>
            <div className="text-xs space-y-1.5 text-slate-400">
              <p className="font-semibold text-slate-300">West Bengal Metallurgy Cluster:</p>
              <p>Liluah, Belur &amp; Howrah Industrial Area</p>
              <p>Dankuni Heavy Engineering Zone</p>
              <p className="font-semibold text-slate-300 pt-1">Jharkhand &amp; Odisha:</p>
              <p>Jamshedpur &amp; Rourkela Upstream Mills</p>
            </div>
          </div>

        </div>

        {/* Legal Regulatory Bottom Bar */}
        <div className="pt-8 border-t border-slate-tempered/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-slate-500">
          <div>
            © 2026 HeatLedger AI Technologies. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Cryptographic Tamper-Proof Annex A Guarantee</span>
            </span>
            <span>•</span>
            <span className="text-slate-400">Definitive EU CBAM Compliance</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
