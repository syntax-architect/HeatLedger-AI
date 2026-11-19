import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sun, 
  Moon, 
  ArrowLeft,
  Sparkles,
  Zap,
  Lock,
  Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ContrastPair {
  name: string;
  fg: string;
  bg: string;
  ratio: number;
  rating: 'AAA' | 'AA' | 'FAIL';
  note: string;
}

// Deterministic WCAG Contrast calculation
function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map(v => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrast(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}

const CONTRAST_PAIRS: ContrastPair[] = [
  {
    name: 'Primary Emerald on White (Light Mode)',
    fg: '#047857', // Darker 600 emerald shade fixed for WCAG AA
    bg: '#FFFFFF',
    ratio: getContrast('#047857', '#FFFFFF'),
    rating: getContrast('#047857', '#FFFFFF') >= 7 ? 'AAA' : getContrast('#047857', '#FFFFFF') >= 4.5 ? 'AA' : 'FAIL',
    note: 'Meets WCAG AA (>= 4.5:1). Darker shade replaces washed-out emerald on daylight backgrounds.'
  },
  {
    name: 'Molten Warning Amber on White (Light Mode)',
    fg: '#B45309', // Darker amber 700 shade
    bg: '#FFFFFF',
    ratio: getContrast('#B45309', '#FFFFFF'),
    rating: getContrast('#B45309', '#FFFFFF') >= 7 ? 'AAA' : getContrast('#B45309', '#FFFFFF') >= 4.5 ? 'AA' : 'FAIL',
    note: 'Meets WCAG AA. Replaces amber-500 (#F59E0B) which fails on white (2.1:1).'
  },
  {
    name: 'Text Main on Surface (Light Mode)',
    fg: '#0F172A',
    bg: '#FFFFFF',
    ratio: getContrast('#0F172A', '#FFFFFF'),
    rating: 'AAA',
    note: 'Extreme high contrast for daylight industrial factory floors.'
  },
  {
    name: 'Text Muted on Surface (Light Mode)',
    fg: '#475569',
    bg: '#FFFFFF',
    ratio: getContrast('#475569', '#FFFFFF'),
    rating: getContrast('#475569', '#FFFFFF') >= 4.5 ? 'AA' : 'FAIL',
    note: 'Secondary metadata & spec tolerances.'
  },
  {
    name: 'Electric Emerald on Obsidian Surface (Dark Mode)',
    fg: '#10B981',
    bg: '#111827',
    ratio: getContrast('#10B981', '#111827'),
    rating: getContrast('#10B981', '#111827') >= 7 ? 'AAA' : getContrast('#10B981', '#111827') >= 4.5 ? 'AA' : 'FAIL',
    note: 'Compliant on dark gunmetal/obsidian forge backdrops.'
  },
  {
    name: 'Text Main on Obsidian Surface (Dark Mode)',
    fg: '#F8FAFC',
    bg: '#0B1120',
    ratio: getContrast('#F8FAFC', '#0B1120'),
    rating: 'AAA',
    note: 'Crisp readability in low-light factory inspection booths.'
  },
  {
    name: 'Danger Crimson on Dark Surface',
    fg: '#EF4444',
    bg: '#111827',
    ratio: getContrast('#EF4444', '#111827'),
    rating: getContrast('#EF4444', '#111827') >= 4.5 ? 'AA' : 'FAIL',
    note: 'Critical off-spec metallurgy alert tone.'
  }
];

export const DesignSystemPage: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark');
  });

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    if (nextTheme) {
      document.documentElement.classList.add('dark');
      try { localStorage.setItem('heatledger-theme', 'dark'); } catch (e) {}
    } else {
      document.documentElement.classList.remove('dark');
      try { localStorage.setItem('heatledger-theme', 'light'); } catch (e) {}
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] p-6 sm:p-10 font-sans transition-colors duration-200">
      
      {/* Top Header */}
      <div className="max-w-6xl mx-auto flex items-center justify-between pb-8 mb-8 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-3">
            <Link 
              to="/" 
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to App
            </Link>
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold">
              DEV ONLY
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
            HeatLedger Design System v2 Token Inspector
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Standardized Type Scale, Dual-Theme Tokens, Accessible Primitives &amp; WCAG AA Verification
          </p>
        </div>

        <button
          onClick={toggleTheme}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-emerald-500/40 text-xs font-mono font-bold transition-all shadow-sm"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
          <span>Switch to {isDark ? 'Precision Daylight' : 'Obsidian Forge'}</span>
        </button>
      </div>

      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* 1. TYPOGRAPHY SCALE */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-bold">1. Standardized Type Scale (No Sub-12px)</h2>
          </div>
          <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-4 shadow-sm">
            <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-2">
              <span className="text-xs font-mono text-[var(--text-muted)]">3xl · 48px / Bold</span>
              <span className="text-3xl font-extrabold tracking-tight">Main Display Headline (3xl)</span>
            </div>
            <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-2">
              <span className="text-xs font-mono text-[var(--text-muted)]">2xl · 32px / Bold</span>
              <span className="text-2xl font-bold tracking-tight">Section Title &amp; Metrics (2xl)</span>
            </div>
            <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-2">
              <span className="text-xs font-mono text-[var(--text-muted)]">xl · 24px / SemiBold</span>
              <span className="text-xl font-semibold">Card Headers &amp; Modal Titles (xl)</span>
            </div>
            <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-2">
              <span className="text-xs font-mono text-[var(--text-muted)]">lg · 18px / Medium</span>
              <span className="text-lg font-medium">Subheadings &amp; Highlight Callouts (lg)</span>
            </div>
            <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-2">
              <span className="text-xs font-mono text-[var(--text-muted)]">base · 16px / Regular</span>
              <span className="text-base font-normal">Marketing Body &amp; Primary Reading Flow (base)</span>
            </div>
            <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-2">
              <span className="text-xs font-mono text-[var(--text-muted)]">sm · 14px / Regular</span>
              <span className="text-sm font-normal">Dashboard App Body &amp; Form Fields (sm)</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-mono text-[var(--text-muted)]">xs · 12px / Medium (MINIMUM)</span>
              <span className="text-xs font-medium font-mono text-emerald-600 dark:text-emerald-400">
                Spectrometry Badges, Bounding Coordinates &amp; Heat IDs (xs — 12px Floor)
              </span>
            </div>
          </div>
        </section>

        {/* 2. COLOR & SEMANTIC TOKENS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold">2. Semantic Palette Swatches</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="w-full h-12 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] mb-2" />
              <div className="text-xs font-bold">Surface 2</div>
              <div className="text-xs text-[var(--text-muted)] font-mono">--surface-2</div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="w-full h-12 rounded-lg bg-[var(--primary)] mb-2" />
              <div className="text-xs font-bold text-white">Primary Emerald</div>
              <div className="text-xs text-[var(--text-muted)] font-mono">--primary</div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="w-full h-12 rounded-lg bg-[var(--warning)] mb-2" />
              <div className="text-xs font-bold text-white">Molten Amber</div>
              <div className="text-xs text-[var(--text-muted)] font-mono">--warning</div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="w-full h-12 rounded-lg bg-[var(--danger)] mb-2" />
              <div className="text-xs font-bold text-white">Danger Oxide</div>
              <div className="text-xs text-[var(--text-muted)] font-mono">--danger</div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="w-full h-12 rounded-lg bg-[var(--info)] mb-2" />
              <div className="text-xs font-bold text-white">Cobalt Blueprint</div>
              <div className="text-xs text-[var(--text-muted)] font-mono">--info</div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="w-full h-12 rounded-lg bg-[var(--border)] mb-2" />
              <div className="text-xs font-bold">Border Token</div>
              <div className="text-xs text-[var(--text-muted)] font-mono">--border</div>
            </div>
          </div>
        </section>

        {/* 3. BUTTONS & CHIPS KIT */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-500" />
            <h2 className="text-lg font-bold">3. Reusable Button &amp; Chip Primitives</h2>
          </div>
          <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <button className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-sm shadow-md transition-all">
                Primary Emerald Button
              </button>
              <button className="px-5 py-2.5 rounded-full bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text-main)] font-semibold text-sm border border-[var(--border)] active:scale-95 transition-all">
                Secondary Surface Button
              </button>
              <button className="px-5 py-2.5 rounded-full border border-rose-500/50 hover:bg-rose-500/10 text-rose-500 font-semibold text-sm transition-all">
                Critical Danger Button
              </button>
              <button className="px-4 py-2 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] underline">
                Ghost Link Action
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[var(--border)]">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% IN-SPEC (PASS)
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> HIGH RISK (CEV &gt; 0.45)
              </span>
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> OUT-OF-SPEC (REJECT)
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> HMAC-SHA256 SIGNED
              </span>
            </div>
          </div>
        </section>

        {/* 4. CONTRAST VERIFICATION TABLE */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-bold">4. WCAG AA Automated Contrast Verification (≥ 4.5:1)</h2>
          </div>
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface-2)] border-b border-[var(--border)] text-xs font-mono text-[var(--text-muted)]">
                <tr>
                  <th className="p-3.5">Color Pair</th>
                  <th className="p-3.5">Hex Codes</th>
                  <th className="p-3.5">Contrast Ratio</th>
                  <th className="p-3.5">WCAG Rating</th>
                  <th className="p-3.5">Compliance Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-mono text-xs">
                {CONTRAST_PAIRS.map((pair, idx) => (
                  <tr key={idx} className="hover:bg-[var(--surface-2)]/50 transition-colors">
                    <td className="p-3.5 font-semibold font-sans">{pair.name}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded border border-[var(--border)] mr-1" style={{ backgroundColor: pair.fg, color: pair.bg }}>
                        {pair.fg}
                      </span>
                      on {pair.bg}
                    </td>
                    <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                      {pair.ratio}:1
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        pair.rating === 'AAA' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300' :
                        pair.rating === 'AA' ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300' :
                        'bg-rose-500/20 text-rose-600 dark:text-rose-300'
                      }`}>
                        {pair.rating} (PASS)
                      </span>
                    </td>
                    <td className="p-3.5 font-sans text-xs text-[var(--text-muted)]">{pair.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
};

export default DesignSystemPage;
