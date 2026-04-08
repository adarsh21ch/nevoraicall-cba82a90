import { Check } from 'lucide-react';
import { PlanConfig } from '@/hooks/usePaymentLinks';
import { cn } from '@/lib/utils';

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

  const defaultFeatures = [
    'Full Application Access',
    'Calling + Follow-up System',
    'TrackUp Dashboard',
    'Higher Limits & Productivity Tools',
    'Faster Workflow & Automation',
  ];

  const features = sortedPlans[0]?.features?.length ? sortedPlans[0].features : defaultFeatures;

  const selectedPlan = sortedPlans.find(p => p.plan_key === selectedPlanKey) || sortedPlans[0];
  const dailyPrice = selectedPlan ? Math.round(selectedPlan.price / selectedPlan.durationDays) : 0;

  const getDurationLabel = (plan: PlanConfig) => {
    if (plan.displayName) return plan.displayName;
    const months = Math.round(plan.durationDays / 30);
    if (months === 1) return '1 Month';
    if (months === 6) return '6 Months';
    if (months === 12) return '1 Year';
    return `${months} Months`;
  };

  const getBillingLabel = (plan: PlanConfig) => {
    const months = Math.round(plan.durationDays / 30);
    if (months === 1) return 'Billed monthly';
    if (months === 6) return 'Billed every 6 months';
    if (months === 12) return 'Billed yearly';
    return `Billed every ${months} months`;
  };

  return (
    <div className="space-y-5">
      {/* Feature list */}
      <div className="space-y-2.5">
        {features.slice(0, compact ? 4 : 5).map((f, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Check className="h-3 w-3 text-primary" strokeWidth={2.5} />
            </div>
            <span className="text-sm text-foreground/80">{f}</span>
          </div>
        ))}
      </div>

      {/* Duration selector */}
      <div className="space-y-3">
        {sortedPlans.length > 1 && (
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Choose duration</p>
        )}
        <div className={cn(
          "grid gap-2",
          sortedPlans.length === 1 ? "grid-cols-1" :
          sortedPlans.length === 2 ? "grid-cols-2" : "grid-cols-3"
        )}>
          {sortedPlans.map((plan) => {
            const isSelected = selectedPlanKey === plan.plan_key;

            return (
              <button
                key={plan.plan_key}
                type="button"
                onClick={() => onSelectPlan(plan.plan_key)}
                className={cn(
                  "relative flex flex-col items-center px-3 py-3.5 rounded-xl border transition-all text-center",
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:border-primary/30 bg-background'
                )}
              >
                {plan.badgeText && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground whitespace-nowrap">
                    {plan.badgeText}
                  </span>
                )}
                <span className="text-xs font-medium text-muted-foreground">
                  {getDurationLabel(plan)}
                </span>
                <span className={cn(
                  "text-lg font-bold mt-1",
                  isSelected ? 'text-foreground' : 'text-foreground'
                )}>
                  ₹{plan.price}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  {getBillingLabel(plan)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Price summary */}
      {selectedPlan && (
        <div className="flex items-baseline justify-between px-1">
          <div>
            <span className="text-2xl font-bold text-foreground">₹{selectedPlan.price}</span>
            <span className="text-sm text-muted-foreground ml-1">
              /{Math.round(selectedPlan.durationDays / 30) === 1 ? 'month' : `${Math.round(selectedPlan.durationDays / 30)} months`}
            </span>
          </div>
          {dailyPrice > 0 && (
            <span className="text-xs text-muted-foreground">
              Less than ₹{dailyPrice}/day
            </span>
          )}
        </div>
      )}
    </div>
  );
}
