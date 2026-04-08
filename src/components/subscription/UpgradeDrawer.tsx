import { Crown, Tag, Loader2, Shield, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { useSubscription } from '@/hooks/useSubscription';
import { usePermissions } from '@/contexts/PermissionsContext';
import { usePaymentLinks, PlanConfig } from '@/hooks/usePaymentLinks';
import { useAdminConfig, Offer } from '@/hooks/useAdminConfig';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useMemo } from 'react';
import { TierCard } from './TierCard';

interface UpgradeDrawerProps {
  variant?: 'default' | 'prominent' | 'compact';
  triggerText?: string;
}

export function UpgradeDrawer({ variant = 'default', triggerText }: UpgradeDrawerProps) {
  const MOBILE_CHECKOUT_DELAY_MS = 320;
  const { isPaid: permPaid, isLoading: permLoading } = usePermissions();
  const { initiatePayment, initiateSubscription, loading: paymentLoading } = useRazorpay();
  const { toast } = useToast();
  const { refetch } = useSubscription();
  const { plans, loading: plansLoading } = usePaymentLinks();
  const { config } = useAdminConfig();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const proPlans = useMemo(() => {
    return plans
      .filter(p => !p.plan_key.startsWith('funnels_') && p.tier !== 'basic')
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [plans]);

  const defaultKey = proPlans.find(p => p.badgeText)?.plan_key || proPlans[0]?.plan_key || '';
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>(defaultKey);

  const [couponCode, setCouponCode] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const activeOffers = useMemo(() => {
    const now = new Date();
    return config.offers.filter(o =>
      o.is_active && o.promo_code &&
      new Date(o.start_date) <= now && new Date(o.end_date) >= now
    );
  }, [config.offers]);

  const offersForSelectedPlan = useMemo(() => {
    const selectedPlan = plans.find(p => p.plan_key === selectedPlanKey);
    if (!selectedPlan) return [];
    return activeOffers.filter(o => o.applicable_plan_ids.includes(selectedPlan.id));
  }, [activeOffers, plans, selectedPlanKey]);

  const hasOffersForPlan = offersForSelectedPlan.length > 0;
  const selectedPlan = proPlans.find(p => p.plan_key === selectedPlanKey) || proPlans[0];

  const prepareForMobileCheckout = async () => {
    if (!isMobile) return;
    setOpen(false);
    await new Promise((resolve) => window.setTimeout(resolve, MOBILE_CHECKOUT_DELAY_MS));
  };

  const validateCoupon = () => {
    if (!couponCode.trim()) { setCouponError('Please enter a coupon code'); return; }
    setValidatingCoupon(true);
    setCouponError(null);
    setTimeout(() => {
      const matchedOffer = activeOffers.find(
        o => o.promo_code?.toUpperCase() === couponCode.trim().toUpperCase()
      );
      if (matchedOffer) {
        const sp = plans.find(p => p.plan_key === selectedPlanKey);
        if (sp && matchedOffer.applicable_plan_ids.includes(sp.id)) {
          setAppliedOffer(matchedOffer);
          toast({ title: "Coupon Applied! 🎉", description: `${matchedOffer.discount_value}% discount activated` });
        } else {
          setCouponError('This coupon is not valid for the selected plan');
          setAppliedOffer(null);
        }
      } else {
        setCouponError('Invalid or expired coupon code');
        setAppliedOffer(null);
      }
      setValidatingCoupon(false);
    }, 500);
  };

  const removeCoupon = () => { setAppliedOffer(null); setCouponCode(''); setCouponError(null); };

  const getDisplayPrice = (plan: PlanConfig) => {
    if (appliedOffer && appliedOffer.applicable_plan_ids.includes(plan.id)) {
      if (appliedOffer.discount_type === 'percent') {
        return Math.round(plan.price * (1 - appliedOffer.discount_value / 100));
      }
      return Math.max(0, plan.price - appliedOffer.discount_value);
    }
    return plan.price;
  };

  const handleUpgrade = (planKey: string) => {
    const plan = plans.find(p => p.plan_key === planKey);
    if (plan?.billing_type === 'recurring') {
      initiateSubscription({
        planType: planKey,
        beforeOpen: prepareForMobileCheckout,
        onSuccess: () => {
          toast({ title: "Pro Plan Activated 🎉", description: "Your subscription has been started." });
          refetch(); setOpen(false);
        },
        onError: (error) => console.error('Subscription error:', error),
      });
      return;
    }
    const offerDetails = appliedOffer && plan ? {
      offerId: appliedOffer.id,
      promoCode: appliedOffer.promo_code || '',
      discountType: appliedOffer.discount_type as 'percent' | 'fixed',
      discountValue: appliedOffer.discount_value,
      discountedAmount: getDisplayPrice(plan),
    } : undefined;
    initiatePayment({
      planType: planKey,
      offer: offerDetails,
      beforeOpen: prepareForMobileCheckout,
      onSuccess: () => {
        toast({ title: "Pro Plan Activated 🎉", description: "All features are now unlocked." });
        refetch(); setOpen(false);
      },
      onError: (error) => console.error('Payment error:', error),
    });
  };

  const handlePlanChange = (planKey: string) => {
    setSelectedPlanKey(planKey);
    if (appliedOffer) {
      const newPlan = plans.find(p => p.plan_key === planKey);
      if (newPlan && !appliedOffer.applicable_plan_ids.includes(newPlan.id)) {
        removeCoupon();
        toast({ title: "Coupon Removed", description: "The coupon is not valid for this plan", variant: "destructive" });
      }
    }
  };

  if (permLoading || permPaid) return null;

  const buttonText = triggerText || 'Upgrade Now';

  const TriggerButton = variant === 'compact' ? (
    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-medium text-primary hover:bg-primary/5">
      {buttonText}
    </Button>
  ) : variant === 'prominent' ? (
    <button className="w-full rounded-xl px-3 py-2.5 bg-primary/5 border border-primary/15 flex items-center gap-2 transition-all duration-200 hover:bg-primary/8 hover:border-primary/25 active:scale-[0.99]">
      <Crown className="h-4 w-4 text-primary shrink-0" />
      <span className="font-semibold text-sm text-foreground">{buttonText}</span>
      <Lock className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
    </button>
  ) : (
    <Button variant="outline" size="sm" className="gap-2 text-foreground hover:bg-primary/5">
      <Crown className="h-4 w-4 text-primary" />
      {buttonText}
    </Button>
  );

  const PlanContent = (
    <div className="space-y-6 px-1">
      {/* Header */}
      <div className="text-center space-y-1.5 pt-2">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
          <Crown className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-bold text-xl text-foreground tracking-tight">Upgrade to Pro</h3>
        <p className="text-sm text-muted-foreground">Unlock the full Nevorai workflow</p>
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
          onSelectPlan={handlePlanChange}
        />
      ) : null}

      {/* Coupon Code Section */}
      {hasOffersForPlan && (
        <div>
          {appliedOffer ? (
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  {appliedOffer.promo_code} – {appliedOffer.discount_value}% off
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={removeCoupon} className="h-7 text-xs">Remove</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Have a coupon code?"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                  className="flex-1 h-10 text-sm uppercase rounded-xl border-border"
                  onKeyDown={(e) => e.key === 'Enter' && validateCoupon()}
                />
                <Button variant="outline" size="sm" onClick={validateCoupon} disabled={validatingCoupon || !couponCode.trim()} className="h-10 px-4 rounded-xl">
                  {validatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                </Button>
              </div>
              {couponError && <p className="text-xs text-destructive pl-1">{couponError}</p>}
            </div>
          )}
        </div>
      )}

      {/* CTA Button */}
      <Button
        onClick={() => handleUpgrade(selectedPlanKey)}
        disabled={paymentLoading || plansLoading || !selectedPlan}
        className="w-full h-12 rounded-xl text-base font-semibold"
        size="lg"
      >
        {paymentLoading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
        ) : (
          <>Upgrade to Pro</>
        )}
      </Button>

      {/* Trust footer */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pb-2">
        <Shield className="h-3 w-3" />
        <span>Secure payment via Razorpay</span>
        <span className="text-muted-foreground/40">·</span>
        <span>Cancel anytime</span>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{TriggerButton}</DrawerTrigger>
        <DrawerContent className="px-4 pb-6">
          <DrawerHeader className="px-0 pb-0">
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
      <SheetContent side="right" className="w-[400px] sm:w-[440px]">
        <SheetHeader>
          <SheetTitle className="sr-only">Upgrade to Pro</SheetTitle>
        </SheetHeader>
        {PlanContent}
      </SheetContent>
    </Sheet>
  );
}
