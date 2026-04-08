import { useState, useMemo } from 'react';
import { formatDistanceToNow, differenceInDays, isAfter, subDays } from 'date-fns';
import { useDeletedProspects } from '@/hooks/useDeletedProspects';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2, RotateCcw, Loader2, User, AlertTriangle, CheckSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RecentlyDeletedDrawerProps {
  trigger: React.ReactNode;
}

type FilterTab = 'all' | 'week' | 'month';

export function RecentlyDeletedDrawer({ trigger }: RecentlyDeletedDrawerProps) {
  const [open, setOpen] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmRestore, setConfirmRestore] = useState<{ id: string; name: string; sheetName?: string } | null>(null);
  
  const { 
    deletedProspects, 
    loading, 
    count,
    restore, 
    restoreAll, 
    permanentDelete, 
    permanentDeleteAll,
    isRestoring,
    isDeleting 
  } = useDeletedProspects();

  // Filter prospects by time range
  const filteredProspects = useMemo(() => {
    const now = new Date();
    switch (filterTab) {
      case 'week':
        return deletedProspects.filter(p => {
          const deletedAt = new Date((p as any).deleted_at);
          return isAfter(deletedAt, subDays(now, 7));
        });
      case 'month':
        return deletedProspects.filter(p => {
          const deletedAt = new Date((p as any).deleted_at);
          return isAfter(deletedAt, subDays(now, 30));
        });
      default:
        return deletedProspects;
    }
  }, [deletedProspects, filterTab]);

  // Mask phone number for privacy
  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 4) return phone;
    return phone.slice(0, 2) + '***' + phone.slice(-2);
  };

  // Calculate days remaining until 30-day expiry
  const getDaysRemaining = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
    return Math.max(0, differenceInDays(expiry, new Date()));
  };

  const getExpiryColor = (daysLeft: number) => {
    if (daysLeft <= 3) return 'bg-destructive/20 text-destructive';
    if (daysLeft <= 10) return 'bg-orange-500/20 text-orange-600';
    return 'bg-primary/10 text-primary';
  };

  const getProgressColor = (daysLeft: number) => {
    if (daysLeft <= 3) return 'bg-destructive';
    if (daysLeft <= 10) return 'bg-orange-500';
    return 'bg-primary';
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return;
    let restored = 0;
    for (const id of selectedIds) {
      try {
        await restore(id);
        restored++;
      } catch {}
    }
    if (restored > 0) toast.success(`${restored} lead(s) restored`);
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const handleRestoreConfirm = async () => {
    if (!confirmRestore) return;
    await restore(confirmRestore.id);
    setConfirmRestore(null);
  };

  // One-time banner for historical data
  const [bannerDismissed] = useState(() => {
    try { return localStorage.getItem('recentlyDeletedBannerDismissed') === '1'; } catch { return false; }
  });
  const dismissBanner = () => {
    try { localStorage.setItem('recentlyDeletedBannerDismissed', '1'); } catch {}
  };

  const filterTabs: { value: FilterTab; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
  ];

  return (
    <>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {trigger}
        </DrawerTrigger>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  Recently Deleted
                </DrawerTitle>
                <DrawerDescription>
                  {count > 0 
                    ? `${count} deleted lead${count > 1 ? 's' : ''} • Auto-deleted after 30 days`
                    : 'No deleted items'
                  }
                </DrawerDescription>
              </div>
              {count > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
                >
                  {selectMode ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                  <span className="ml-1">{selectMode ? 'Cancel' : 'Select'}</span>
                </Button>
              )}
            </div>

            {/* Filter tabs */}
            {count > 0 && (
              <div className="flex items-center gap-1.5 mt-3">
                {filterTabs.map(tab => (
                  <button
                    key={tab.value}
                    onClick={() => setFilterTab(tab.value)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                      filterTab === tab.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </DrawerHeader>

          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="p-4 space-y-2">
              {/* Historical data banner */}
              {!bannerDismissed && count > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 mb-3">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-orange-700 dark:text-orange-400">
                      Leads deleted before today may not appear here. This is a known issue we've now fixed going forward.
                    </p>
                  </div>
                  <button onClick={dismissBanner} className="text-orange-500 hover:text-orange-700">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProspects.length === 0 ? (
                <div className="text-center py-12">
                  <Trash2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No deleted items</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Deleted prospects will appear here for 30 days
                  </p>
                </div>
              ) : (
                filteredProspects.map((prospect) => {
                  const deletedAt = (prospect as any).deleted_at;
                  const daysLeft = getDaysRemaining(deletedAt);
                  const progressPercent = (daysLeft / 30) * 100;

                  return (
                    <div 
                      key={prospect.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                    >
                      {selectMode && (
                        <Checkbox
                          checked={selectedIds.has(prospect.id)}
                          onCheckedChange={() => handleToggleSelect(prospect.id)}
                          className="mt-1"
                        />
                      )}
                      <div className="p-2 rounded-full bg-muted shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-sm font-semibold truncate">{prospect.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>📱 {maskPhone(prospect.phone)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          🕐 Deleted {formatDistanceToNow(new Date(deletedAt), { addSuffix: true })}
                        </div>
                        {/* Expiry indicator */}
                        {daysLeft <= 7 && (
                          <span className={cn("inline-block px-1.5 py-0.5 rounded text-[11px] font-medium", getExpiryColor(daysLeft))}>
                            Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                          </span>
                        )}
                        {/* 30-day progress bar */}
                        <div className="w-full h-[3px] rounded-full bg-muted overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full transition-all", getProgressColor(daysLeft))}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                      {!selectMode && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs text-primary border-primary/30"
                            onClick={() => setConfirmRestore({ id: prospect.id, name: prospect.name })}
                            disabled={isRestoring}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Restore
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => permanentDelete(prospect.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Bulk restore bar when in select mode */}
          {selectMode && selectedIds.size > 0 && (
            <div className="border-t border-border/50 px-4 py-3">
              <Button
                className="w-full"
                onClick={handleBulkRestore}
                disabled={isRestoring || selectedIds.size > 20}
              >
                {isRestoring ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Restore {selectedIds.size} Selected {selectedIds.size > 20 ? '(max 20)' : ''}
              </Button>
            </div>
          )}

          {count > 0 && !selectMode && (
            <DrawerFooter className="border-t border-border/50 pt-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => restoreAll()}
                  disabled={isRestoring}
                >
                  {isRestoring ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  Restore All
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setConfirmDeleteAll(true)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete All
                </Button>
              </div>
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>

      {/* Restore Confirmation */}
      <AlertDialog open={!!confirmRestore} onOpenChange={(o) => !o && setConfirmRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore "{confirmRestore?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This lead will be added back to its original sheet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreConfirm}>
              Restore Lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete All Dialog */}
      <AlertDialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Permanently Delete All?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {count} prospect{count > 1 ? 's' : ''}. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                permanentDeleteAll();
                setConfirmDeleteAll(false);
              }}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
