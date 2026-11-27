import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

const FORBIDDEN_VITE_SECRET_KEY_PATTERN = /(?:^|_)(?:SECRET|KEY|TOKEN|PASSWORD|PRIVATE)(?:_|$)/i;
// Explicitly documented public client identifiers only (never service_role or private keys)
const PUBLIC_CLIENT_KEY_ALLOWLIST = new Set([
  'VITE_SUPABASE_ANON_KEY',
  'VITE_TURNSTILE_SITE_KEY',
  'VITE_RAZORPAY_KEY_ID',
]);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  const loadedViteEnv = loadEnv(mode, process.cwd(), 'VITE_');
  const mergedViteEnv: Record<string, string | undefined> = { ...loadedViteEnv };
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith('VITE_')) mergedViteEnv[k] = v;
  }

  // Prompt Pack v5 Task 3.7: Fail production build if VITE_UI_PREVIEW_MODE or secret-like VITE_* vars are present
  if (isProd && mergedViteEnv.VITE_UI_PREVIEW_MODE) {
    throw new Error(
      'SECURITY VIOLATION: VITE_UI_PREVIEW_MODE cannot exist in production builds. Production requires mandatory authentication.'
    );
  }
  if (isProd) {
    for (const [key, val] of Object.entries(mergedViteEnv)) {
      if (!val) continue;
      if (PUBLIC_CLIENT_KEY_ALLOWLIST.has(key)) {
        if (val.includes('service_role')) {
          throw new Error(`SECURITY VIOLATION: "${key}" appears to contain a privileged service_role credential.`);
        }
        continue;
      }
      if (FORBIDDEN_VITE_SECRET_KEY_PATTERN.test(key)) {
        throw new Error(
          `SECURITY VIOLATION: Forbidden secret-like frontend env variable "${key}" cannot be exposed in VITE_* builds.`
        );
      }
    }
  }

  return {
    resolve: {
      alias: {
        'gsap/ScrollTrigger': path.resolve(__dirname, 'src/lib/gsapShim.ts'),
        'gsap': path.resolve(__dirname, 'src/lib/gsapShim.ts'),
      },
    },
    plugins: [
      react(),
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
    ],
    esbuild: {
      drop: isProd ? ['console', 'debugger'] : [],
      legalComments: 'none',
    },
    build: {
      sourcemap: false,
      minify: 'esbuild',
      cssMinify: true,
      reportCompressedSize: true,
      rollupOptions: {
        output: {
          sourcemapExcludeSources: true,
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-motion': ['framer-motion'],
            'vendor-icons': ['lucide-react'],
            'vendor-ui': ['@radix-ui/react-dialog', 'vaul'],
            'vendor-i18n': ['i18next', 'react-i18next'],
          },
        },
      },
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  };
});
