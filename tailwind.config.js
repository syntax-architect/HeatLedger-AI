/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic Tokens (CSS Variables mapped to Swiss Industrial Light & Deep Carbon Dark palettes)
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'app-border': 'var(--border)',
        text: 'var(--text-main)',
        'app-text': 'var(--text-main)',
        'text-muted': 'var(--text-muted)',
        'app-text-muted': 'var(--text-muted)',
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--info)',
        'focus-ring': 'var(--focus-ring)',

        // Carbon / Neutral Dark Surfaces
        slate: {
          850: '#111318',
          925: '#0D0F14',
          950: '#0A0C10',
          tempered: '#181B22',
          hairline: '#27272A',
        },
        // Deep Carbon Hero / Sidebar Surfaces
        obsidian: {
          DEFAULT: '#0A0C10',
          950: '#0A0C10',
          900: '#0A0C10',
          800: '#111318',
          700: '#181B22',
          deep: '#07090D',
        },
        gunmetal: {
          DEFAULT: '#111318',
          billet: '#14171F',
          elevated: '#181B22',
        },
        // Light Editorial & Workbench Surfaces
        alabaster: {
          DEFAULT: '#FAFAFA',
          steel: '#F4F4F5',
        },
        mill: {
          sheet: '#FFFFFF',
        },
        border: {
          DEFAULT: 'var(--border)',
          crisp: '#E4E4E7',
          dark: 'rgba(255, 255, 255, 0.08)',
        },
        // Semantic Accents ONLY
        // Primary Action & Verified Pass: Deep Forest Emerald
        emerald: {
          DEFAULT: '#059669',
          electric: '#10B981',
          viridian: '#047857',
          badge: '#ECFDF5',
          darkText: '#065F46',
        },
        // Heat Traceability & Pending Warning: Burnished Ochre Amber
        amber: {
          DEFAULT: '#D97706',
          molten: '#D97706',
          badge: '#FFFBEB',
          darkText: '#92400E',
        },
        copper: {
          smelting: '#C2410C',
        },
        // Technical Citation / Coordinate Link: Steel Blue
        cobalt: {
          DEFAULT: '#2563EB',
          blueprint: '#2563EB',
          light: '#EFF6FF',
          darkText: '#1E40AF',
        },
        // Out-of-Spec / Blocked Gate: Brick Crimson
        crimson: {
          DEFAULT: '#DC2626',
          oxide: '#DC2626',
          badge: '#FEF2F2',
          darkText: '#991B1B',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.125rem' }],     // 12px strict floor
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],     // 14px app body
        'base': ['1rem', { lineHeight: '1.5rem' }],        // 16px editorial body
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],     // 18px
        'xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.025em' }],
        '2xl': ['2rem', { lineHeight: '2.4rem', letterSpacing: '-0.03em' }],
        '3xl': ['3rem', { lineHeight: '1.12', letterSpacing: '-0.03em' }],
      },
      boxShadow: {
        'subtle': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'card-light': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'card-dark': '0 1px 2px rgba(0, 0, 0, 0.24), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'dropdown': '0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        'shimmer': 'shimmer 1.8s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
      },
    },
  },
  plugins: [],
};
