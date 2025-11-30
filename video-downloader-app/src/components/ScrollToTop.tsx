import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top instantly when route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant', // Instant scroll for route changes
    });
  }, [pathname]);

  // Add global scroll-to-top handler for buttons
  useEffect(() => {
    const handleScrollToTop = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if clicked element or its parent is a navigation button
      if (
        target.closest('button[data-scroll-to-top]') ||
        target.closest('a[data-scroll-to-top]') ||
        target.closest('.nav-link') ||
        target.closest('button')?.textContent?.toLowerCase().includes('back') ||
        target.closest('button')?.textContent?.toLowerCase().includes('home')
      ) {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth',
        });
      }
    };

    document.addEventListener('click', handleScrollToTop);
    return () => document.removeEventListener('click', handleScrollToTop);
  }, []);

  return null;
};

