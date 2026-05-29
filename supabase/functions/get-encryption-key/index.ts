// SECURITY: This endpoint has been disabled.
// Returning the raw ENCRYPTION_KEY to clients defeats the purpose of server-side
// encryption. All encryption/decryption must go through the `encrypt-data`
// function, which keeps the key on the server.
import { buildCorsHeaders } from '../_shared/cors.ts';

Deno.serve((req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  return new Response(
    JSON.stringify({
      error: 'This endpoint has been removed. Use the encrypt-data function for encryption/decryption.',
      code: 'ENDPOINT_DISABLED',
    }),
    { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
