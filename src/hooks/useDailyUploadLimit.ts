import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UploadLimitResult {
  allowed: boolean;
  reason: string;
  limit_type?: string;
  today_count?: number;
  limit_value?: number;
}

/**
 * Hook for checking and enforcing daily upload limits.
 * Uses backend RPC functions for accurate, server-side enforcement.
 */
export function useDailyUploadLimit() {
  const { user } = useAuth();

  /**
   * Check if the user can upload a specified number of leads.
   * Returns allowed status and reason if blocked.
   */
  const checkLimit = useCallback(async (count: number): Promise<UploadLimitResult> => {
    if (!user) {
      return { allowed: false, reason: 'Not authenticated' };
    }

    try {
      const { data, error } = await supabase.rpc('check_upload_limit', {
        p_user_id: user.id,
        p_count: count,
      });

      if (error) {
        console.error('Error checking upload limit:', error);
        // Fail open - allow upload if check fails
        return { allowed: true, reason: '' };
      }

      return data as unknown as UploadLimitResult;
    } catch (err) {
      console.error('Failed to check upload limit:', err);
      // Fail open
      return { allowed: true, reason: '' };
    }
  }, [user]);

  /**
   * Increment the daily upload count after successful import.
   */
  const incrementCount = useCallback(async (count: number): Promise<number | null> => {
    if (!user || count <= 0) return null;

    try {
      const { data, error } = await supabase.rpc('increment_daily_upload', {
        p_user_id: user.id,
        p_count: count,
      });

      if (error) {
        console.error('Error incrementing daily upload count:', error);
        return null;
      }

      return data as number;
    } catch (err) {
      console.error('Failed to increment daily upload count:', err);
      return null;
    }
  }, [user]);

  return { checkLimit, incrementCount };
}
