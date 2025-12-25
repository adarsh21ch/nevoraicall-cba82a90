import { useRef, useCallback, useEffect } from 'react';

interface UseSwipeTabsOptions {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  threshold?: number;
  enabled?: boolean;
}

export function useSwipeTabs({ 
  onSwipeLeft, 
  onSwipeRight, 
  threshold = 50,
  enabled = true 
}: UseSwipeTabsOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const isTracking = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isTracking.current = true;
  }, [enabled]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !isTracking.current) return;
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    
    const deltaX = endX - startX.current;
    const deltaY = endY - startY.current;
    
    // Only trigger if horizontal movement is dominant (ratio > 1.5)
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 1.5;
    
    if (isHorizontalSwipe && Math.abs(deltaX) >= threshold) {
      if (deltaX < 0) {
        // Swipe left
        onSwipeLeft();
      } else {
        // Swipe right
        onSwipeRight();
      }
    }
    
    isTracking.current = false;
    startX.current = 0;
    startY.current = 0;
  }, [enabled, threshold, onSwipeLeft, onSwipeRight]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return { containerRef };
}
