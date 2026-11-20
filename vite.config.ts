import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

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
