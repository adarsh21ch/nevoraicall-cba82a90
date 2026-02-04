
# Critical Fix: Plan Duration, Trial Period & Payment Sync

## Problem Summary

The Admin Panel is supposed to be the **single source of truth** for all monetization settings, but multiple components have **hardcoded values** that bypass or conflict with admin configuration:

| Issue | Location | Current Value | Should Be |
|-------|----------|---------------|-----------|
| Hardcoded fallback duration | `create-razorpay-order` edge function | 30/120 days | Dynamic from DB |
| Hardcoded amount-to-duration mapping | `razorpay-webhook` edge function | 30/120 days | Read from order notes |
| Hardcoded amount-to-duration mapping | `verify-razorpay-payment` edge function | 30/120 days | Read from order notes |
| Hardcoded duration text | `PaymentSuccess.tsx` | "30 days" | Dynamic from plan data |
| Silent fallback to hardcoded config | Multiple edge functions | Falls back silently | Should fail clearly if plan not found |

**Current Admin Config:**
- Pro Yearly: 365 days @ ₹299 (is_default: true)
- Pro Monthly: 30 days @ ₹99

**Trial System:** Working correctly (7 days from `created_at` fallback)

---

## Solution Overview

### 1. Remove Hardcoded Duration Fallbacks from Edge Functions

All three payment-related edge functions need updates:

#### A. `create-razorpay-order` (Lines 32-46)
- **Current:** Uses `FALLBACK_PLAN_CONFIG` with hardcoded 30/120 days
- **Fix:** Fail clearly if plan not found in database instead of using hardcoded fallbacks

#### B. `razorpay-webhook` (Lines 27-35)
- **Current:** `getPlanDuration()` maps amounts to hardcoded durations
- **Fix:** Always read `duration_days` from order notes (already passed by create-order), fail if missing

#### C. `verify-razorpay-payment` (Lines 33-40, 117)
- **Current:** `getDurationFromAmount()` maps amounts to hardcoded durations
- **Fix:** Always read `duration_days` from order notes, fail if missing

### 2. Dynamic Duration Text in Payment Success Page

`PaymentSuccess.tsx` needs to display the actual plan duration dynamically:
- Store `duration_days` in the verification response
- Display "Your Pro plan is now active for X days/months/year" based on actual duration

### 3. Validation on Admin Side

Admin Panel already has validation for plans (via `PlansManager.tsx`), but edge functions should:
- **Never silently fall back** to hardcoded values
- **Log clear errors** when plan configuration is missing
- **Fail with user-friendly error messages** if payment cannot be processed

---

## Technical Implementation

### File 1: `supabase/functions/create-razorpay-order/index.ts`

**Changes:**
1. Remove `FALLBACK_PLAN_CONFIG` constant entirely
2. If plan not found in database, return error (don't silently fall back)
3. Keep the database fetch logic but make it fail clearly

```typescript
// REMOVE this block (lines 32-46):
const FALLBACK_PLAN_CONFIG = {...}

// CHANGE this block (lines 103-132):
// Instead of fallback, return error if plan not found
if (planError || !planData) {
  console.error(`Plan ${plan_type} not found in database`);
  return new Response(
    JSON.stringify({ error: 'Selected plan is not available. Please refresh and try again.' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### File 2: `supabase/functions/razorpay-webhook/index.ts`

**Changes:**
1. Remove `getPlanDuration()` function entirely
2. Always read `duration_days` from `notes.duration_days`
3. If `duration_days` is missing in notes, log error and return clear failure

```typescript
// REMOVE this function (lines 27-35):
function getPlanDuration(amountInPaise: number): number {...}

// CHANGE line 188:
// OLD: const durationDays = notes.duration_days ? parseInt(notes.duration_days) : getPlanDuration(amount);
// NEW: 
const durationDays = notes.duration_days ? parseInt(notes.duration_days) : null;
if (!durationDays) {
  console.error('Missing duration_days in payment notes - cannot activate subscription');
  await logPayment(supabase, 'payment.captured', email, paymentId, amount, 'error', 'Missing duration_days in notes', userId, true, payload);
  return new Response(JSON.stringify({ error: 'Payment processed but duration not found. Contact support.' }), {
    status: 200, // Return 200 to prevent Razorpay retries
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
```

### File 3: `supabase/functions/verify-razorpay-payment/index.ts`

**Changes:**
1. Remove `getDurationFromAmount()` function entirely
2. Always read `duration_days` from order notes
3. If `duration_days` is missing, return clear error

```typescript
// REMOVE this function (lines 33-40):
function getDurationFromAmount(amount: number): number {...}

// CHANGE lines 117-144:
// OLD: let durationDays = 30; // Default to monthly
// NEW:
let durationDays: number | null = null;

// When fetching order details, require duration_days:
if (orderResponse.ok) {
  const orderDetails = await orderResponse.json();
  const orderDurationDays = orderDetails.notes?.duration_days;
  
  if (orderDurationDays) {
    durationDays = parseInt(orderDurationDays);
  }
}

// After the try-catch for fetching order:
if (!durationDays) {
  console.error('Could not determine plan duration from order');
  return new Response(
    JSON.stringify({ error: 'Payment verified but plan duration unknown. Contact support.' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### File 4: `src/pages/PaymentSuccess.tsx`

**Changes:**
1. Get `duration_days` from verification response
2. Format duration dynamically for display

```typescript
// Add state for duration
const [durationDays, setDurationDays] = useState<number | null>(null);

// In verifyAndActivate(), save duration from response:
if (data?.duration_days) {
  setDurationDays(data.duration_days);
}

// Helper function to format duration
const formatDuration = (days: number) => {
  if (days >= 365) return '1 year';
  if (days >= 180) return '6 months';
  const months = Math.round(days / 30);
  if (months >= 1) return `${months} month${months > 1 ? 's' : ''}`;
  return `${days} days`;
};

// In toast (line 69):
// OLD: "Welcome to NevorAI Pro! Enjoy all premium features for 30 days."
// NEW: 
`Welcome to NevorAI Pro! Enjoy all premium features${durationDays ? ` for ${formatDuration(durationDays)}` : ''}.`

// In success message (line 113):
// OLD: "Your Pro plan is now active for 30 days."
// NEW:
<p className="text-muted-foreground">
  Your Pro plan is now active{durationDays ? ` for ${formatDuration(durationDays)}` : ''}.
</p>
```

---

## Data Flow Validation

After these changes, the data flow will be:

```
Admin Panel (duration_days = 365 for yearly)
         ↓
admin_subscription_plans table
         ↓
create-razorpay-order reads plan, includes duration_days in order notes
         ↓
Razorpay Order created with notes: { duration_days: 365, ... }
         ↓
On payment success:
  - verify-razorpay-payment reads duration_days from order notes
  - razorpay-webhook reads duration_days from payment notes
         ↓
user_subscriptions.expires_at = now() + duration_days
         ↓
PaymentSuccess page shows "active for 1 year"
```

**No hardcoded values anywhere in the chain.**

---

## Files to Modify

| File | Change Type |
|------|-------------|
| `supabase/functions/create-razorpay-order/index.ts` | Remove fallback config, fail if plan not found |
| `supabase/functions/razorpay-webhook/index.ts` | Remove hardcoded duration function, require notes |
| `supabase/functions/verify-razorpay-payment/index.ts` | Remove hardcoded duration function, require notes |
| `src/pages/PaymentSuccess.tsx` | Dynamic duration display |

---

## Safety Guarantees

After implementation:
1. **Trial:** Always reads `free_trial_days` from admin config (already working)
2. **Plan Duration:** Always reads `duration_days` from database, never hardcoded
3. **Payment Flow:** Order notes carry plan info end-to-end
4. **UI Sync:** All upgrade UI already reads from `useAdminConfig()` (verified)
5. **Failure Mode:** Clear errors instead of silent fallbacks

---

## Validation Checklist

After implementation, verify:
- [ ] New user gets exactly 7-day trial (or admin-configured value)
- [ ] Payment for Pro Yearly (₹299) activates 365 days access
- [ ] Payment for Pro Monthly (₹99) activates 30 days access
- [ ] PaymentSuccess page shows "1 year" for yearly plan
- [ ] If admin changes monthly to 45 days, next payment uses 45 days
- [ ] If plan is deleted from admin, payment fails with clear error
- [ ] Edge function logs show duration being read from notes, not calculated

