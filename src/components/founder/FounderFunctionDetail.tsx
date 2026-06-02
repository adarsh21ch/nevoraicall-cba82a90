import { useEffect, useState } from 'react';
import { Check, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { resolveFounderIcon } from '@/components/founder/founderIcons';
import { FounderFunctionMetrics } from '@/components/founder/FounderFunctionMetrics';
import { CADENCES, type FounderFunctionKey, type FounderCadence } from '@/config/founderFunctions';
import { useFounderFunction, type FounderFunctionStatus } from '@/hooks/useFounderFunctions';

const STATUS_OPTIONS: { value: FounderFunctionStatus; label: string; active: string }[] = [
  { value: 'missing', label: 'Missing', active: 'bg-destructive text-destructive-foreground border-destructive' },
  { value: 'inconsistent', label: 'Inconsistent', active: 'bg-amber-500 text-white border-amber-500' },
  { value: 'consistent', label: 'Consistent', active: 'bg-emerald-500 text-white border-emerald-500' },
];

const CADENCE_LABELS: Record<FounderCadence, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  once: 'One-time',
};

/**
 * Full detail UI for a single business function. Renders its own content
 * section (status / cadence / system checklist / notes); the host page wraps it
 * in a FounderTabLayout. All persistence goes through useFounderFunction.
 */
export function FounderFunctionDetail({ functionKey }: { functionKey: FounderFunctionKey }) {
  const { merged, upsertFunction, saving } = useFounderFunction(functionKey);

  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);

  // Sync notes from the loaded row once (and when the function changes), but
  // don't clobber unsaved edits.
  useEffect(() => {
    if (merged && !notesDirty) setNotes(merged.notes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merged?.notes, functionKey]);

  if (!merged) return null;
  const { config, status, cadence, checklist, checklistDone, checklistTotal } = merged;
  const Icon = resolveFounderIcon(config.iconKey);

  const setStatus = async (next: FounderFunctionStatus) => {
    if (next === status) return;
    await upsertFunction({ function_key: functionKey, status: next });
    toast.success(`Marked ${config.label} as ${next}`);
  };

  const setCadence = async (next: FounderCadence) => {
    if (next === cadence) return;
    await upsertFunction({ function_key: functionKey, cadence: next });
    toast.success('Cadence updated');
  };

  const toggleChecklistItem = async (id: string) => {
    const next = { ...checklist, [id]: !checklist[id] };
    if (!next[id]) delete next[id];
    await upsertFunction({ function_key: functionKey, checklist: next });
  };

  const saveNotes = async () => {
    await upsertFunction({ function_key: functionKey, notes: notes.trim() || null });
    setNotesDirty(false);
    toast.success('Notes saved');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight">{config.label}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{config.description}</p>
        </div>
      </div>

      {/* Live CRM snapshot (self-hides for non-sales/marketing functions) */}
      <FounderFunctionMetrics functionKey={functionKey} />

      {/* Status selector */}
      <section className="rounded-2xl border border-border/50 bg-card p-4 space-y-2.5">
        <p className="text-sm font-semibold">Status</p>
        <div className="grid grid-cols-3 gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              disabled={saving}
              onClick={() => setStatus(opt.value)}
              className={cn(
                'px-2 py-2 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-60',
                status === opt.value
                  ? opt.active
                  : 'bg-muted/50 text-muted-foreground border-border/50 hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Cadence selector */}
      <section className="rounded-2xl border border-border/50 bg-card p-4 space-y-2.5">
        <p className="text-sm font-semibold">Review cadence</p>
        <div className="flex flex-wrap gap-2">
          {CADENCES.map((c) => (
            <button
              key={c}
              disabled={saving}
              onClick={() => setCadence(c)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors disabled:opacity-60',
                cadence === c
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border/50 hover:text-foreground',
              )}
            >
              {CADENCE_LABELS[c]}
            </button>
          ))}
        </div>
      </section>

      {/* System checklist */}
      <section className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Systems in place</p>
          <span className="text-xs font-medium text-muted-foreground">
            {checklistDone}/{checklistTotal} in place
          </span>
        </div>
        <div className="space-y-1.5">
          {config.systemChecklist.map((item) => {
            const done = !!checklist[item.id];
            return (
              <button
                key={item.id}
                disabled={saving}
                onClick={() => toggleChecklistItem(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-60',
                  done ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-border/50 hover:bg-muted/50',
                )}
              >
                <span
                  className={cn(
                    'h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                    done ? 'bg-primary border-primary text-primary-foreground' : 'border-border bg-card',
                  )}
                >
                  {done && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className={cn('text-sm', done ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Notes */}
      <section className="rounded-2xl border border-border/50 bg-card p-4 space-y-2.5">
        <p className="text-sm font-semibold">Notes</p>
        <Textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesDirty(true);
          }}
          rows={4}
          placeholder={`What's working, what's missing for ${config.label.toLowerCase()}…`}
        />
        <Button onClick={saveNotes} disabled={saving || !notesDirty} size="sm" className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Save className="h-4 w-4 mr-1.5" /> Save notes</>)}
        </Button>
      </section>
    </div>
  );
}
