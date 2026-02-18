import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Crown, ShieldCheck, Clock, UserX, Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { logAdminAction } from '@/hooks/useAuditLogs';
import { format } from 'date-fns';

type FilterType = 'all' | 'active' | 'expired' | 'override';

export function FunnelsSubscribersTable() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const queryClient = useQueryClient();

  // Fetch existing funnel subscribers
  const { data: subscribers, isLoading: subsLoading } = useQuery({
    queryKey: ['admin-funnels-subscribers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_funnel_subscriptions')
        .select('*, profiles!inner(display_name, email, neverai_id)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  // Fetch all profiles for "Add User" search
  const { data: allProfiles } = useQuery({
    queryKey: ['admin-all-profiles-for-funnels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, neverai_id')
        .order('display_name');
      if (error) throw error;
      return data;
    },
    enabled: showSearch,
    staleTime: 60_000,
  });

  const subscriberUserIds = new Set((subscribers || []).map((s: any) => s.user_id));

  // Users not yet in the subscribers table, filtered by search
  const unsubscribedUsers = (allProfiles || [])
    .filter((p: any) => !subscriberUserIds.has(p.user_id))
    .filter((p: any) => {
      if (!searchQuery.trim()) return false;
      const q = searchQuery.toLowerCase();
      return (
        p.display_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.neverai_id?.toLowerCase().includes(q)
      );
    });

  const filtered = (subscribers || []).filter((s: any) => {
    if (filter === 'active') return s.status === 'active' && (!s.expires_at || new Date(s.expires_at) > new Date());
    if (filter === 'expired') return s.expires_at && new Date(s.expires_at) <= new Date();
    if (filter === 'override') return s.is_admin_override;
    return true;
  });

  const handleRevoke = async (sub: any) => {
    try {
      const { error } = await supabase
        .from('user_funnel_subscriptions')
        .update({ status: 'cancelled', plan: 'free' })
        .eq('user_id', sub.user_id);
      if (error) throw error;
      const name = sub.profiles?.display_name || sub.display_name || sub.user_id;
      await logAdminAction('funnel_pro_revoked', 'user', sub.user_id, { plan: sub.plan }, { plan: 'free' }, `Revoked Funnels Pro from ${name}`);
      toast.success('Funnels Pro revoked');
      queryClient.invalidateQueries({ queryKey: ['admin-funnels-subscribers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-funnels-stats'] });
    } catch (err) {
      console.error('Revoke error:', err);
      toast.error('Failed to revoke');
    }
  };

  const handleGrant = async (userId: string, displayName?: string) => {
    try {
      const { error } = await supabase
        .from('user_funnel_subscriptions')
        .upsert(
          {
            user_id: userId,
            status: 'active',
            plan: 'pro',
            is_admin_override: true,
          },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
      await logAdminAction('funnel_pro_granted', 'user', userId, { plan: 'free' }, { plan: 'pro' }, `Granted Funnels Pro to ${displayName || userId}`);
      toast.success('Funnels Pro granted');
      setSearchQuery('');
      queryClient.invalidateQueries({ queryKey: ['admin-funnels-subscribers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-funnels-stats'] });
    } catch (err) {
      console.error('Grant error:', err);
      toast.error('Failed to grant');
    }
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'expired', label: 'Expired' },
    { key: 'override', label: 'Admin' },
  ];

  if (subsLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Funnels Subscribers</h3>
        <div className="flex gap-1 items-center">
          <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => setShowSearch(!showSearch)}>
            <UserPlus className="h-3 w-3 mr-1" /> Add User
          </Button>
          {filters.map(f => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? 'default' : 'ghost'}
              className="text-[10px] h-6 px-2"
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Add User Search */}
      {showSearch && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>
          {unsubscribedUsers.length > 0 && (
            <div className="grid gap-1 max-h-40 overflow-y-auto">
              {unsubscribedUsers.slice(0, 10).map((p: any) => (
                <Card key={p.user_id} className="p-2 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{p.display_name || 'Unknown'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.email}</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-[10px] h-6" onClick={() => handleGrant(p.user_id, p.display_name)}>
                    <Crown className="h-3 w-3 mr-1" /> Grant Pro
                  </Button>
                </Card>
              ))}
            </div>
          )}
          {searchQuery.trim() && unsubscribedUsers.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-2">No matching users found</p>
          )}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No subscribers found</p>
      )}

      <div className="grid gap-2">
        {filtered.map((sub: any) => {
          const isExpired = sub.expires_at && new Date(sub.expires_at) <= new Date();
          const isPro = sub.plan === 'pro' && sub.status === 'active' && !isExpired;
          const profile = sub.profiles;

          return (
            <Card key={sub.id} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{profile?.display_name || 'Unknown'}</span>
                    {isPro && (
                      <Badge className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-400 border-0">
                        <Crown className="h-2.5 w-2.5 mr-0.5" /> PRO
                      </Badge>
                    )}
                    {sub.is_admin_override && (
                      <Badge variant="outline" className="text-[10px]">
                        <ShieldCheck className="h-2.5 w-2.5 mr-0.5" /> Admin
                      </Badge>
                    )}
                    {isExpired && (
                      <Badge variant="destructive" className="text-[10px]">
                        <Clock className="h-2.5 w-2.5 mr-0.5" /> Expired
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{profile?.email}</p>
                  {sub.expires_at && (
                    <p className="text-[10px] text-muted-foreground">
                      Expires: {format(new Date(sub.expires_at), 'dd MMM yyyy')}
                    </p>
                  )}
                </div>
                <div>
                  {isPro ? (
                    <Button size="sm" variant="destructive" className="text-[10px] h-7" onClick={() => handleRevoke(sub)}>
                      <UserX className="h-3 w-3 mr-1" /> Revoke
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => handleGrant(sub.user_id, profile?.display_name)}>
                      <Crown className="h-3 w-3 mr-1" /> Grant Pro
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
