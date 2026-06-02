import {
  Compass,
  Megaphone,
  TrendingUp,
  Settings2,
  Wallet,
  Scale,
  Users,
  Square,
  type LucideIcon,
} from 'lucide-react';

/**
 * Explicit map of the lucide icons referenced by FOUNDER_FUNCTIONS iconKeys.
 * Kept explicit (rather than `import * as Icons`) so the bundler can
 * tree-shake — a namespace import would pull the entire icon library into the
 * founder chunk.
 */
const FOUNDER_ICONS: Record<string, LucideIcon> = {
  Compass,
  Megaphone,
  TrendingUp,
  Settings2,
  Wallet,
  Scale,
  Users,
};

export function resolveFounderIcon(name: string): LucideIcon {
  return FOUNDER_ICONS[name] || Square;
}
