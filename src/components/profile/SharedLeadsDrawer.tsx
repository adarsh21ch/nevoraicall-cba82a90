import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, ChevronDown, Download, Eye, Package } from 'lucide-react';
import { useSharedLeads, SharedLeadRecord } from '@/hooks/useSharedLeads';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SharedLeadsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ShareGroup({ share, onImport }: { share: SharedLeadRecord; onImport: (id: string) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [importing, setImporting] = useState(false);
  const isPending = share.status === 'pending';
  const leadCount = share.lead_data?.length || 0;

  const handleImport = async () => {
    setImporting(true);
    await onImport(share.id);
    setImporting(false);
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{share.sender_name || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(share.created_at), 'dd MMM yyyy, hh:mm a')}
            </p>
          </div>
          {isPending ? (
            <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
              {leadCount} Lead{leadCount !== 1 ? 's' : ''}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              Imported
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isPending && (
            <Button size="sm" onClick={handleImport} disabled={importing} className="gap-1.5 flex-1">
              {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Import
            </Button>
          )}
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5 flex-1">
                <Eye className="h-3.5 w-3.5" />
                View
                <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </div>

      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleContent>
          <div className="border-t border-border/50 px-4 py-3 space-y-2 max-h-48 overflow-y-auto bg-muted/30">
            {share.lead_data?.map((lead: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
                <span className="font-medium truncate flex-1">{lead.name || 'Unknown'}</span>
                <span className="text-muted-foreground text-xs ml-2 shrink-0">{lead.phone || '-'}</span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function SharedLeadsDrawer({ open, onOpenChange }: SharedLeadsDrawerProps) {
  const { pendingShares, loading, importSharedLeads } = useSharedLeads();

  const handleImport = async (shareId: string) => {
    const result = await importSharedLeads(shareId);
    if (result.imported > 0 && result.skipped > 0) {
      toast.success(`${result.imported} leads imported, ${result.skipped} duplicates skipped`);
    } else if (result.imported > 0) {
      toast.success(`${result.imported} leads imported successfully`);
    } else if (result.skipped > 0) {
      toast.info(`All ${result.skipped} leads already exist in your list`);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Shared Leads</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingShares.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No shared leads yet</p>
              <p className="text-xs text-muted-foreground/70">Leads shared by your team will appear here</p>
            </div>
          ) : (
            pendingShares.map(share => (
              <ShareGroup key={share.id} share={share} onImport={handleImport} />
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
