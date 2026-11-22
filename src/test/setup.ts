// Global Vitest Test Setup for JSDOM
import '../i18n';

if (typeof window !== 'undefined') {
  window.matchMedia =
    window.matchMedia ||
    function (query: string) {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    };

  window.scrollTo = window.scrollTo || (() => {});
}
