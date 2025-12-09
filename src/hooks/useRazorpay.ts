import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type PlanType = 'monthly' | 'yearly';

interface RazorpayOptions {
  planType?: PlanType;
  couponCode?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// Static payment links - reusable by multiple users
const PAYMENT_LINKS = {
  monthly: 'https://rzp.io/rzp/m5zAQDm', // ₹249
  yearly: 'https://rzp.io/rzp/m5zAQDm', // TODO: Replace with ₹2999 link
  yearlyDiscounted: 'https://rzp.io/rzp/m5zAQDm', // TODO: Replace with ₹1999 link
};

export function useRazorpay() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const initiatePayment = useCallback(async (options?: RazorpayOptions) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to upgrade to Pro.",
        variant: "destructive",
      });
      return;
    }

    const planType = options?.planType || 'monthly';
    const couponCode = options?.couponCode;
    const hasCoupon = planType === 'yearly' && couponCode === 'ACHIEVERS1000';

    setLoading(true);

    try {
      // Get the appropriate static payment link
      let paymentLink: string;
      if (planType === 'yearly' && hasCoupon) {
        paymentLink = PAYMENT_LINKS.yearlyDiscounted;
      } else if (planType === 'yearly') {
        paymentLink = PAYMENT_LINKS.yearly;
      } else {
        paymentLink = PAYMENT_LINKS.monthly;
      }

      // Append user email as prefill parameter so webhook can identify the user
      const separator = paymentLink.includes('?') ? '&' : '?';
      const paymentUrl = `${paymentLink}${separator}prefill[email]=${encodeURIComponent(user.email || '')}`;

      // Open the static payment link in same window
      window.location.href = paymentUrl;
    } catch (err: any) {
      console.error('Payment initiation error:', err);
      toast({
        title: "Payment Error",
        description: err.message || "Could not initiate payment. Please try again.",
        variant: "destructive",
      });
      options?.onError?.(err.message);
      setLoading(false);
    }
  }, [user, toast]);

  return { initiatePayment, loading };
}
