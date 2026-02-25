

# Plan: Fix Sign-In Proxy to Use Direct fetch() Instead of supabase.functions.invoke()

## Problem Found
The sign-in proxy edge function **works correctly** -- I tested it server-side and it successfully communicates with the auth service. However, the client's call via `supabase.functions.invoke('sign-in-proxy')` never reaches the function (zero logs). This is because `supabase.functions.invoke()` routes through the same Lovable Cloud proxy layer that is currently hanging for all POST requests.

## Root Cause
`supabase.functions.invoke()` uses the Supabase client's internal routing, which passes through the same network gateway that's blocking `signInWithPassword`. The proxy bypass only works if we bypass the client SDK entirely.

## Fix: One File Change

### `src/contexts/AuthContext.tsx`
In the `signIn()` function's proxy fallback section, replace:
```typescript
supabase.functions.invoke('sign-in-proxy', { body: { email, password } })
```
with a direct `fetch()` call:
```typescript
fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/sign-in-proxy`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  },
  body: JSON.stringify({ email, password }),
})
```

This constructs the URL directly using environment variables, completely bypassing the Supabase JS client and Lovable Cloud's proxy layer.

The rest of the logic (parsing the response, calling `setSession()`, error handling) stays the same.

## Why This Will Work
- I verified the proxy function responds correctly when called directly (server-side test returned auth error for wrong password in ~1 second)
- Direct `fetch()` bypasses the Lovable Cloud proxy that's causing the hang
- The project's memory confirms this pattern: "functions must be called using direct fetch() with explicit headers" due to Lovable Cloud's proxy behavior

## No Other Changes Needed
- Edge function code: unchanged (already working)
- Config: unchanged
- Auth page: unchanged

