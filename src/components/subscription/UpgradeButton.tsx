import { usePermissions } from '@/contexts/PermissionsContext';
import { UpgradeDrawer } from './UpgradeDrawer';

interface UpgradeButtonProps {
  className?: string;
  variant?: 'default' | 'prominent' | 'compact';
  triggerText?: string;
}

/**
 * Simple upgrade button that opens the plan selection drawer.
 * Uses permissions context instead of direct subscription check.
 */
export function UpgradeButton({ variant = 'default', triggerText }: UpgradeButtonProps) {
  const { isPaid, isLoading } = usePermissions();

  // Don't show for paid users
  if (isLoading || isPaid) return null;

  return <UpgradeDrawer variant={variant} triggerText={triggerText} />;
}
