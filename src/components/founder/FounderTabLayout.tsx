import { type ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-call-logo.png';
import type { FounderFunctionStatus } from '@/hooks/useFounderFunctions';

/**
 * Shared shell for Founder mode tabs. Mirrors CreatorTabLayout (fixed header
 * with logo + title/subtitle, scrollable padded content, bottom nav) but has no
 * account switcher. An optional back affordance is shown for detail pages.
 */
export function FounderTabLayout({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {onBack ? (
              <button
                onClick={onBack}
                aria-label="Back"
                className="h-10 w-10 rounded-xl flex items-center justify-center bg-muted/60 text-foreground hover:bg-muted shrink-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : (
              <img src={nevoraLogo} alt="Enarsia Logo" className="h-10 w-10 rounded-xl object-cover shadow-md shrink-0" />
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight truncate">{title}</h1>
              <p className="text-xs text-muted-foreground font-medium truncate">{subtitle}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="scrollable-content relative">
        <div className="container py-3 px-4 space-y-4 pb-24">{children}</div>
      </main>

      <BottomNav />
    </div>
  );
}

const STATUS_META: Record<FounderFunctionStatus, { label: string; className: string }> = {
  missing: {
    label: 'Missing',
    className: 'bg-destructive/10 text-destructive border-destructive/30',
  },
  inconsistent: {
    label: 'Inconsistent',
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
  },
  consistent: {
    label: 'Consistent',
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
  },
};

/** Small colored pill conveying a function's maturity status. */
export function FounderStatusPill({ status, className }: { status: FounderFunctionStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap',
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
