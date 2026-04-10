import { useState } from 'react';
import { Crown, Clock, AlertTriangle, X } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeDrawer } from './UpgradeDrawer';
import { cn } from '@/lib/utils';

/**
 * Smart banner that shows:
 * - Nothing for active Pro users with >7 days left
 * - Amber warning when Pro expires within 7 days
 * - Red alert when Pro has expired, with renew CTA
 * - Nothing for free users who never had Pro
 */
export function SubscriptionStatusBanner({ className }: { className?: string }) {
  const { subscription, isPaid, daysRemaining, loading } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (loading || dismissed) return null;

  // Detect "was Pro but expired"
  const rawPlan = (subscription?.plan as string) || '';
  const rawStatus = (subscription?.status as string) || '';
  const expiresAt = subscription?.expires_at ? new Date(subscription.expires_at) : null;
  const isExpired = !isPaid && expiresAt && expiresAt <= new Date() && 
    (rawPlan === 'pro' || rawPlan === 'mini' || rawStatus === 'expired');

  // Detect "Pro but expiring soon" (within 7 days)
  const isExpiringSoon = isPaid && daysRemaining > 0 && daysRemaining <= 7;

  if (!isExpired && !isExpiringSoon) return null;

  // Session-based dismiss for warning (not for expired)
  const dismissKey = isExpired ? null : 'sub_expiry_warning_dismissed';
  if (dismissKey) {
    try {
      const today = new Date().toISOString().split('T')[0];
      if (sessionStorage.getItem(dismissKey) === today) return null;
    } catch {}
  }

  const handleDismiss = () => {
    if (dismissKey) {
      try {
        const today = new Date().toISOString().split('T')[0];
        sessionStorage.setItem(dismissKey, today);
      } catch {}
    }
    setDismissed(true);
  };

  if (isExpired) {
    return (
      <div className={cn(
        "w-full rounded-lg px-3 py-2.5 border flex items-center justify-between gap-2",
        "bg-destructive/10 border-destructive/30",
        className
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-full bg-destructive/20 shrink-0">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-destructive truncate">
              Your Pro plan has expired
            </p>
            <p className="text-[10px] text-destructive/70">
              Renew to restore unlimited leads & all features
            </p>
          </div>
        </div>
        <UpgradeDrawer variant="compact" triggerText="Renew Pro" />
      </div>
    );
  }

  // Expiring soon
  return (
    <div className={cn(
      "w-full rounded-lg px-3 py-2 border flex items-center justify-between gap-2",
      "bg-amber-500/10 border-amber-500/30",
      className
    )}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1 rounded-full bg-amber-500/20 shrink-0">
          <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <p className="text-xs font-medium text-amber-700 dark:text-amber-300 truncate">
          Pro expires in {daysRemaining} day{daysRemaining === 1 ? '' : 's'} — renew to keep access
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <UpgradeDrawer variant="compact" triggerText="Renew" />
        <button onClick={handleDismiss} className="p-1 rounded hover:bg-amber-500/10">
          <X className="h-3.5 w-3.5 text-amber-600/60" />
        </button>
      </div>
    </div>
  );
}
