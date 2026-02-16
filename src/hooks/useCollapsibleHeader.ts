import { useState, useRef, useCallback, useEffect } from 'react';

const COLLAPSE_THRESHOLD = 60; // Scroll down this much to collapse
const EXPAND_THRESHOLD = 40;   // Scroll up this much to expand
const MIN_SCROLL_TO_COLLAPSE = 80; // Don't collapse until scrolled this far

export function useCollapsibleHeader() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const lastScrollY = useRef(0);
  const directionChangeY = useRef(0); // Track where direction last changed
  const lastDirection = useRef<'up' | 'down' | null>(null);
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);

  const scrollContainerRef = useCallback((node: HTMLDivElement | null) => {
    setScrollContainer(node);
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollContainer) return;

    const currentScrollY = scrollContainer.scrollTop;
    const diff = currentScrollY - lastScrollY.current;
    
    // Determine direction
    const direction = diff > 0 ? 'down' : diff < 0 ? 'up' : lastDirection.current;
    
    // Track direction changes for measuring sustained scroll
    if (direction !== lastDirection.current) {
      directionChangeY.current = currentScrollY;
      lastDirection.current = direction;
    }

    const sustainedDistance = Math.abs(currentScrollY - directionChangeY.current);

    if (direction === 'down' && currentScrollY > MIN_SCROLL_TO_COLLAPSE && sustainedDistance > COLLAPSE_THRESHOLD) {
      setIsCollapsed(true);
    } else if (direction === 'up' && sustainedDistance > EXPAND_THRESHOLD) {
      setIsCollapsed(false);
    }

    lastScrollY.current = currentScrollY;
  }, [scrollContainer]);

  useEffect(() => {
    if (!scrollContainer) return;

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [scrollContainer, handleScroll]);

  const expandHeader = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  return {
    isCollapsed,
    scrollContainerRef,
    expandHeader,
  };
}
