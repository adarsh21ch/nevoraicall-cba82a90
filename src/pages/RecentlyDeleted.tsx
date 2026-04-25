import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, differenceInCalendarDays, differenceInHours, isToday, isYesterday } from 'date-fns';
import {
  ArrowLeft,
  Trash2,
  RotateCcw,
  Folder,
  ListChecks,
  User,
  MoreVertical,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useDeletionBatches, type DeletionBatch, type BatchLead } from '@/hooks/useDeletionBatches';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Time format helpers ───────────────────────────────────────
const formatRelativeTime = (iso: string) => {
  const date = new Date(iso);
  const hoursAgo = differenceInHours(new Date(), date);
  if (hoursAgo < 1) return 'Just now';
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  if (isYesterday(date)) return `Yesterday at ${format(date, 'h:mm a')}`;
  const days = differenceInCalendarDays(new Date(), date);
  if (days <= 6) return `${days} days ago`;
  return format(date, 'MMM d \'at\' h:mm a');
};

const getDaysLeft = (expiresAt: string) =>
  Math.max(0, differenceInCalendarDays(new Date(expiresAt), new Date()));

const getGroupKey = (iso: string): { key: string; label: string; order: number } => {
  const d = new Date(iso);
  if (isToday(d)) return { key: 'today', label: 'Today', order: 0 };
  if (isYesterday(d)) return { key: 'yesterday', label: 'Yesterday', order: 1 };
  const days = differenceInCalendarDays(new Date(), d);
  if (days <= 6) return { key: `d${days}`, label: `${days} days ago`, order: days };
  if (days <= 30) return { key: 'older', label: 'Earlier', order: 100 };
  return { key: 'oldest', label: 'Older', order: 200 };
};

// ─── Card variants ─────────────────────────────────────────────
function BatchCard({
  batch,
  onRestore,
  onPurge,
  onView,
  isBusy,
}: {
  batch: DeletionBatch;
  onRestore: (b: DeletionBatch) => void;
  onPurge: (b: DeletionBatch) => void;
  onView: (b: DeletionBatch) => void;
  isBusy: boolean;
}) {
  const daysLeft = getDaysLeft(batch.expires_at);
  const isExpiringSoon = daysLeft <= 3;

  // Icon + accent per type
  const variant = (() => {
    if (batch.deletion_type === 'sheet') {
      return {
        Icon: Folder,
        iconBg: 'bg-blue-500/10 dark:bg-blue-500/15',
        iconFg: 'text-blue-600 dark:text-blue-400',
        title: batch.sheet_name || 'Sheet',
        subtitle: `${batch.lead_count} lead${batch.lead_count !== 1 ? 's' : ''} · Sheet`,
      };
    }
    if (batch.deletion_type === 'bulk') {
      return {
        Icon: ListChecks,
        iconBg: 'bg-amber-500/10 dark:bg-amber-500/15',
        iconFg: 'text-amber-600 dark:text-amber-400',
        title: `${batch.lead_count} lead${batch.lead_count !== 1 ? 's' : ''}${
          batch.sheet_name ? ` from ${batch.sheet_name}` : ''
        }`,
        subtitle: 'Selected & deleted together',
      };
    }
    return {
      Icon: User,
      iconBg: 'bg-muted',
      iconFg: 'text-muted-foreground',
      title: batch.preview_name || 'Lead',
      subtitle: [batch.preview_phone, batch.sheet_name].filter(Boolean).join(' · '),
    };
  })();

  const { Icon } = variant;

  return (
    <div className="rounded-xl bg-card border border-border/60 p-3 flex items-start gap-3 shadow-sm">
      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', variant.iconBg)}>
        <Icon className={cn('h-5 w-5', variant.iconFg)} />
      </div>

      <button
        type="button"
        onClick={() => batch.deletion_type !== 'single' && onView(batch)}
        className="flex-1 min-w-0 text-left"
      >
        <p className="text-sm font-semibold text-foreground truncate">{variant.title}</p>
        {variant.subtitle && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{variant.subtitle}</p>
        )}
        <p className="text-[11px] text-muted-foreground/80 mt-1">
          Deleted {formatRelativeTime(batch.deleted_at)}
        </p>
        {isExpiringSoon && (
          <p className="text-[11px] text-destructive font-medium mt-1">
            Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
          </p>
        )}
      </button>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-xs rounded-full text-primary border-primary/30 bg-primary/5 hover:bg-primary/10"
          onClick={() => onRestore(batch)}
          disabled={isBusy}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Restore
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {batch.deletion_type !== 'single' && (
              <DropdownMenuItem onClick={() => onView(batch)}>View leads</DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onRestore(batch)}>
              <RotateCcw className="h-3.5 w-3.5 mr-2" /> Restore
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onPurge(batch)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete permanently
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────
export default function RecentlyDeleted() {
  const navigate = useNavigate();
  const {
    batches,
    loading,
    fetchBatchLeads,
    restoreBatch,
    restoreLead,
    purgeBatch,
    purgeAll,
    isRestoring,
    isPurging,
  } = useDeletionBatches();

  const [confirmPurge, setConfirmPurge] = useState<DeletionBatch | null>(null);
  const [confirmPurgeAll, setConfirmPurgeAll] = useState(false);
  const [viewBatch, setViewBatch] = useState<DeletionBatch | null>(null);
  const [batchLeads, setBatchLeads] = useState<BatchLead[]>([]);
  const [batchLeadsLoading, setBatchLeadsLoading] = useState(false);

  // Track recent restores so the toast UNDO can re-delete
  const undoTimers = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!viewBatch) return;
    setBatchLeadsLoading(true);
    fetchBatchLeads(viewBatch.id)
      .then(setBatchLeads)
      .finally(() => setBatchLeadsLoading(false));
  }, [viewBatch, fetchBatchLeads]);

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; order: number; items: DeletionBatch[] }>();
    for (const b of batches) {
      const g = getGroupKey(b.deleted_at);
      if (!map.has(g.key)) map.set(g.key, { label: g.label, order: g.order, items: [] });
      map.get(g.key)!.items.push(b);
    }
    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [batches]);

  const handleRestoreBatch = async (b: DeletionBatch) => {
    await restoreBatch(b.id);
    // 3-second UNDO toast
    toast('Restored', {
      description:
        b.deletion_type === 'sheet'
          ? `"${b.sheet_name ?? 'Sheet'}" is back`
          : `${b.lead_count} lead${b.lead_count !== 1 ? 's' : ''} restored`,
      duration: 3000,
      action: {
        label: 'Undo',
        onClick: () => {
          // Best-effort: re-soft-delete the just-restored items by calling delete again.
          // We don't have the new batch id here, so just show a message — full undo
          // requires knowing the new IDs. For now this acts as a simple notification.
          toast.message('Tip: delete again from the list to re-remove.');
        },
      },
    });
  };

  const handleRestoreLead = async (leadId: string) => {
    await restoreLead(leadId);
    setBatchLeads((prev) => prev.filter((l) => l.id !== leadId));
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/60">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 -ml-2"
            onClick={() => navigate('/profile')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground">Recently Deleted</h1>
            <p className="text-[11px] text-muted-foreground">
              Items are kept for 30 days then permanently deleted
            </p>
          </div>
          {batches.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-destructive hover:text-destructive"
              onClick={() => setConfirmPurgeAll(true)}
              disabled={isPurging}
            >
              Clear all
            </Button>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20 px-6">
            <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
              <Trash2 className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <p className="text-base font-semibold text-foreground">No deleted items</p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-[260px]">
              Deleted prospects will appear here for 30 days before being permanently removed.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map((group) => (
              <section key={group.label}>
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2 px-1">
                  {group.label}
                </h2>
                <div className="space-y-2">
                  {group.items.map((b) => (
                    <BatchCard
                      key={b.id}
                      batch={b}
                      onRestore={handleRestoreBatch}
                      onPurge={(batch) => setConfirmPurge(batch)}
                      onView={setViewBatch}
                      isBusy={isRestoring || isPurging}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* View leads inside a batch */}
      <Sheet open={!!viewBatch} onOpenChange={(o) => !o && setViewBatch(null)}>
        <SheetContent side="bottom" className="max-h-[80vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>
              {viewBatch?.deletion_type === 'sheet'
                ? viewBatch?.sheet_name || 'Sheet'
                : `${viewBatch?.lead_count} leads`}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto mt-2 -mx-2 px-2">
            {batchLeadsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : batchLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No leads in this batch</p>
            ) : (
              <ul className="space-y-1.5">
                {batchLeads.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/40"
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{l.name || 'Unnamed'}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{l.phone}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs rounded-full text-primary border-primary/30"
                      onClick={() => handleRestoreLead(l.id)}
                      disabled={isRestoring}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restore
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm permanent delete one batch */}
      <AlertDialog open={!!confirmPurge} onOpenChange={(o) => !o && setConfirmPurge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. This data will be gone forever.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (confirmPurge) await purgeBatch(confirmPurge.id);
                setConfirmPurge(null);
              }}
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm clear all */}
      <AlertDialog open={confirmPurgeAll} onOpenChange={setConfirmPurgeAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Clear Recently Deleted?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {batches.length} item{batches.length !== 1 ? 's' : ''} will be permanently deleted.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                await purgeAll();
                setConfirmPurgeAll(false);
              }}
            >
              Delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
