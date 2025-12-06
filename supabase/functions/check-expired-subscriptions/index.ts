import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('Checking for expired and expiring subscriptions...');
    console.log('Current time:', now.toISOString());

    // Find subscriptions that have expired (expires_at < now)
    const { data: expiredSubs, error: expiredError } = await supabase
      .from('user_subscriptions')
      .select('id, user_id, expires_at')
      .eq('plan', 'pro')
      .eq('status', 'active')
      .lt('expires_at', now.toISOString());

    if (expiredError) {
      console.error('Error fetching expired subscriptions:', expiredError);
      throw expiredError;
    }

    console.log(`Found ${expiredSubs?.length || 0} expired subscriptions`);

    // Mark expired subscriptions
    if (expiredSubs && expiredSubs.length > 0) {
      for (const sub of expiredSubs) {
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            plan: 'free',
            status: 'expired',
          })
          .eq('id', sub.id);

        if (updateError) {
          console.error(`Error updating subscription ${sub.id}:`, updateError);
        } else {
          console.log(`Marked subscription ${sub.id} as expired for user ${sub.user_id}`);
        }
      }
    }

    // Find subscriptions expiring tomorrow (for notifications)
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const { data: expiringSubs, error: expiringError } = await supabase
      .from('user_subscriptions')
      .select('id, user_id, expires_at')
      .eq('plan', 'pro')
      .eq('status', 'active')
      .gte('expires_at', tomorrowStart.toISOString())
      .lte('expires_at', tomorrowEnd.toISOString());

    if (expiringError) {
      console.error('Error fetching expiring subscriptions:', expiringError);
    } else {
      console.log(`Found ${expiringSubs?.length || 0} subscriptions expiring tomorrow`);
      
      // Log users who need reminder (email sending can be added later with Resend)
      if (expiringSubs && expiringSubs.length > 0) {
        for (const sub of expiringSubs) {
          console.log(`Reminder needed for user ${sub.user_id} - expires ${sub.expires_at}`);
          // TODO: Add email notification using Resend when configured
        }
      }
    }

    const result = {
      success: true,
      timestamp: now.toISOString(),
      expired_count: expiredSubs?.length || 0,
      expiring_tomorrow_count: expiringSubs?.length || 0,
    };

    console.log('Subscription check completed:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in check-expired-subscriptions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
