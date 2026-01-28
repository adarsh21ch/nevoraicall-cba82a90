import { useAdminFeatureFlags } from '@/hooks/useAdminConfig';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Users, Crown, Power } from 'lucide-react';
import { toast } from 'sonner';

export function FeatureFlagsManager() {
  const { flags, loading, updateFlag } = useAdminFeatureFlags();

  const handleToggle = async (
    id: string, 
    field: 'free_access' | 'pro_access' | 'is_enabled', 
    value: boolean
  ) => {
    try {
      await updateFlag(id, { [field]: value });
      toast.success('Feature flag updated');
    } catch (err) {
      toast.error('Failed to update feature flag');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Feature Flags</h2>
        <p className="text-sm text-muted-foreground">Control feature access for free and pro users</p>
      </div>

      <div className="grid gap-3">
        {flags.map((flag) => (
          <Card key={flag.id} className={`p-4 ${!flag.is_enabled ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{flag.feature_name}</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {flag.feature_key}
                  </Badge>
                  {!flag.is_enabled && (
                    <Badge variant="destructive" className="text-xs">
                      Disabled
                    </Badge>
                  )}
                </div>
                {flag.description && (
                  <p className="text-xs text-muted-foreground mb-3">{flag.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-4">
                  {/* Global Enable */}
                  <div className="flex items-center gap-2">
                    <Power className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Enabled</span>
                    <Switch
                      checked={flag.is_enabled}
                      onCheckedChange={(value) => handleToggle(flag.id, 'is_enabled', value)}
                      aria-label="Toggle feature"
                    />
                  </div>

                  <div className="h-4 w-px bg-border" />

                  {/* Free Access */}
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Free</span>
                    <Switch
                      checked={flag.free_access}
                      onCheckedChange={(value) => handleToggle(flag.id, 'free_access', value)}
                      disabled={!flag.is_enabled}
                      aria-label="Free user access"
                    />
                  </div>

                  {/* Pro Access */}
                  <div className="flex items-center gap-2">
                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs text-muted-foreground">Pro</span>
                    <Switch
                      checked={flag.pro_access}
                      onCheckedChange={(value) => handleToggle(flag.id, 'pro_access', value)}
                      disabled={!flag.is_enabled}
                      aria-label="Pro user access"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {flags.length === 0 && (
        <Card className="p-8 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">No feature flags configured</p>
        </Card>
      )}
    </div>
  );
}
