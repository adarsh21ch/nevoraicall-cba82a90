import { cn } from '@/lib/utils';
import { Gender } from '@/types/prospect';

interface GenderBadgeProps {
  gender: Gender | string | null | undefined;
}

export function GenderBadge({ gender }: GenderBadgeProps) {
  if (!gender) return null;

  const colorClasses: Record<string, string> = {
    'Male': 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    'Female': 'bg-pink-500/15 text-pink-600 border-pink-500/30',
    'Other': 'bg-purple-500/15 text-purple-600 border-purple-500/30',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap',
      colorClasses[gender] || 'bg-muted text-muted-foreground border-border'
    )}>
      {gender}
    </span>
  );
}
