import { ReactNode } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  shouldRefresh: boolean;
}

export function PullToRefreshIndicator({ pullDistance, isRefreshing, shouldRefresh }: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 flex justify-center z-50 pointer-events-none"
      style={{ 
        transform: `translateY(${Math.min(pullDistance, 100)}px)`,
        opacity: Math.min(pullDistance / 60, 1),
        transition: pullDistance === 0 ? 'all 0.3s ease-out' : 'none'
      }}
    >
      <div className={cn(
        "flex items-center justify-center w-10 h-10 rounded-full bg-card shadow-lg border border-border/50",
        shouldRefresh && "bg-primary"
      )}>
        {isRefreshing ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <ArrowDown className={cn(
            "h-5 w-5 transition-transform duration-200",
            shouldRefresh ? "text-primary-foreground rotate-180" : "text-muted-foreground"
          )} />
        )}
      </div>
    </div>
  );
}

interface PullToRefreshWrapperProps {
  children: ReactNode;
  pullDistance: number;
  isRefreshing: boolean;
  shouldRefresh: boolean;
}

export function PullToRefreshWrapper({ children, pullDistance, isRefreshing, shouldRefresh }: PullToRefreshWrapperProps) {
  return (
    <>
      <PullToRefreshIndicator 
        pullDistance={pullDistance} 
        isRefreshing={isRefreshing} 
        shouldRefresh={shouldRefresh} 
      />
      <div 
        style={{ 
          transform: `translateY(${pullDistance > 0 ? Math.min(pullDistance * 0.5, 50) : 0}px)`,
          transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {children}
      </div>
    </>
  );
}
