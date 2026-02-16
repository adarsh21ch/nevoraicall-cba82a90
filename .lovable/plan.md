

# Fix og-share Edge Function Deployment

## Problem
The `og-share` edge function deploys successfully but returns 404. This is likely because the Lovable Cloud edge runtime is not registering it properly. The function code and config are correct.

## Solution

The most reliable fix is to update the CORS headers to match exactly what the other working functions use (the extended header list), and redeploy. If that still fails, we will try an alternative approach: use the `npm:` import specifier instead of `esm.sh`.

## Changes

### 1. Update `supabase/functions/og-share/index.ts`
- Update CORS `Access-Control-Allow-Headers` to match the full set used by all other working functions in this project:
  ```
  authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version
  ```
- This ensures consistency with all other deployed functions and eliminates any CORS mismatch as a cause.

### 2. Redeploy and Test
- Deploy the function and wait for it to register.
- Test with a real funnel slug from the database to verify the HTML response includes the correct OG tags.

### 3. If Still 404 — Fallback Plan
If the function still returns 404 after the update, we will:
- Delete and recreate the function with a slightly different name (e.g., `ogshare` without the hyphen) as hyphens in function names can sometimes cause routing issues in certain edge runtimes.
- Update `src/types/funnels.ts` and `src/config/siteUrl.ts` to use the new function name.

## Files to Modify
- `supabase/functions/og-share/index.ts` — Update CORS headers

## Files Potentially Modified (fallback only)
- Rename function folder to `supabase/functions/ogshare/index.ts`
- `supabase/config.toml` — Update function config name
- `src/types/funnels.ts` — Update URL to new function name
- `src/config/siteUrl.ts` — Update URL to new function name
