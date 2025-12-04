import { useState } from 'react';
import { useFunnelTracking, FunnelRow } from '@/hooks/useFunnelTracking';
import { EditableCell } from './EditableCell';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ChevronDown, ChevronUp, Flame, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const STAGES = ['day_1', 'day_2', 'minimum_billing', 'level_up', 'two_cc'] as const;
const STAGE_LABELS: Record<string, string> = {
  day_1: 'Day 1',
  day_2: 'Day 2',
  minimum_billing: 'Min Billing',
  level_up: 'Level Up',
  two_cc: '2CC',
};

const STAGE_COLORS: Record<string, string> = {
  day_1: 'from-violet-500/20 to-violet-500/5',
  day_2: 'from-pink-500/20 to-pink-500/5',
  minimum_billing: 'from-amber-500/20 to-amber-500/5',
  level_up: 'from-emerald-500/20 to-emerald-500/5',
  two_cc: 'from-cyan-500/20 to-cyan-500/5',
};

const STEP_CONVERSIONS = [
  { from: 'start', to: 'day_1', label: 'Start → Day 1' },
  { from: 'day_1', to: 'day_2', label: 'Day 1 → Day 2' },
  { from: 'day_2', to: 'minimum_billing', label: 'Day 2 → Min Billing' },
  { from: 'minimum_billing', to: 'level_up', label: 'Min Billing → Level Up' },
  { from: 'level_up', to: 'two_cc', label: 'Level Up → 2CC' },
];

function getConversionColor(percentage: number) {
  if (percentage >= 70) return 'bg-gradient-to-r from-green-400 to-green-500';
  if (percentage >= 40) return 'bg-gradient-to-r from-amber-400 to-amber-500';
  return 'bg-gradient-to-r from-red-400 to-red-500';
}

function getConversionTextColor(percentage: number) {
  if (percentage >= 70) return 'text-green-500';
  if (percentage >= 40) return 'text-amber-500';
  return 'text-red-500';
}

export function FunnelTracker() {
  const { rows, loading, updateCell, addRow, totals } = useFunnelTracking();
  const [fromStage, setFromStage] = useState<string>('day_1');
  const [toStage, setToStage] = useState<string>('day_2');
  const [stepConversionOpen, setStepConversionOpen] = useState(true);

  const handleCellChange = (funnelNumber: number, field: keyof FunnelRow, value: number) => {
    updateCell(funnelNumber, field, value);
  };

  const fromValue = fromStage === 'start' ? rows.length * 10 : totals[fromStage as keyof typeof totals] || 0;
  const toValue = totals[toStage as keyof typeof totals] || 0;
  const conversionPercentage = fromValue > 0 ? Math.round((toValue / fromValue) * 100) : 0;

  const getStepConversion = (from: string, to: string) => {
    const fromVal = from === 'start' ? totals.day_1 : totals[from as keyof typeof totals] || 0;
    const toVal = totals[to as keyof typeof totals] || 0;
    if (from === 'start') {
      return { from: fromVal || 1, to: fromVal, percentage: fromVal > 0 ? 100 : 0 };
    }
    const percentage = fromVal > 0 ? Math.round((toVal / fromVal) * 100) : 0;
    return { from: fromVal, to: toVal, percentage };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Funnel Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Funnel Tracker</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Click any cell to edit. Changes save automatically.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30">
                <th className="py-3 px-3 text-left text-xs font-semibold text-muted-foreground w-16">Funnel</th>
                {STAGES.map(stage => (
                  <th key={stage} className={cn("py-3 px-2 text-center text-xs font-semibold", "bg-gradient-to-b", STAGE_COLORS[stage])}>
                    {STAGE_LABELS[stage]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.funnel_number} className={cn("border-b border-border/30", idx % 2 === 0 ? "bg-background" : "bg-muted/20")}>
                  <td className="py-2 px-3 text-sm font-bold text-muted-foreground">{row.funnel_number}</td>
                  {STAGES.map(stage => (
                    <td key={stage} className="py-2 px-2">
                      <EditableCell
                        value={row[stage]}
                        onChange={(value) => handleCellChange(row.funnel_number, stage, value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td colSpan={6} className="py-2 px-3">
                  <Button variant="ghost" size="sm" onClick={addRow} className="text-xs text-primary hover:text-primary hover:bg-primary/10">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add row
                  </Button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                <td className="py-3 px-3 text-sm font-bold">TOTAL</td>
                {STAGES.map(stage => (
                  <td key={stage} className="py-3 px-2">
                    <div className="h-9 flex items-center justify-center text-base font-bold rounded-lg bg-background/80 backdrop-blur-sm shadow-sm">
                      {totals[stage]}
                    </div>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Conversion Analytics */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold">Conversion Rate</h3>
            </div>
            <div className="flex items-center gap-2">
              <Select value={fromStage} onValueChange={setFromStage}>
                <SelectTrigger className="w-28 h-8 text-xs bg-muted/50 border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  {STAGES.slice(0, -1).map(stage => (
                    <SelectItem key={stage} value={stage} className="text-xs">{STAGE_LABELS[stage]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">→</span>
              <Select value={toStage} onValueChange={setToStage}>
                <SelectTrigger className="w-28 h-8 text-xs bg-muted/50 border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  {STAGES.filter(s => STAGES.indexOf(s) > STAGES.indexOf(fromStage as any)).map(stage => (
                    <SelectItem key={stage} value={stage} className="text-xs">{STAGE_LABELS[stage]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{STAGE_LABELS[fromStage]} → {STAGE_LABELS[toStage]}</p>
              <p className={cn("text-sm mt-1", getConversionTextColor(conversionPercentage))}>
                {toValue} of {fromValue} converted
              </p>
            </div>
            <span className={cn("text-4xl font-bold tracking-tight", getConversionTextColor(conversionPercentage))}>
              {conversionPercentage}%
            </span>
          </div>
          
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className={cn("h-full transition-all duration-700 ease-out", getConversionColor(conversionPercentage))}
              style={{ width: `${Math.min(conversionPercentage, 100)}%` }}
            />
          </div>

          {/* Step by Step Conversion */}
          <Collapsible open={stepConversionOpen} onOpenChange={setStepConversionOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent h-10">
                <span className="text-sm font-medium">Step by Step Conversion</span>
                {stepConversionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {STEP_CONVERSIONS.map((step, i) => {
                const conv = getStepConversion(step.from, step.to);
                return (
                  <div
                    key={step.label}
                    className="p-3 rounded-xl bg-muted/30 space-y-2"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{step.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-lg font-bold", getConversionTextColor(conv.percentage))}>
                          {conv.percentage}%
                        </span>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {conv.to}/{conv.from}
                        </span>
                        {conv.percentage >= 70 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : conv.percentage >= 40 ? (
                          <Minus className="h-4 w-4 text-amber-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/50">
                      <div
                        className={cn("h-full transition-all duration-500", getConversionColor(conv.percentage))}
                        style={{ width: `${Math.min(conv.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
