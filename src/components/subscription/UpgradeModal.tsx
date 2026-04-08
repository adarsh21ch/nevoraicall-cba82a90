import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Crown, AlertTriangle, X, Shield, Loader2 } from 'lucide-react';
import { usePaymentLinks } from '@/hooks/usePaymentLinks';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { useEffect, useMemo, useState } from 'react';
import { TierCard } from './TierCard';
import { useIsMobile } from '@/hooks/use-mobile';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  currentLeadCount?: number;
  hasTeamFeatures?: boolean;
  appContext?: 'nevorai' | 'trackup';
  title?: string;
  description?: string;
}

export function UpgradeModal({
  open, onClose, currentLeadCount, hasTeamFeatures = false,
  appContext = 'nevorai', title, description,
}: UpgradeModalProps) {
  const MOBILE_CHECKOUT_DELAY_MS = 320;
  const { initiatePayment, initiateSubscription, loading: paymentLoading } = useRazorpay();
  const { toast } = useToast();
  const { refetch } = useSubscription();
  const { plans, loading: plansLoading } = usePaymentLinks();
  const { config } = useAdminConfig();
  const isMobile = useIsMobile();

  const freeLimit = config.limits.hard_limit ?? config.limits.free_total_leads;
  const isAtLimit = currentLeadCount !== undefined && freeLimit !== undefined
    ? currentLeadCount >= freeLimit : false;

  const proPlans = useMemo(() => {
    return plans
      .filter(p => p.tier !== 'basic')
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [plans]);

  const defaultKey = proPlans.find(p => p.badgeText)?.plan_key || proPlans[0]?.plan_key || '';
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>(defaultKey);

  useEffect(() => {
    if (!open) return;
    const next = proPlans.find(p => p.badgeText)?.plan_key || proPlans[0]?.plan_key;
    if (next) setSelectedPlanKey(next);
  }, [open, proPlans]);

  const selectedPlan = proPlans.find(p => p.plan_key === selectedPlanKey) || proPlans[0];

  const prepareForMobileCheckout = async () => {
    if (!isMobile) return;
    onClose();
    await new Promise((resolve) => window.setTimeout(resolve, MOBILE_CHECKOUT_DELAY_MS));
  };

  const handleUpgrade = (planKey: string) => {
    const plan = plans.find(p => p.plan_key === planKey);
    if (plan?.billing_type === 'recurring') {
      initiateSubscription({
        planType: planKey,
        beforeOpen: prepareForMobileCheckout,
        onSuccess: () => { toast({ title: "Pro Plan Activated 🎉", description: "Your subscription has been started." }); refetch(); onClose(); },
        onError: (error) => console.error('Subscription error:', error),
      });
      return;
    }
    initiatePayment({
      planType: planKey,
      beforeOpen: prepareForMobileCheckout,
      onSuccess: () => { toast({ title: "Pro Plan Activated 🎉", description: "All features are now unlocked." }); refetch(); onClose(); },
      onError: (error) => console.error('Payment error:', error),
    });
  };

  const modalTitle = title || (isAtLimit ? 'Lead Limit Reached' : 'Upgrade to Pro');
  const modalDescription = description || (
    isAtLimit
      ? `You've reached the free limit of ${freeLimit ?? ''} prospects. Upgrade to continue.`
      : 'Unlock the full Nevorai workflow'
  );

  const ModalBody = (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
          {isAtLimit ? (
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          ) : (
            <Crown className="h-6 w-6 text-primary" />
          )}
        </div>
        <h3 className="font-bold text-xl text-foreground tracking-tight">{modalTitle}</h3>
        <p className="text-sm text-muted-foreground">{modalDescription}</p>
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {plansLoading ? (
        <div className="h-40 bg-muted/50 animate-pulse rounded-xl" />
      ) : proPlans.length > 0 ? (
        <TierCard
          tierName="Pro"
          plans={proPlans}
          selectedPlanKey={selectedPlanKey}
          onSelectPlan={setSelectedPlanKey}
          compact={isMobile}
        />
      ) : null}

      {/* CTA */}
      <Button
        onClick={() => selectedPlan && handleUpgrade(selectedPlanKey)}
        className="w-full h-12 rounded-xl text-base font-semibold"
        size="lg"
        disabled={paymentLoading || plansLoading}
      >
        {paymentLoading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
        ) : (
          <>Upgrade to Pro</>
        )}
      </Button>

      {/* Trust footer */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Shield className="h-3 w-3" />
        <span>Secure payment via Razorpay</span>
        <span className="text-muted-foreground/40">·</span>
        <span>Cancel anytime</span>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onClose} dismissible={false}>
        <DrawerContent className="max-h-[98vh] flex flex-col outline-none">
          <div className="shrink-0 px-4 pt-2 pb-1">
            <div className="flex items-center justify-between mb-1">
              <div className="w-8" />
              <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
            {ModalBody}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border p-6 flex flex-col max-h-[90vh]">
        <DialogHeader className="sr-only">
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>{modalDescription}</DialogDescription>
        </DialogHeader>
        {ModalBody}
      </DialogContent>
    </Dialog>
  );
}
