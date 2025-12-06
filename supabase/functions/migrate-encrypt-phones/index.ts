import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY') || '';

function encrypt(text: string): string {
  if (!text || !ENCRYPTION_KEY) return text;
  
  const textBytes = new TextEncoder().encode(text);
  const keyBytes = new TextEncoder().encode(ENCRYPTION_KEY);
  const encrypted = new Uint8Array(textBytes.length);
  
  for (let i = 0; i < textBytes.length; i++) {
    encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return 'ENC:' + btoa(String.fromCharCode(...encrypted));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role to bypass RLS and update all records
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all prospects with unencrypted phone numbers
    const { data: prospects, error: fetchError } = await supabase
      .from('prospects')
      .select('id, phone')
      .not('phone', 'like', 'ENC:%');

    if (fetchError) {
      console.error('Error fetching prospects:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${prospects?.length || 0} prospects with unencrypted phones`);

    if (!prospects || prospects.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No unencrypted phone numbers found', migrated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let migratedCount = 0;
    let errorCount = 0;

    // Update each prospect with encrypted phone
    for (const prospect of prospects) {
      const encryptedPhone = encrypt(prospect.phone);
      
      const { error: updateError } = await supabase
        .from('prospects')
        .update({ phone: encryptedPhone })
        .eq('id', prospect.id);

      if (updateError) {
        console.error(`Error updating prospect ${prospect.id}:`, updateError);
        errorCount++;
      } else {
        migratedCount++;
      }
    }

    console.log(`Migration complete: ${migratedCount} encrypted, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        message: 'Migration complete',
        total: prospects.length,
        migrated: migratedCount,
        errors: errorCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Migration error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
