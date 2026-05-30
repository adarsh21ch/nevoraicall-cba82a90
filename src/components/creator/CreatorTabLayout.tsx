import { type ReactNode, type ComponentType } from 'react';
import { HeaderBellIcon } from '@/components/layout/HeaderBellIcon';
import { BottomNav } from '@/components/layout/BottomNav';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-call-logo.png';

/**
 * Shared shell for the Content Creator mode tabs (Ideas / Studio / Calendar /
 * Insights). Mirrors the app layout used by Profile etc. (fixed header +
 * scrollable content + BottomNav) so the mode re-skin feels native.
 */
export function CreatorTabLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={nevoraLogo} alt="Nevorai CRM Logo" className="h-10 w-10 rounded-xl object-cover shadow-md" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">{title}</h1>
              <p className="text-xs text-muted-foreground font-medium">{subtitle}</p>
            </div>
          </div>
          <HeaderBellIcon />
        </div>
      </header>

      <main className="scrollable-content relative">
        <div className="container py-3 px-4 space-y-4 pb-24">{children}</div>
      </main>

      <BottomNav />
    </div>
  );
}

/**
 * Empty-state block for a not-yet-wired creator feature. Describes the tab's
 * job-to-be-done (from the design spec) with an icon and a "coming soon" CTA.
 */
export function CreatorEmptyState({
  icon: Icon,
  headline,
  body,
  bullets,
  cta,
}: {
  icon: ComponentType<{ className?: string }>;
  headline: string;
  body: string;
  bullets?: string[];
  cta?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 flex flex-col items-center text-center">
      <div className="p-3 rounded-2xl bg-primary/10 mb-4">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-lg font-bold mb-1.5">{headline}</h2>
      <p className="text-sm text-muted-foreground max-w-sm">{body}</p>

      {bullets && bullets.length > 0 && (
        <ul className="mt-4 space-y-2 text-left w-full max-w-sm">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span className="text-foreground/90">{b}</span>
            </li>
          ))}
        </ul>
      )}

      {cta && (
        <div
          className={cn(
            'mt-5 w-full max-w-sm rounded-xl px-4 py-2.5 text-sm font-semibold',
            'bg-muted text-muted-foreground border border-border/50 cursor-default select-none',
          )}
        >
          {cta} · coming soon
        </div>
      )}
    </div>
  );
}
