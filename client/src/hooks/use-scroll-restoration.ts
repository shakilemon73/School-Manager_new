import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

/**
 * Hook to preserve scroll position when navigating within the same parent route
 * This prevents the page from jumping to top when clicking sidebar menu items
 */
export function useScrollRestoration(containerRef: React.RefObject<HTMLElement>) {
  const [location] = useLocation();
  const scrollPositions = useRef<Map<string, number>>(new Map());
  const previousLocation = useRef<string>(location);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Save scroll position before location changes
    const handleBeforeUnload = () => {
      scrollPositions.current.set(previousLocation.current, container.scrollTop);
    };

    // Save scroll position continuously as user scrolls
    const handleScroll = () => {
      scrollPositions.current.set(location, container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // When location changes, restore saved position or scroll to top for new routes
    if (previousLocation.current !== location) {
      const savedPosition = scrollPositions.current.get(location);
      
      // Use double RAF for perfect timing after DOM updates
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (savedPosition !== undefined && savedPosition !== null) {
            // Restore saved scroll position for previously visited routes
            container.scrollTop = savedPosition;
          } else {
            // Scroll to top for first-time visits to this route
            container.scrollTop = 0;
          }
        });
      });
      
      previousLocation.current = location;
    }

    return () => {
      handleBeforeUnload();
      container.removeEventListener('scroll', handleScroll);
    };
  }, [location, containerRef]);
}
