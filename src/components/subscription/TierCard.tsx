import { Crown, Check, Zap } from 'lucide-react';
import { PlanConfig } from '@/hooks/usePaymentLinks';

interface TierCardProps {
  tierName?: string;
  plans: PlanConfig[];
  isPremium?: boolean;
  selectedPlanKey: string;
  onSelectPlan: (planKey: string) => void;
  compact?: boolean;
}

export function TierCard({ tierName = 'Pro', plans, selectedPlanKey, onSelectPlan, compact = false }: TierCardProps) {
  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);

  const getDailyPrice = (plan: PlanConfig) => Math.round(plan.price / plan.durationDays);
  const lowestDailyPrice = Math.min(...sortedPlans.map(p => Math.round(p.price / p.durationDays)));

  const defaultFeatures = [
    'Full Application Access (Calling + Follow-up)',
    'TrackUp Dashboard (Advanced Tracking)',
    'Higher Limits & Productivity Tools',
    'Faster Workflow & Automation',
    'Best for individual network marketers',
  ];

  const features = sortedPlans[0]?.features?.length ? sortedPlans[0].features : defaultFeatures;

  const getDurationLabel = (plan: PlanConfig) => {
    const months = Math.round(plan.durationDays / 30);
    if (months === 1) return '1 Month';
    if (months === 6) return '6 Months';
    if (months === 12) return '1 Year';
    return `${months} Mo`;
  };

  const getBillingLabel = (plan: PlanConfig) => {
    const months = Math.round(plan.durationDays / 30);
    if (months === 1) return 'billed monthly';
    if (months === 6) return 'billed every 6 months';
    if (months === 12) return 'billed yearly';
    return `billed every ${months} months`;
  };

  return (
    <div className="rounded-2xl overflow-hidden relative">
      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[hsl(36,90%,55%)] via-[hsl(28,85%,50%)] to-[hsl(20,80%,45%)] p-[1.5px]">
        <div className="w-full h-full rounded-[15px] bg-card" />
      </div>

      <div className="relative z-10">
        {/* Premium header bar */}
        <div className="bg-gradient-to-r from-[hsl(36,90%,55%)] via-[hsl(30,85%,52%)] to-[hsl(24,80%,48%)] px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Crown className="h-3.5 w-3.5 text-white" />
              </div>
              <h4 className="font-bold text-sm text-white tracking-wide">{tierName}</h4>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-lg font-extrabold text-white">₹{lowestDailyPrice}</span>
              <span className="text-xs text-white/80 font-medium">/day</span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className={`px-4 ${compact ? 'pt-2.5 pb-2' : 'pt-3 pb-2.5'}`}>
          <div className={`${compact ? 'space-y-1' : 'space-y-1.5'}`}>
            {features.slice(0, compact ? 4 : 5).map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px] text-foreground/80">
                <div className="h-4 w-4 rounded-full bg-gradient-to-br from-[hsl(36,90%,55%)] to-[hsl(28,85%,50%)] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                </div>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Billing options */}
        <div className={`px-3 ${compact ? 'pb-3' : 'pb-3.5'}`}>
          <div className={`grid gap-2 ${sortedPlans.length <= 3 ? `grid-cols-${sortedPlans.length}` : 'grid-cols-3'}`}>
            {sortedPlans.map((plan) => {
              const isSelected = selectedPlanKey === plan.plan_key;
              const dailyPrice = getDailyPrice(plan);

              return (
                <button
                  key={plan.plan_key}
                  type="button"
                  onClick={() => onSelectPlan(plan.plan_key)}
                  className={`relative flex flex-col items-center px-2 py-3 rounded-xl border-2 transition-all text-center ${
                    isSelected
                      ? 'border-[hsl(30,85%,52%)] bg-gradient-to-b from-[hsl(36,90%,55%,0.08)] to-[hsl(28,85%,50%,0.04)] shadow-md shadow-[hsl(30,85%,52%,0.15)]'
                      : 'border-border/60 bg-muted/30 hover:border-[hsl(30,85%,52%,0.4)] hover:bg-muted/50'
                  }`}
                >
                  {plan.badgeText && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-[hsl(36,90%,55%)] to-[hsl(28,85%,50%)] text-white uppercase tracking-wider whitespace-nowrap">
                      {plan.badgeText}
                    </span>
                  )}
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight">
                    {getDurationLabel(plan)}
                  </span>
                  <span className={`text-base font-extrabold leading-tight mt-1 ${
                    isSelected ? 'text-[hsl(28,85%,42%)] dark:text-[hsl(36,90%,60%)]' : 'text-foreground'
                  }`}>
                    ₹{dailyPrice}/day
                  </span>
                  <span className="text-[9px] text-muted-foreground mt-0.5 leading-tight">
                    ₹{plan.price} {getBillingLabel(plan)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
