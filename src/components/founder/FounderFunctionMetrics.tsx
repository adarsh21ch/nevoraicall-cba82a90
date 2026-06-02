import { type ReactNode } from 'react';
import {
  Loader2,
  Users,
  UserPlus,
  CalendarClock,
  AlertTriangle,
  Megaphone,
  Rocket,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FounderFunctionKey } from '@/config/founderFunctions';
import { useSalesSnapshot, useMarketingSnapshot } from '@/hooks/useFounderCrmSnapshot';

/**
 * Phase 2 — a compact live-CRM card that sits ABOVE the manual
 * status/cadence/checklist/notes UI on the Sales & Marketing functions.
 *
 * Only Sales and Marketing have CRM data wired in Phase 2; every other function
 * renders nothing (returns null), so the single mount point in
 * FounderFunctionDetail is safe for all 7 functions.
 */
export function FounderFunctionMetrics({ functionKey }: { functionKey: FounderFunctionKey }) {
  if (functionKey === 'sales') return <SalesMetrics />;
  if (functionKey === 'marketing') return <MarketingMetrics />;
  return null;
}

/** Shared card shell matching the rest of the founder UI. */
function MetricsCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-primary/80">Live</span>
      </div>
      {children}
    </section>
  );
}

function CardLoading() {
  return (
    <div className="flex items-center justify-center py-6 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

interface TileProps {
  icon: LucideIcon;
  label: string;
  value: number;
  /** amber/red emphasis (e.g. overdue follow-ups). */
  tone?: 'default' | 'warn';
}

function StatTile({ icon: Icon, label, value, tone = 'default' }: TileProps) {
  const warn = tone === 'warn' && value > 0;
  return (
    <div
      className={cn(
        'rounded-xl border p-3 flex flex-col gap-1.5',
        warn ? 'border-amber-500/40 bg-amber-500/10' : 'border-border/50 bg-muted/30',
      )}
    >
      <Icon className={cn('h-4 w-4', warn ? 'text-amber-600 dark:text-amber-400' : 'text-primary')} />
      <span className={cn('text-xl font-bold tabular-nums leading-none', warn && 'text-amber-700 dark:text-amber-300')}>
        {value}
      </span>
      <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
    </div>
  );
}

function SalesMetrics() {
  const { totalPipeline, addedThisWeek, followUpsDue, followUpsOverdue, loading } = useSalesSnapshot();

  if (loading) {
    return (
      <MetricsCard title="Live pipeline">
        <CardLoading />
      </MetricsCard>
    );
  }

  const isEmpty = totalPipeline === 0 && followUpsDue === 0;

  return (
    <MetricsCard title="Live pipeline">
      {isEmpty ? (
        <p className="text-sm text-muted-foreground py-2">
          No leads captured yet. Add prospects in the CRM and they'll show up here.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <StatTile icon={Users} label="In pipeline" value={totalPipeline} />
          <StatTile icon={UserPlus} label="Added this week" value={addedThisWeek} />
          <StatTile icon={CalendarClock} label="Follow-ups due" value={followUpsDue} />
          <StatTile icon={AlertTriangle} label="Overdue" value={followUpsOverdue} tone="warn" />
        </div>
      )}
    </MetricsCard>
  );
}

function MarketingMetrics() {
  const { leadsCaptured, activeFunnels, totalFunnels, loading } = useMarketingSnapshot();

  if (loading) {
    return (
      <MetricsCard title="Live reach">
        <CardLoading />
      </MetricsCard>
    );
  }

  const isEmpty = totalFunnels === 0 && leadsCaptured === 0;

  return (
    <MetricsCard title="Live reach">
      {isEmpty ? (
        <p className="text-sm text-muted-foreground py-2">
          No funnels yet. Publish a funnel to start capturing leads.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <StatTile icon={Megaphone} label="Leads captured" value={leadsCaptured} />
          <StatTile icon={Rocket} label="Active funnels" value={activeFunnels} />
        </div>
      )}
    </MetricsCard>
  );
}
