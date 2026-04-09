import { useState } from 'react';
import { useAuditLogs, AuditLog } from '@/hooks/useAuditLogs';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ChevronLeft, ChevronRight, History, ChevronDown, ChevronUp, Settings, UserX, UserCheck, Plus, Edit, Trash2, Shield, Bell } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const ACTION_TYPES = [
  { value: 'all', label: 'All Actions' },
  { value: 'plan_created', label: 'Plan Created' },
  { value: 'plan_updated', label: 'Plan Updated' },
  { value: 'plan_deleted', label: 'Plan Deleted' },
  { value: 'limit_updated', label: 'Limit Updated' },
  { value: 'feature_flag_updated', label: 'Feature Flag Updated' },
  { value: 'offer_created', label: 'Offer Created' },
  { value: 'offer_updated', label: 'Offer Updated' },
  { value: 'user_pro_granted', label: 'Pro Access Granted' },
  { value: 'user_pro_revoked', label: 'Pro Access Revoked' },
  { value: 'user_override_set', label: 'User Override Set' },
  { value: 'user_suspended', label: 'User Suspended' },
  { value: 'user_unsuspended', label: 'User Unsuspended' },
];

const TARGET_TYPES = [
  { value: 'all', label: 'All Targets' },
  { value: 'plan', label: 'Plans' },
  { value: 'user', label: 'Users' },
  { value: 'limit', label: 'Limits' },
  { value: 'feature', label: 'Features' },
  { value: 'offer', label: 'Offers' },
];

function getActionIcon(actionType: string) {
  if (actionType.includes('created')) return <Plus className="h-3.5 w-3.5 text-green-600" />;
  if (actionType.includes('deleted') || actionType.includes('revoked')) return <Trash2 className="h-3.5 w-3.5 text-destructive" />;
  if (actionType.includes('updated')) return <Edit className="h-3.5 w-3.5 text-blue-500" />;
  if (actionType.includes('suspended')) return <UserX className="h-3.5 w-3.5 text-destructive" />;
  if (actionType.includes('unsuspended') || actionType.includes('granted')) return <UserCheck className="h-3.5 w-3.5 text-green-600" />;
  if (actionType.includes('override')) return <Shield className="h-3.5 w-3.5 text-amber-500" />;
  return <Settings className="h-3.5 w-3.5 text-muted-foreground" />;
}

function getActionColor(actionType: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (actionType.includes('created') || actionType.includes('granted')) return 'default';
  if (actionType.includes('deleted') || actionType.includes('suspended') || actionType.includes('revoked')) return 'destructive';
  if (actionType.includes('updated')) return 'secondary';
  return 'outline';
}

function ExpandableDetails({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  if (!log.old_value && !log.new_value) return null;

  return (
    <>
      <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1 mt-0.5" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronUp className="h-3 w-3 mr-0.5" /> : <ChevronDown className="h-3 w-3 mr-0.5" />}
        {expanded ? 'Hide' : 'Details'}
      </Button>
      {expanded && (
        <div className="mt-1.5 p-2.5 bg-muted/60 rounded-lg text-[10px] font-mono space-y-1 border border-border/30">
          {log.old_value && (
            <div>
              <span className="text-destructive font-semibold">Before: </span>
              <pre className="whitespace-pre-wrap inline text-muted-foreground">{JSON.stringify(log.old_value, null, 2)}</pre>
            </div>
          )}
          {log.new_value && (
            <div>
              <span className="text-green-600 font-semibold">After: </span>
              <pre className="whitespace-pre-wrap inline text-muted-foreground">{JSON.stringify(log.new_value, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/30 bg-card">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AuditLogViewer() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [targetFilter, setTargetFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading, error, refetch } = useAuditLogs({
    limit: pageSize,
    offset: page * pageSize,
    actionType: actionFilter === 'all' ? null : actionFilter,
    targetType: targetFilter === 'all' ? null : targetFilter,
  });

  const totalPages = Math.ceil((data?.totalCount || 0) / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Audit Log</h2>
          {data?.totalCount !== undefined && (
            <Badge variant="secondary" className="text-[10px]">{data.totalCount} entries</Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={targetFilter} onValueChange={(v) => { setTargetFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue placeholder="Filter by target" />
          </SelectTrigger>
          <SelectContent>
            {TARGET_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <Card className="p-6 text-center space-y-3 border-destructive/20 bg-destructive/5">
          <div className="text-destructive text-sm font-medium">Failed to load audit logs</div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {error instanceof Error ? error.message : 'An unknown error occurred. Check that admin role is configured correctly.'}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </Card>
      ) : data?.logs.length === 0 ? (
        <Card className="p-8 text-center border-border/30">
          <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No audit logs found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Actions performed in the admin panel will appear here</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {data?.logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/30 bg-card hover:bg-muted/30 transition-colors">
              {/* Action Icon */}
              <div className="mt-0.5 p-1.5 rounded-full bg-muted/60 shrink-0">
                {getActionIcon(log.action_type)}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getActionColor(log.action_type)} className="text-[10px]">
                    {log.action_type.replace(/_/g, ' ')}
                  </Badge>
                  <Badge variant="outline" className="text-[9px]">{log.target_type}</Badge>
                </div>
                <p className="text-xs mt-1 text-foreground leading-relaxed">{log.description}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  by {log.admin_email || 'Unknown'} · {format(new Date(log.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                  <span className="ml-1 opacity-60">({formatDistanceToNow(new Date(log.created_at), { addSuffix: true })})</span>
                </p>
                <ExpandableDetails log={log} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-muted-foreground">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, data?.totalCount || 0)} of {data?.totalCount}
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-7" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
