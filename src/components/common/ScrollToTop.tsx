import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scrollToTop } from '../effects/LenisScroller';

/**
 * ScrollToTop resets scroll position cleanly on route navigation, syncing
 * with Lenis when active and refreshing GSAP ScrollTrigger bounds.
 */
export const ScrollToTop: React.FC = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (!window.location.hash) {
      scrollToTop(true);
    }
    const timer = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [pathname, search]);

  return null;
};
