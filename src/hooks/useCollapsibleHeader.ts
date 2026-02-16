import { useState, useRef, useCallback, useEffect } from 'react';

const SCROLL_THRESHOLD = 30; // Minimum scroll before toggling

export function useCollapsibleHeader() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const lastScrollY = useRef(0);
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);

  // Callback ref to capture the container element
  const scrollContainerRef = useCallback((node: HTMLDivElement | null) => {
    setScrollContainer(node);
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollContainer) return;

    const currentScrollY = scrollContainer.scrollTop;
    const diff = currentScrollY - lastScrollY.current;

    // Only toggle if scroll threshold exceeded
    if (Math.abs(diff) < SCROLL_THRESHOLD) return;

    if (diff > 0 && currentScrollY > 50) {
      // Scrolling DOWN - collapse
      setIsCollapsed(true);
    } else if (diff < 0) {
      // Scrolling UP - expand
      setIsCollapsed(false);
    }

    lastScrollY.current = currentScrollY;
  }, [scrollContainer]);

  // Attach scroll listener to the container
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
