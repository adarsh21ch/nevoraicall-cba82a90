import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { lead_id, funnel_id, price_option_id, amount, screenshot_url, access_token } = body;

    console.log('Received payment proof submission:', { lead_id, funnel_id, amount, price_option_id });

    // Validate required fields
    if (!lead_id || !funnel_id || !amount || !screenshot_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: lead_id, funnel_id, amount, screenshot_url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the lead exists and validate access token if provided
    const { data: lead, error: leadError } = await supabase
      .from('funnel_leads')
      .select('id, funnel_id, owner_user_id, access_token')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      console.error('Lead not found:', leadError);
      return new Response(
        JSON.stringify({ error: 'Lead not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate access token if provided
    if (access_token && lead.access_token !== access_token) {
      console.error('Invalid access token');
      return new Response(
        JSON.stringify({ error: 'Invalid access token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing pending payment
    const { data: existingPayment } = await supabase
      .from('funnel_payments')
      .select('id, status')
      .eq('lead_id', lead_id)
      .eq('status', 'pending')
      .single();

    if (existingPayment) {
      // Update existing pending payment with new screenshot
      const { data: updatedPayment, error: updateError } = await supabase
        .from('funnel_payments')
        .update({
          upi_screenshot_url: screenshot_url,
          amount: amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPayment.id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update payment record:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update payment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Payment proof updated:', {
        paymentId: updatedPayment.id,
        leadId: lead_id,
      });

      return new Response(
        JSON.stringify({
          success: true,
          payment_id: updatedPayment.id,
          status: 'pending',
          message: 'Payment proof updated for verification',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new payment record with pending status
    const { data: payment, error: paymentError } = await supabase
      .from('funnel_payments')
      .insert({
        lead_id: lead_id,
        funnel_id: funnel_id,
        owner_user_id: lead.owner_user_id,
        provider: 'manual',
        amount: amount,
        currency: 'INR',
        status: 'pending',
        upi_screenshot_url: screenshot_url,
        price_option_id: price_option_id || null,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Failed to create payment record:', paymentError);
      return new Response(
        JSON.stringify({ error: 'Failed to record payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update lead's payment status cache
    await supabase
      .from('funnel_leads')
      .update({ payment_status_cache: 'pending' })
      .eq('id', lead_id);

    console.log('Payment proof submitted:', {
      paymentId: payment.id,
      leadId: lead_id,
      funnelId: funnel_id,
      amount: amount,
    });

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        status: 'pending',
        message: 'Payment proof submitted for verification',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing payment proof:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
