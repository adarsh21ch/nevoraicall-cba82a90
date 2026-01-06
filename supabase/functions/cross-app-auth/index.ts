import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cross-app-secret',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate cross-app secret (app-to-app authentication)
    const crossAppSecret = req.headers.get('x-cross-app-secret');
    const expectedSecret = Deno.env.get('CROSS_APP_SECRET');
    
    if (!crossAppSecret || crossAppSecret !== expectedSecret) {
      console.error('Invalid or missing cross-app secret');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { email, emails, nevorai_user_id, action } = body;

    console.log('cross-app-auth called with action:', action);

    // Validate action
    if (action !== 'get_leader_ids' && action !== 'provision_leader_id') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action. Supported: "get_leader_ids", "provision_leader_id"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client for database access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // PROVISION_LEADER_ID: Create or return leader_id for a user
    if (action === 'provision_leader_id') {
      const { email: provisionEmail, display_name } = body;
      
      if (!provisionEmail) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email required for provision_leader_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const normalizedEmail = provisionEmail.toLowerCase().trim();
      console.log('provision_leader_id called for:', normalizedEmail);
      
      // Step 1: Check if profile exists by email with a leader_id
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('user_id, neverai_id, email, display_name')
        .eq('email', normalizedEmail)
        .maybeSingle();
      
      if (existingProfile?.neverai_id) {
        console.log('Found existing profile with leader_id:', existingProfile.neverai_id);
        return new Response(
          JSON.stringify({
            success: true,
            leader_id: existingProfile.neverai_id,
            nevorai_user_id: existingProfile.user_id,
            is_new: false
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Step 2: Try to create new auth user (trigger will create profile with neverai_id)
      const tempPassword = crypto.randomUUID();
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          display_name: display_name || null,
          provisioned_by: 'achievers_club'
        }
      });
      
      if (createError) {
        console.error('Error creating user:', createError.message);
        
        // User might already exist in auth but profile email doesn't match
        if (createError.message?.includes('already been registered')) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'User exists in auth but profile not linked by email. User should sign in to NevorAI first.' 
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create user: ' + createError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!newUser?.user) {
        return new Response(
          JSON.stringify({ success: false, error: 'No user returned after creation' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Step 3: Fetch the newly created profile (trigger auto-creates it with neverai_id)
      await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay for trigger
      
      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('user_id, neverai_id')
        .eq('user_id', newUser.user.id)
        .single();
      
      if (profileError || !newProfile?.neverai_id) {
        console.error('Failed to fetch new profile:', profileError);
        return new Response(
          JSON.stringify({ success: false, error: 'Profile creation failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Step 4: Update profile with email and display_name
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          email: normalizedEmail,
          display_name: display_name || null
        })
        .eq('user_id', newUser.user.id);
      
      if (updateError) {
        console.error('Failed to update profile:', updateError);
        // Still return success since the leader_id was created
      }
      
      console.log('Provisioned new leader_id for:', normalizedEmail, '->', newProfile.neverai_id);
      
      return new Response(
        JSON.stringify({
          success: true,
          leader_id: newProfile.neverai_id,
          nevorai_user_id: newUser.user.id,
          is_new: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET_LEADER_IDS: Lookup leader IDs for emails

    // BATCH MODE: Process multiple emails
    if (emails && Array.isArray(emails) && emails.length > 0) {
      console.log(`Batch lookup for ${emails.length} emails`);
      
      // Normalize emails
      const normalizedEmails = emails.map((e: string) => e.toLowerCase().trim());
      
      // Single query for all emails using .in()
      const { data: profiles, error: batchError } = await supabaseAdmin
        .from('profiles')
        .select('user_id, neverai_id, email, display_name')
        .in('email', normalizedEmails);

      if (batchError) {
        console.error('Batch database error:', batchError.message);
        return new Response(
          JSON.stringify({ success: false, error: 'Database lookup failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create a map of found profiles by email
      const profileMap = new Map(
        (profiles || []).map(p => [p.email?.toLowerCase(), p])
      );

      // Build results array - include ALL requested emails (even if not found)
      const results = normalizedEmails.map((requestedEmail: string) => {
        const profile = profileMap.get(requestedEmail);
        if (profile) {
          return {
            email: requestedEmail,
            nevorai_user_id: profile.user_id,
            leader_id: profile.neverai_id,
            display_name: profile.display_name
          };
        } else {
          return {
            email: requestedEmail,
            nevorai_user_id: null,
            leader_id: null,
            display_name: null
          };
        }
      });

      const foundCount = results.filter(r => r.leader_id !== null).length;
      console.log(`Batch complete: ${foundCount}/${emails.length} users found`);

      // Format for Achievers Club compatibility - only include found users with leader_ids
      const leader_ids = results
        .filter(r => r.leader_id !== null)
        .map(r => ({ email: r.email, leader_id: r.leader_id }));

      // Always return 200 with partial results
      return new Response(
        JSON.stringify({
          success: true,
          leader_ids,
          results,
          summary: {
            requested: emails.length,
            found: foundCount,
            not_found: emails.length - foundCount
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SINGLE MODE: Process single email or nevorai_user_id (backward compatible)
    let query = supabaseAdmin
      .from('profiles')
      .select('user_id, neverai_id, email, display_name');

    if (email) {
      query = query.eq('email', email.toLowerCase().trim());
      console.log('Looking up user by email:', email);
    } else if (nevorai_user_id) {
      query = query.eq('user_id', nevorai_user_id);
      console.log('Looking up user by user_id:', nevorai_user_id);
    }

    const { data: profile, error: profileError } = await query.maybeSingle();

    if (profileError) {
      console.error('Database error:', profileError.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Database lookup failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile) {
      console.log('User not found for:', email || nevorai_user_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User not found in NevorAI',
          nevorai_user_id: null,
          leader_id: null
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User found:', profile.user_id, 'leader_id:', profile.neverai_id);

    // Return READ-ONLY data
    return new Response(
      JSON.stringify({
        success: true,
        nevorai_user_id: profile.user_id,
        leader_id: profile.neverai_id,
        display_name: profile.display_name
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
