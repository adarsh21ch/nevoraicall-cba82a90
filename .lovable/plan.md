

## Fix: Make `submit-payment-proof` More Robust for nevorai.com

### Problem

The R2 upload works fine (the `r2-get-upload-url` function correctly authenticates visitors via `x-lead-token`). The error occurs in `submit-payment-proof` -- the nevorai.com frontend likely sends data in a slightly different format, causing either "Lead not found" or "Failed to record payment".

### Root Cause

The nevorai.com frontend may:
- Send `access_token` for lead lookup instead of `lead_id`
- Send `amount` as a string or float instead of integer
- Send field names that don't match what the function expects

### Changes

**File: `supabase/functions/submit-payment-proof/index.ts`**

1. **Add `access_token` as an alternative to `lead_id`** -- If `lead_id` is missing but `access_token` is provided, look up the lead by its access token (same way `r2-get-upload-url` does it)

2. **Also check `x-lead-token` header** -- The nevorai.com frontend might pass the token in the header (like it does for R2 uploads) instead of the body

3. **Cast `amount` to integer** -- Use `Math.round(Number(amount))` to handle float/string values from nevorai.com

4. **Add detailed request logging** -- Log the full request body so we can diagnose any remaining issues

### Technical Details

```text
Current flow:
  nevorai.com -> submit-payment-proof(lead_id, ...) -> "Lead not found"

Fixed flow:
  nevorai.com -> submit-payment-proof(lead_id OR access_token OR x-lead-token header)
             -> lookup lead by whichever identifier is provided
             -> cast amount to integer
             -> INSERT into funnel_payments
             -> success
```

### Specific Code Changes

In `submit-payment-proof/index.ts`:

- After parsing the request body (line 26), add `access_token` to the destructured fields
- Add a new lookup path: if `lead_id` is missing, try `access_token` from body or `x-lead-token` header to find the lead
- Wrap `amount` in `Math.round(Number(...))` before the INSERT
- Add `console.log` of the incoming request body for debugging
- Update the CORS headers to include `x-lead-token`

No other files need changes -- the R2 upload flow already works correctly.

