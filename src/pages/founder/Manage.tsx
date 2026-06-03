import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ChevronRight,
  Loader2,
  Sparkles,
  AlertTriangle,
  Clock,
  CalendarCheck,
  CheckCircle2,
  Plus,
  Users,
  UserPlus,
  Megaphone,
  CalendarClock,
} from 'lucide-react';
import { FounderTabLayout, FounderStatusPill } from '@/components/founder/FounderTabLayout';
import { resolveFounderIcon } from '@/components/founder/founderIcons';
import { useFounderToday, type FocusItem } from '@/hooks/useFounderToday';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

const CADENCE_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  once: 'One-time',
};

function greeting(d: Date): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function firstName(name: string | null | undefined): string {
  if (!name) return 'there';
  return name.trim().split(/\s+/)[0] || 'there';
}

function healthLabel(score: number): { label: string; className: string; barClass: string } {
  if (score >= 70)
    return {
      label: 'Healthy',
      className: 'text-emerald-700 dark:text-emerald-300',
      barClass: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
    };
  if (score >= 40)
    return {
      label: 'Needs attention',
      className: 'text-amber-700 dark:text-amber-300',
      barClass: 'bg-gradient-to-r from-amber-500 to-amber-400',
    };
  return {
    label: 'At risk',
    className: 'text-destructive',
    barClass: 'bg-gradient-to-r from-destructive to-red-400',
  };
}

const FOCUS_META: Record<
  FocusItem['kind'],
  { icon: typeof Clock; iconWrap: string; iconColor: string; accent: string }
> = {
  overdue: {
    icon: AlertTriangle,
    iconWrap: 'bg-destructive/15',
    iconColor: 'text-destructive',
    accent: 'border-destructive/30',
  },
  due_today: {
    icon: Clock,
    iconWrap: 'bg-amber-500/15',
    iconColor: 'text-amber-600 dark:text-amber-400',
    accent: 'border-amber-500/30',
  },
  daily_task: {
    icon: CheckCircle2,
    iconWrap: 'bg-primary/10',
    iconColor: 'text-primary',
    accent: 'border-border/50',
  },
  function_review: {
    icon: CalendarCheck,
    iconWrap: 'bg-primary/10',
    iconColor: 'text-primary',
    accent: 'border-border/50',
  },
};

function StatTile({
  icon: Icon,
  label,
  value,
  loading,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-border/50 bg-card p-3 text-left hover:bg-muted/40 transition-colors flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg bg-muted shrink-0">
          <Icon className="h-4 w-4 text-foreground" />
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
        )}
        <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{label}</p>
      </div>
    </button>
  );
}

export default function Manage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const {
    healthScore,
    healthCounts,
    focus,
    reviewDue,
    numbers,
    loading,
    mergedFunctions,
    updatedAt,
  } = useFounderToday();

  const now = useMemo(() => new Date(), []);
  const health = healthLabel(healthScore);
  const name = firstName(profile?.display_name);

  if (loading.functions) {
    return (
      <FounderTabLayout title="Today" subtitle="Your daily cockpit">
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </FounderTabLayout>
    );
  }

  return (
    <FounderTabLayout title="Today" subtitle="Your daily cockpit">
      {/* Header: greeting + date + business health */}
      <section className="rounded-2xl border border-border/50 bg-card p-4 space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            {greeting(now)}, {name}
          </h2>
          <p className="text-xs text-muted-foreground font-medium">
            {format(now, 'EEEE, d MMM yyyy')}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Business health</p>
            <span className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">{healthScore}%</span>
              <span className={cn('text-xs font-semibold', health.className)}>{health.label}</span>
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', health.barClass)}
              style={{ width: `${healthScore}%` }}
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> {healthCounts.consistent} consistent
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> {healthCounts.inconsistent} inconsistent
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-destructive" /> {healthCounts.missing} missing
            </span>
          </div>
        </div>
      </section>

      {/* Today's focus */}
      <section className="space-y-2">
        <p className="text-sm font-semibold px-1">Today's focus</p>
        {focus.length === 0 ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 shrink-0">
              <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-medium">You're all caught up 🎉</p>
          </div>
        ) : (
          <div className="space-y-2">
            {focus.map((item) => {
              const meta = FOCUS_META[item.kind];
              const Icon = meta.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.href)}
                  className={cn(
                    'w-full rounded-xl border bg-card p-3 flex items-center gap-3 text-left hover:bg-muted/40 transition-colors',
                    meta.accent,
                  )}
                >
                  <div className={cn('p-2 rounded-lg shrink-0', meta.iconWrap)}>
                    <Icon className={cn('h-4 w-4', meta.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">{item.label}</p>
                    {item.sublabel && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.sublabel}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Numbers at a glance */}
      <section className="space-y-2">
        <p className="text-sm font-semibold px-1">Numbers at a glance</p>
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            icon={Users}
            label="Pipeline (active prospects)"
            value={numbers.pipeline}
            loading={loading.sales}
            onClick={() => navigate('/manage/sales')}
          />
          <StatTile
            icon={UserPlus}
            label="New leads this week"
            value={numbers.newLeadsThisWeek}
            loading={loading.sales}
            onClick={() => navigate('/manage/sales')}
          />
          <StatTile
            icon={Megaphone}
            label="Leads captured (funnels)"
            value={numbers.leadsCaptured}
            loading={loading.marketing}
            onClick={() => navigate('/manage/marketing')}
          />
          <StatTile
            icon={CalendarClock}
            label="Follow-ups due"
            value={numbers.followUpsDue}
            loading={loading.sales}
            onClick={() => navigate('/manage/sales')}
          />
        </div>
      </section>

      {/* Business functions grid */}
      <section className="space-y-2">
        <p className="text-sm font-semibold px-1">Business functions</p>
        <div className="grid grid-cols-1 gap-2">
          {mergedFunctions.map((f) => {
            const Icon = resolveFounderIcon(f.config.iconKey);
            const due = reviewDue[f.config.key];
            const updated = updatedAt[f.config.key];
            return (
              <button
                key={f.config.key}
                onClick={() => navigate(`/manage/${f.config.key}`)}
                className={cn(
                  'w-full rounded-xl border bg-card p-3 flex items-center gap-3 text-left hover:bg-muted/40 transition-colors',
                  due ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border/50',
                )}
              >
                <div className="p-2.5 rounded-xl bg-muted shrink-0">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold leading-tight">{f.config.label}</p>
                    <FounderStatusPill status={f.status} />
                    {due && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-primary/10 text-primary border border-primary/30">
                        <CalendarCheck className="h-2.5 w-2.5" /> Review due
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {CADENCE_LABELS[f.cadence]} ·{' '}
                    {updated
                      ? `Updated ${formatDistanceToNow(new Date(updated), { addSuffix: true })}`
                      : 'Not set yet'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Quick actions */}
      <section className="space-y-2">
        <p className="text-sm font-semibold px-1">Quick actions</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate('/action')}
            className="rounded-xl border border-border/50 bg-card p-3 flex items-center gap-2 text-left hover:bg-muted/40 transition-colors"
          >
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium">Add task</span>
          </button>
          <button
            onClick={() => navigate('/manage/sales')}
            className="rounded-xl border border-border/50 bg-card p-3 flex items-center gap-2 text-left hover:bg-muted/40 transition-colors"
          >
            <div className="p-2 rounded-lg bg-muted shrink-0">
              <Users className="h-4 w-4 text-foreground" />
            </div>
            <span className="text-sm font-medium">Open Sales</span>
          </button>
        </div>
      </section>
    </FounderTabLayout>
  );
}
