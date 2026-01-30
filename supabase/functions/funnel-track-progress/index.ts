import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { lead_id, access_token, current_time, duration, event_type } = await req.json();

    if (!lead_id || !access_token) {
      return new Response(
        JSON.stringify({ error: 'Missing lead_id or access_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate lead and access token
    const { data: lead, error: leadError } = await supabase
      .from('funnel_leads')
      .select('id, funnel_id, max_watched_second, video_completed')
      .eq('id', lead_id)
      .eq('access_token', access_token)
      .single();

    if (leadError || !lead) {
      console.error('Lead validation failed:', leadError);
      return new Response(
        JSON.stringify({ error: 'Invalid lead or access token' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate progress
    const currentSecond = Math.floor(current_time || 0);
    const maxWatched = Math.max(lead.max_watched_second || 0, currentSecond);
    const watchPercent = duration > 0 ? Math.round((maxWatched / duration) * 100) : 0;
    const isComplete = event_type === 'complete' || watchPercent >= 95;

    // Update lead progress
    const { error: updateError } = await supabase
      .from('funnel_leads')
      .update({
        last_watched_second: currentSecond,
        max_watched_second: maxWatched,
        video_watch_percent: Math.min(watchPercent, 100),
        video_completed: isComplete || lead.video_completed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead_id);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update progress' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert analytics event (for significant events only)
    if (event_type === 'complete' || (currentSecond > 0 && currentSecond % 30 === 0)) {
      await supabase
        .from('funnel_video_analytics')
        .insert({
          funnel_id: lead.funnel_id,
          lead_id: lead_id,
          event_type: event_type || 'progress',
          timestamp_second: currentSecond,
          watched_percent: watchPercent,
          event_data: { duration },
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        max_watched_second: maxWatched,
        video_watch_percent: watchPercent,
        video_completed: isComplete || lead.video_completed,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
