import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

interface UpgradeBarProps {
  onUpgrade?: () => void;
}

export function UpgradeBar({ onUpgrade }: UpgradeBarProps) {
  const { isPro, loading } = useSubscription();
  const navigate = useNavigate();

  const handleNavigateToProfile = () => {
    navigate('/profile');
    if (onUpgrade) onUpgrade();
  };

  if (loading || isPro) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 px-4 pb-2">
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-4 shadow-2xl shadow-primary/30 border border-primary/20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20">
              <Lock className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-foreground">
                🔒 Upgrade to unlock this feature
              </p>
              <p className="text-xs text-primary-foreground/80">
                Subscribe at ₹249
              </p>
            </div>
          </div>
          <Button 
            onClick={handleNavigateToProfile}
            variant="secondary"
            size="sm"
            className="shrink-0 font-semibold"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Unlock Now
          </Button>
        </div>
      </div>
    </div>
  );
}
