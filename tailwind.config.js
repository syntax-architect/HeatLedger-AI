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
        // Dark Hero / Shell Surfaces
        obsidian: {
          DEFAULT: '#090D16',
          900: '#090D16',
          deep: '#06090F',
        },
        gunmetal: {
          DEFAULT: '#111827',
          billet: '#111827',
          elevated: '#141E33',
        },
        slate: {
          tempered: '#1E293B',
          hairline: '#1E293B',
        },
        // Light Workbench Surfaces
        alabaster: {
          DEFAULT: '#F8FAFC',
          steel: '#F8FAFC',
        },
        mill: {
          sheet: '#FFFFFF',
        },
        border: {
          crisp: '#E2E8F0',
          dark: '#1E293B',
        },
        // Primary Accent: Electric Emerald (CBAM & ASTM Pass)
        emerald: {
          DEFAULT: '#10B981',
          electric: '#10B981',
          viridian: '#059669',
          badge: '#D1FAE5',
          darkText: '#065F46',
        },
        // Secondary Accent: Molten Amber & Smelting Copper (Heat Trace & Melt-and-Pour)
        amber: {
          DEFAULT: '#F59E0B',
          molten: '#F59E0B',
          badge: '#FEF3C7',
          darkText: '#92400E',
        },
        copper: {
          smelting: '#EA580C',
        },
        // Telemetry Accent (PDF Coordinates & Clause 6)
        cobalt: {
          DEFAULT: '#2563EB',
          blueprint: '#2563EB',
          light: '#DBEAFE',
          darkText: '#1E40AF',
        },
        // Alert Accent (Off-Spec Chemistry / Rejection)
        crimson: {
          DEFAULT: '#EF4444',
          oxide: '#EF4444',
          badge: '#FEE2E2',
          darkText: '#991B1B',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(ellipse 80% 60% at 80% 20%, rgba(16, 185, 129, 0.12), transparent), radial-gradient(ellipse 70% 50% at 20% 80%, rgba(245, 158, 11, 0.10), transparent)',
        'mesh-glow': 'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
        'forge-beam': 'linear-gradient(90deg, #F59E0B 0%, #EA580C 100%)',
        'emerald-beam': 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
      },
      boxShadow: {
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
        'glow-amber': '0 0 25px -5px rgba(245, 158, 11, 0.3)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(30, 41, 59, 0.8)',
        'card-light': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan-line': 'scanLine 2.5s ease-in-out infinite',
      },
      keyframes: {
        scanLine: {
          '0%, 100%': { transform: 'translateY(0%)' },
          '50%': { transform: 'translateY(100%)' },
        }
      }
    },
  },
  plugins: [],
}
