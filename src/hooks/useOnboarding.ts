import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

export function useOnboarding() {
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [demoSheetId, setDemoSheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Determine if onboarding should be active
  useEffect(() => {
    if (!profile || !user) return;
    
    // Already completed or explicitly skipped
    if (profile.onboarding_completed) {
      setIsActive(false);
      return;
    }

    // Check if user signed up more than 7 days ago - auto-skip
    const signupDate = new Date(profile.created_at);
    const daysSinceSignup = (Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceSignup > 7) {
      setIsActive(false);
      return;
    }

    // Resume from last step
    setCurrentStep(profile.onboarding_step || 0);
    
    // If step is 0, user hasn't started - show step 1
    if (profile.onboarding_step === 0) {
      setIsActive(true);
      setCurrentStep(1);
    } else if (profile.onboarding_step < 5) {
      setIsActive(true);
    }
  }, [profile, user]);

  const setupDemoData = useCallback(async () => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('setup_onboarding_demo_data', {
        p_user_id: user.id,
      });
      if (error) {
        console.error('Error setting up demo data:', error);
        return null;
      }
      const result = data as { success: boolean; sheet_id?: string };
      if (result.sheet_id) {
        setDemoSheetId(result.sheet_id);
      }
      return result;
    } catch (err) {
      console.error('Failed to setup demo data:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const goToStep = useCallback(async (step: number) => {
    setCurrentStep(step);
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_step: step } as any)
        .eq('user_id', user.id);
    }
  }, [user]);

  const completeOnboarding = useCallback(async () => {
    setIsActive(false);
    setCurrentStep(5);
    if (user) {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_step: 5,
        } as any)
        .eq('user_id', user.id);
      
      // Clean up demo data
      await supabase.rpc('cleanup_demo_data', { p_user_id: user.id });
    }
  }, [user]);

  const skipOnboarding = useCallback(async () => {
    setIsActive(false);
    if (user) {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_step: -1, // -1 means skipped
        } as any)
        .eq('user_id', user.id);
      
      // Clean up demo data
      await supabase.rpc('cleanup_demo_data', { p_user_id: user.id });
    }
  }, [user]);

  return {
    isActive,
    currentStep,
    demoSheetId,
    loading,
    setupDemoData,
    goToStep,
    completeOnboarding,
    skipOnboarding,
    totalSteps: 5,
  };
}
