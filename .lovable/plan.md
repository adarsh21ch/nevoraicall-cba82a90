

# Recurring Subscription Architecture for Razorpay

## Overview

Add support for Razorpay recurring subscriptions alongside existing one-time payments. This introduces a `billing_type` field to plans, a new edge function for creating Razorpay subscriptions, webhook handlers for subscription lifecycle events, and a `razorpay_subscription_id` column on `user_subscriptions`.

---

## STEP 1: Database Schema Changes

### Table: `admin_subscription_plans`
Add two new columns:

| Column | Type | Default | Purpose |
|---|---|---|---|
| `billing_type` | `text` | `'one_time'` | Either `one_time` or `recurring` |
| `razorpay_plan_id` | `text` | `NULL` | Razorpay Plan ID for recurring plans (e.g., `plan_XXXXX`) |

Add a CHECK constraint: `billing_type IN ('one_time', 'recurring')`

### Table: `user_subscriptions`
Add one new column:

| Column | Type | Default | Purpose |
|---|---|---|---|
| `razorpay_subscription_id` | `text` | `NULL` | Tracks the active Razorpay subscription for cancellation/management |

### Table: `user_funnel_subscriptions`
Add the same column for consistency:

| Column | Type | Default | Purpose |
|---|---|---|---|
| `razorpay_subscription_id` | `text` | `NULL` | Tracks the active Razorpay subscription |

All existing data remains untouched -- `billing_type` defaults to `'one_time'` so current plans continue working.

---

## STEP 2: Admin Panel -- PlansManager UI Changes

### File: `src/components/admin/PlansManager.tsx`

Update the `PlanEditForm` to add:

1. **Billing Type dropdown** with two options: "One Time" and "Recurring"
2. **Conditional fields:**
   - If `billing_type = 'one_time'`: Show "Payment Link" field (existing behavior)
   - If `billing_type = 'recurring'`: Show "Razorpay Plan ID" field instead
3. **Validation:**
   - One-time plans require `payment_link`
   - Recurring plans require `razorpay_plan_id`
   - `duration_days` remains required for both (used for expiry calculation on renewal)

Update the `PlanCard` to show a "Recurring" badge when `billing_type = 'recurring'`.

### File: `src/hooks/useAdminConfig.ts`

Add `billing_type` and `razorpay_plan_id` to the `SubscriptionPlan` interface.

---

## STEP 3: New Edge Function -- `create-razorpay-subscription`

### File: `supabase/functions/create-razorpay-subscription/index.ts`

This function creates a Razorpay Subscription (not an Order) when the user selects a recurring plan.

**Flow:**
1. Receive `user_id`, `user_email`, `plan_type` from client
2. Fetch plan from `admin_subscription_plans` -- verify `billing_type = 'recurring'` and `razorpay_plan_id` exists
3. Call Razorpay API `POST /v1/subscriptions` with:
   - `plan_id`: from database
   - `total_count`: 12 (or configurable -- max billing cycles)
   - `notes`: `{ user_id, user_email, plan_scope, duration_days }`
4. Return `subscription_id`, `short_url` (Razorpay hosted checkout URL), and `key_id` to client

**Config:** `verify_jwt = false` in `supabase/config.toml` (auth validated in code).

---

## STEP 4: Upgrade Razorpay Webhook

### File: `supabase/functions/razorpay-webhook/index.ts`

Keep the existing `payment.captured` handler for one-time payments. Add handlers for:

### `subscription.activated`
- Extract `subscription_id`, `plan_id` from payload
- Look up `duration_days` and `plan_scope` from `admin_subscription_plans` using the `razorpay_plan_id`
- Find user via `notes.user_email` in the subscription entity
- Upsert into `user_subscriptions` (or `user_funnel_subscriptions` based on scope):
  - `plan = 'pro'`, `status = 'active'`
  - `expires_at = now() + duration_days`
  - `razorpay_subscription_id = subscription_id`
- Log to `payments_log`

### `subscription.charged`
- This fires on each renewal payment
- Find user by `razorpay_subscription_id` in `user_subscriptions`
- Extend `expires_at` by `duration_days` (from the plan config)
- Log to `payments_log`

### `subscription.cancelled`
- Find user by `razorpay_subscription_id`
- Set `status = 'cancelled'` (keep `expires_at` so access continues until expiry)
- Log to `payments_log`

### `subscription.completed`
- Find user by `razorpay_subscription_id`
- Set `status = 'expired'`
- Log to `payments_log`

**Key safeguards:**
- Idempotency: Check if subscription row already exists before creating
- Duration lookup: Always from `admin_subscription_plans` via `razorpay_plan_id` match
- Backward compatible: `payment.captured` flow unchanged for one-time plans

---

## STEP 5: Upgrade User Payment Flow

### File: `src/hooks/useRazorpay.ts`

Add a new method `initiateSubscription` alongside existing `initiatePayment`:

1. Call `create-razorpay-subscription` edge function
2. Receive `subscription_id` and checkout options
3. Open Razorpay checkout with `subscription_id` instead of `order_id`
4. On success callback, redirect to `/payment-success?type=subscription&subscription_id=...`
5. Do NOT grant Pro access here -- wait for webhook `subscription.activated`

### File: `src/components/subscription/UpgradeDrawer.tsx`

Update `handleUpgrade`:

```text
if plan.billing_type === 'recurring':
  call initiateSubscription(planKey)
else:
  call initiatePayment(planKey)   // existing flow
```

### File: `src/components/subscription/UpgradeCard.tsx`

Same conditional logic for billing type.

### File: `src/pages/PaymentSuccess.tsx`

Add handling for subscription-based payments:
- If `type=subscription` in query params, show "Subscription initiated -- waiting for activation" state
- Poll or use realtime listener on `user_subscriptions` to detect when webhook activates the subscription
- Then show success screen

---

## STEP 6: Type Updates

### File: `src/hooks/usePaymentLinks.ts`

Add `billing_type` and `razorpay_plan_id` to `PlanConfig` interface.

### File: `src/hooks/useSubscription.ts`

Add `razorpay_subscription_id` to the `Subscription` interface.

---

## Files to Create/Modify

| File | Action |
|---|---|
| **Migration SQL** | Add columns to 3 tables |
| `supabase/functions/create-razorpay-subscription/index.ts` | **New** -- creates Razorpay subscription |
| `supabase/config.toml` | Add entry for new edge function |
| `supabase/functions/razorpay-webhook/index.ts` | Add subscription event handlers |
| `src/hooks/useAdminConfig.ts` | Add `billing_type`, `razorpay_plan_id` to types |
| `src/hooks/usePaymentLinks.ts` | Add new fields to `PlanConfig` |
| `src/hooks/useSubscription.ts` | Add `razorpay_subscription_id` to interface |
| `src/hooks/useRazorpay.ts` | Add `initiateSubscription` method |
| `src/components/admin/PlansManager.tsx` | Add billing type UI + conditional fields |
| `src/components/subscription/UpgradeDrawer.tsx` | Route to correct payment flow |
| `src/components/subscription/UpgradeCard.tsx` | Route to correct payment flow |
| `src/pages/PaymentSuccess.tsx` | Handle subscription-type payments |

---

## Backward Compatibility

- All existing plans default to `billing_type = 'one_time'` -- zero disruption
- Existing `payment.captured` webhook logic is untouched
- Existing Pro users with active subscriptions are unaffected
- The `useSubscription` hook continues to work -- `razorpay_subscription_id` is simply nullable
- No secrets need to be added -- the existing `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` are reused

---

## Razorpay Webhook Configuration Reminder

After deployment, you must add these events to your Razorpay Dashboard webhook settings (Settings > Webhooks):
- `subscription.activated`
- `subscription.charged`
- `subscription.cancelled`
- `subscription.completed`

The existing `payment.captured` event stays enabled.

