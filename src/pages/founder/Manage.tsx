import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { FounderTabLayout, FounderStatusPill } from '@/components/founder/FounderTabLayout';
import { resolveFounderIcon } from '@/components/founder/founderIcons';
import { useFounderFunctions, type MergedFounderFunction } from '@/hooks/useFounderFunctions';

const CADENCE_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  once: 'One-time',
};

/** Maps a function status to its 0–100 contribution to overall health. */
const STATUS_SCORE: Record<MergedFounderFunction['status'], number> = {
  consistent: 100,
  inconsistent: 50,
  missing: 0,
};

export default function Manage() {
  const navigate = useNavigate();
  const { mergedFunctions, isLoading } = useFounderFunctions();

  const counts = useMemo(() => {
    const c = { consistent: 0, inconsistent: 0, missing: 0 };
    mergedFunctions.forEach((f) => { c[f.status] += 1; });
    return c;
  }, [mergedFunctions]);

  const healthScore = useMemo(() => {
    if (mergedFunctions.length === 0) return 0;
    const total = mergedFunctions.reduce((sum, f) => sum + STATUS_SCORE[f.status], 0);
    return Math.round(total / mergedFunctions.length);
  }, [mergedFunctions]);

  // Today's focus: daily-cadence functions + anything missing/inconsistent.
  const focus = useMemo(() => {
    return mergedFunctions.filter(
      (f) => f.cadence === 'daily' || f.status === 'missing' || f.status === 'inconsistent',
    );
  }, [mergedFunctions]);

  if (isLoading) {
    return (
      <FounderTabLayout title="Manage" subtitle="Your business at a glance">
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </FounderTabLayout>
    );
  }

  return (
    <FounderTabLayout title="Manage" subtitle="Your business at a glance">
      {/* Business health */}
      <section className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Business health</p>
          <span className="text-2xl font-bold tabular-nums">{healthScore}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all"
            style={{ width: `${healthScore}%` }}
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {counts.consistent} consistent</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> {counts.inconsistent} inconsistent</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> {counts.missing} missing</span>
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
            <p className="text-sm font-medium">Every function is consistent. Keep the rhythm going.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {focus.map((f) => {
              const Icon = resolveFounderIcon(f.config.iconKey);
              return (
                <button
                  key={f.config.key}
                  onClick={() => navigate(`/manage/${f.config.key}`)}
                  className="w-full rounded-xl border border-border/50 bg-card p-3 flex items-center gap-3 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0"><Icon className="h-4 w-4 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{f.config.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {f.status === 'missing' || f.status === 'inconsistent' ? (
                        <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Needs attention</span>
                      ) : (
                        `${CADENCE_LABELS[f.cadence]} check-in`
                      )}
                    </p>
                  </div>
                  <FounderStatusPill status={f.status} />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* All 7 functions */}
      <section className="space-y-2">
        <p className="text-sm font-semibold px-1">Business functions</p>
        <div className="grid grid-cols-1 gap-2">
          {mergedFunctions.map((f) => {
            const Icon = resolveFounderIcon(f.config.iconKey);
            return (
              <button
                key={f.config.key}
                onClick={() => navigate(`/manage/${f.config.key}`)}
                className="w-full rounded-xl border border-border/50 bg-card p-3 flex items-center gap-3 text-left hover:bg-muted/40 transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-muted shrink-0"><Icon className="h-5 w-5 text-foreground" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold leading-tight">{f.config.label}</p>
                    <FounderStatusPill status={f.status} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {CADENCE_LABELS[f.cadence]} · {f.checklistDone}/{f.checklistTotal} systems
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      </section>
    </FounderTabLayout>
  );
}
