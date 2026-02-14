

## Add Debug Logging to r2-get-upload-url

### What
Add temporary console.log statements to the service role bypass check in `supabase/functions/r2-get-upload-url/index.ts` to diagnose why the 401 persists.

### Changes

**File:** `supabase/functions/r2-get-upload-url/index.ts` (around line 41)

Add two log lines right before the bypass condition:

```typescript
const token = authHeader?.replace('Bearer ', '');

// Temporary debug logging
console.log('[bypass] token length:', token?.length, 'serviceRoleKey length:', serviceRoleKey?.length);
console.log('[bypass] match:', token === serviceRoleKey);

// Allow service_role key (used by Lovable Cloud proxy)
if (token && token === serviceRoleKey) {
```

### After Code Change
- Redeploy the `r2-get-upload-url` edge function
- Trigger a test request
- Check the function logs to see if lengths match and whether the comparison returns true or false

### Next Steps Based on Results
- If lengths differ or match is false: the `APP_SUPABASE_SERVICE_ROLE_KEY` secret needs to be re-set with the correct value
- If match is true but still 401: there's a logic flow issue after the bypass
- Once diagnosed, remove the debug logs

