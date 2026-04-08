import { Crown, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { useSubscription } from '@/hooks/useSubscription';
import { usePaymentLinks } from '@/hooks/usePaymentLinks';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useMemo } from 'react';
import { TierCard } from '@/components/subscription/TierCard';

interface FunnelsUpgradeDrawerProps {
  triggerText?: string;
  trigger?: React.ReactNode;
  variant?: 'default' | 'compact';
}

export function FunnelsUpgradeDrawer({ triggerText, trigger, variant = 'default' }: FunnelsUpgradeDrawerProps) {
  const MOBILE_CHECKOUT_DELAY_MS = 320;
  const { isPaid, loading: subLoading } = useSubscription();
  const { initiatePayment, initiateSubscription, loading: paymentLoading } = useRazorpay();
  const { toast } = useToast();
  const { plans, loading: plansLoading } = usePaymentLinks();
  const { refetch } = useSubscription();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  // All paid plans as single "Pro" group
  const proPlans = useMemo(() => {
    return plans
      .filter(p => p.tier !== 'basic')
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [plans]);

  const defaultKey = proPlans.find(p => p.badgeText)?.plan_key || proPlans[0]?.plan_key || '';
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>(defaultKey);

  const selectedPlan = proPlans.find(p => p.plan_key === selectedPlanKey) || proPlans[0];

  const prepareForMobileCheckout = async () => {
    if (!isMobile) return;
    setOpen(false);
    await new Promise((resolve) => window.setTimeout(resolve, MOBILE_CHECKOUT_DELAY_MS));
  };

  const handleUpgrade = (planKey: string) => {
    const plan = plans.find(p => p.plan_key === planKey);
    if (plan?.billing_type === 'recurring') {
      initiateSubscription({
        planType: planKey,
        beforeOpen: prepareForMobileCheckout,
        onSuccess: () => { toast({ title: "Pro Plan Activated 🎉", description: "All features including Funnels are now unlocked!" }); refetch(); setOpen(false); },
        onError: (error) => console.error('Subscription error:', error),
      });
      return;
    }
    initiatePayment({
      planType: planKey,
      beforeOpen: prepareForMobileCheckout,
      onSuccess: () => { toast({ title: "Pro Plan Activated 🎉", description: "All features including Funnels are now unlocked!" }); refetch(); setOpen(false); },
      onError: (error) => console.error('Payment error:', error),
    });
  };

  if (subLoading || isPaid) return null;

  const TriggerButton = trigger || (
    variant === 'compact' ? (
      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/20">
        {triggerText || 'Upgrade'}
      </Button>
    ) : (
      <Button variant="default" size="sm" className="gap-2">
        <Crown className="h-4 w-4" />
        {triggerText || 'Upgrade'}
      </Button>
    )
  );

  const PlanContent = (
    <div className="space-y-4 p-1">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-primary/20">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Unlock All Features</h3>
          <p className="text-xs text-muted-foreground">Get access to Funnels, Analytics & more</p>
        </div>
      </div>

      {plansLoading ? (
        <div className="h-40 bg-muted animate-pulse rounded-xl" />
      ) : proPlans.length > 0 ? (
        <TierCard
          tierName="Pro"
          plans={proPlans}
          selectedPlanKey={selectedPlanKey}
          onSelectPlan={setSelectedPlanKey}
        />
      ) : null}

      <Button
        onClick={() => handleUpgrade(selectedPlanKey)}
        className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/30"
        disabled={paymentLoading || plansLoading || !selectedPlan}
      >
        {paymentLoading ? (
          <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Opening payment...</>
        ) : selectedPlan ? (
          <><Crown className="h-5 w-5 mr-2" />Get {selectedPlan.name} – ₹{selectedPlan.price}</>
        ) : (
          <><Crown className="h-5 w-5 mr-2" />Upgrade Now</>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Secure payment via Razorpay • Cancel anytime
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{TriggerButton}</DrawerTrigger>
        <DrawerContent className="px-4 pb-8">
          <DrawerHeader className="px-0">
            <DrawerTitle className="sr-only">Upgrade to Pro</DrawerTitle>
          </DrawerHeader>
          {PlanContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{TriggerButton}</SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle className="sr-only">Upgrade to Pro</SheetTitle>
        </SheetHeader>
        {PlanContent}
      </SheetContent>
    </Sheet>
  );
}
