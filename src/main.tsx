import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';

// Bundled theme bootstrap & service worker registration (moved from index.html for strict script-src CSP)
try {
  const stored = localStorage.getItem('hl_theme_mode') || localStorage.getItem('heatledger-theme');
  const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = stored === 'dark' || (!stored && isSystemDark) || (stored === 'system' && isSystemDark) || (!stored);
  if (isDark) {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }
} catch {
  // Ignore storage restrictions
}

if (
  'serviceWorker' in navigator &&
  (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
