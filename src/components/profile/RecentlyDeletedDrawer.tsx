import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { useDeletedProspects } from '@/hooks/useDeletedProspects';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2, RotateCcw, Loader2, User, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecentlyDeletedDrawerProps {
  trigger: React.ReactNode;
}

export function RecentlyDeletedDrawer({ trigger }: RecentlyDeletedDrawerProps) {
  const [open, setOpen] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
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

  // Mask phone number for privacy
  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 4) return phone;
    return phone.slice(0, 2) + '***' + phone.slice(-2);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {trigger}
        </DrawerTrigger>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b border-border/50 pb-4">
            <DrawerTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Recently Deleted
            </DrawerTitle>
            <DrawerDescription>
              {count > 0 
                ? `${count} deleted prospect${count > 1 ? 's' : ''} • Auto-deleted after 30 days`
                : 'No deleted items'
              }
            </DrawerDescription>
          </DrawerHeader>

          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="p-4 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : deletedProspects.length === 0 ? (
                <div className="text-center py-12">
                  <Trash2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No deleted items</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Deleted prospects will appear here for 30 days
                  </p>
                </div>
              ) : (
                deletedProspects.map((prospect) => (
                  <div 
                    key={prospect.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div className="p-2 rounded-full bg-muted shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{prospect.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{maskPhone(prospect.phone)}</span>
                        <span>•</span>
                        <span>
                          Deleted {formatDistanceToNow(new Date((prospect as any).deleted_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => restore(prospect.id)}
                        disabled={isRestoring}
                      >
                        <RotateCcw className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => permanentDelete(prospect.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {count > 0 && (
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
