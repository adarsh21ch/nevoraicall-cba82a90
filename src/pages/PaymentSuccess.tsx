import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { refetch } = useSubscription();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
      return;
    }

    if (user) {
      activateProSubscription();
    }
  }, [user, authLoading]);

  const activateProSubscription = async () => {
    try {
      const paymentId = searchParams.get('razorpay_payment_id') || searchParams.get('payment_id') || `manual_${Date.now()}`;
      
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          plan: 'pro',
          status: 'active',
          subscribed_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          payment_id: paymentId,
        })
        .eq('user_id', user!.id);

      if (error) {
        console.error('Error activating subscription:', error);
        setErrorMessage(error.message);
        setStatus('error');
        return;
      }

      await refetch();
      setStatus('success');
      
      toast({
        title: "Pro Plan Activated!",
        description: "Welcome to NevorAI Pro. Enjoy all premium features for 30 days!",
      });
    } catch (err: any) {
      console.error('Activation error:', err);
      setErrorMessage(err.message || 'Something went wrong');
      setStatus('error');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img 
            src={nevoraLogo} 
            alt="NevorAI Logo" 
            className="h-16 w-16 rounded-2xl object-cover shadow-lg"
          />
        </div>

        {status === 'processing' && (
          <div className="text-center space-y-4">
            <div className="p-6 rounded-full bg-primary/10 inline-block">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Activating Pro Plan...</h1>
            <p className="text-muted-foreground">Please wait while we process your subscription.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center space-y-4">
            <div className="p-6 rounded-full bg-green-500/10 inline-block">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-green-600">Payment Successful!</h1>
            <p className="text-muted-foreground">Your Pro plan is now active for 30 days.</p>
            
            <div className="bg-card border border-border/50 rounded-2xl p-4 mt-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-primary" />
                <span className="font-semibold">Pro Features Unlocked</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ TrackUp - Funnel & Leads Tracker</li>
                <li>✓ ActionUp - Activity Center</li>
                <li>✓ Advanced Analytics</li>
              </ul>
            </div>

            <Button 
              onClick={() => navigate('/home')} 
              className="w-full h-12 mt-6"
            >
              Go to Dashboard
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4">
            <div className="p-6 rounded-full bg-destructive/10 inline-block">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-destructive">Activation Failed</h1>
            <p className="text-muted-foreground">{errorMessage || 'Something went wrong. Please contact support.'}</p>
            
            <div className="space-y-2 mt-6">
              <Button 
                onClick={activateProSubscription} 
                className="w-full h-12"
              >
                Try Again
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/profile')} 
                className="w-full h-12"
              >
                Go to Profile
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              If the issue persists, contact us at teamnevorai@gmail.com
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
