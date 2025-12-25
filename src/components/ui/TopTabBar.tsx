import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface TabOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

interface TopTabBarProps {
  options: [TabOption, TabOption];
  value: string;
  onChange: (value: string) => void;
}

export function TopTabBar({ options, value, onChange }: TopTabBarProps) {
  return (
    <div className="bg-card/80 backdrop-blur-xl border-b border-border/50 px-4 py-2">
      {/* Segmented control - premium dark/light style */}
      <div className="relative flex h-10 w-full rounded-lg bg-muted/80 p-1">
        {/* Animated sliding background - dark selected state */}
        <div 
          className="absolute top-1 h-8 w-[calc(50%-4px)] rounded-md bg-foreground shadow-lg transition-all duration-200 ease-out"
          style={{ 
            left: value === options[0].value ? '4px' : 'calc(50% + 0px)'
          }}
        />
        
        {options.map((option) => {
          const isActive = value === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                "relative z-10 flex-1 flex items-center justify-center gap-2 text-sm font-semibold transition-colors duration-200 rounded-md",
                isActive
                  ? "text-background"
                  : "text-muted-foreground hover:text-foreground/80"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}