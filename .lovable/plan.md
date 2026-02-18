

# Phase 1: Safe 3-Tier Subscription Migration

This is a **phased, additive-only migration** from the current 2-tier (Free/Pro) system to a 3-tier (Basic/Pro/Premium) system. No existing columns, enums, or logic will be removed.

---

## Database Changes (Migration SQL)

### 1. Add `premium` to `user_plan` enum
```sql
ALTER TYPE user_plan ADD VALUE IF NOT EXISTS 'premium';
```
Existing `free` and `pro` values remain untouched.

### 2. Add `tier` column to `user_subscriptions`
- `tier TEXT DEFAULT 'basic' CHECK (tier IN ('basic','pro','premium'))`
- Backfill: rows with `plan = 'pro'` and `status = 'active'` and not expired get `tier = 'pro'`; all others get `tier = 'basic'`

### 3. Add `tier` column to `user_funnel_subscriptions`
- Same as above

### 4. Add `tier` column to `admin_subscription_plans`
- `tier TEXT NOT NULL DEFAULT 'pro' CHECK (tier IN ('basic','pro','premium'))`
- All existing plans automatically default to `'pro'`

### 5. Add `required_tier` and `module` to `admin_feature_flags`
- `required_tier TEXT NOT NULL DEFAULT 'basic' CHECK (required_tier IN ('basic','pro','premium'))`
- `module TEXT NOT NULL DEFAULT 'application' CHECK (module IN ('application','trackup','funnels'))`
- Backfill: where `free_access = true` set `required_tier = 'basic'`; where `free_access = false` set `required_tier = 'pro'`
- Old columns (`free_access`, `pro_access`, `trial_access`, `free_limit`, `pro_limit`, `trial_limit`) are **kept** -- not removed

### 6. Add tier columns to `admin_usage_limits`
- `module TEXT NOT NULL DEFAULT 'application'`
- `basic_value INTEGER`
- `pro_value INTEGER`
- `premium_value INTEGER`
- Backfill: copy `config_value` to `basic_value`

### 7. Update `get_app_config` RPC
Add the new fields to each JSON section:
- Plans: include `tier`, `billing_type`, `razorpay_plan_id`
- Features: include `required_tier`, `module`
- Limits: include `module`, `basic_value`, `pro_value`, `premium_value`

---

## Core Permission System Updates

### `src/hooks/useAdminConfig.ts`
- Add `tier`, `required_tier`, `module` to `SubscriptionPlan` and `FeatureFlag` interfaces
- Add `billing_type` and `razorpay_plan_id` to plan JSON parsing in `get_app_config` result
- Update `SAFE_DEFAULTS` with new fields

### `src/hooks/useSubscription.ts`
- Read `tier` column from subscription data
- Export `userTier: 'basic' | 'pro' | 'premium'`
- Compute: `isPro = tier >= pro`, `isPremium = tier === 'premium'`, `isPaid = tier !== 'basic'`
- Keep existing `plan` and `isPro` exports for backward compat

### `src/hooks/useFunnelSubscription.ts`
- Same tier export pattern

### `src/hooks/useFeatureAccess.ts`
- Add tier-based access check alongside existing logic
- If `feature.required_tier` exists, use tier comparison: `userTier >= required_tier`
- If `required_tier` is missing (old data), fall back to existing `free_access`/`pro_access` logic
- This ensures zero breakage during transition

### `src/contexts/PermissionsContext.tsx`
- Add `userTier` to context value
- Add `isPremium` to context
- Use tier-based check when `required_tier` is present on feature
- Fall back to old boolean logic otherwise

---

## Admin Panel UI Updates

### `src/components/admin/PlansManager.tsx`
- Add **Tier** dropdown (Basic / Pro / Premium) to the plan edit form
- Show tier badge on each plan card
- Validate: Basic tier plans must have `price_inr = 0`
- Group plans by tier in the list

### `src/components/admin/FeatureFlagsManager.tsx`
- Add **Required Tier** selector (Basic / Pro / Premium) alongside existing toggles
- Add **Module** dropdown (Application / TrackUp / Funnels)
- Keep existing Free/Pro toggles visible but add deprecation hint
- When `required_tier` is changed, auto-sync the old boolean columns for backward compat

### `src/components/admin/UsageLimitsManager.tsx`
- Add 3 value inputs per limit row: Basic / Pro / Premium
- Add module selector per limit
- Keep existing single `config_value` field synced with `basic_value`

---

## Webhook & Payment Updates

### `supabase/functions/razorpay-webhook/index.ts`
- In `lookupPlanByRazorpayId`, also return `tier` from `admin_subscription_plans`
- In `payment.captured` and `subscription.activated`: read `tier` from plan, store it in subscription upsert
- If `tier` is not found (old plans), default to `'pro'` for backward compat
- In `subscription.completed`: set `tier = 'basic'` (downgrade)

### `supabase/functions/create-razorpay-order/index.ts`
- Include `tier` in order notes

### `supabase/functions/create-razorpay-subscription/index.ts`
- Include `tier` in subscription notes

---

## Files to Modify

| File | Change |
|---|---|
| **Migration SQL** | Add columns to 5 tables, backfill data, update `get_app_config` RPC |
| `src/hooks/useAdminConfig.ts` | Add tier/module types, update SAFE_DEFAULTS |
| `src/hooks/useSubscription.ts` | Add `userTier`, `isPremium`, keep `isPro` |
| `src/hooks/useFunnelSubscription.ts` | Add `tier` export |
| `src/hooks/useFeatureAccess.ts` | Dual-mode: tier-based + fallback to boolean |
| `src/contexts/PermissionsContext.tsx` | Add `userTier`, `isPremium`, tier-based check |
| `src/components/admin/PlansManager.tsx` | Add Tier dropdown + badge |
| `src/components/admin/FeatureFlagsManager.tsx` | Add Required Tier + Module selectors |
| `src/components/admin/UsageLimitsManager.tsx` | Add 3 tier value inputs + module |
| `supabase/functions/razorpay-webhook/index.ts` | Read/store tier |
| `supabase/functions/create-razorpay-order/index.ts` | Pass tier in notes |
| `supabase/functions/create-razorpay-subscription/index.ts` | Pass tier in notes |

---

## Backward Compatibility Guarantees

- `user_plan` enum: `free` and `pro` values untouched, `premium` added
- `free_access` / `pro_access` / `trial_access` columns: **kept** in `admin_feature_flags`
- Existing `config_value` column: **kept** in `admin_usage_limits`
- `plan` column in `user_subscriptions`: **kept** as-is, `tier` is a new parallel column
- All existing Pro users: `tier` backfilled to `'pro'`, no access change
- All existing Free users: `tier` backfilled to `'basic'`, no access change
- Webhook `payment.captured`: existing logic unchanged, `tier` defaults to `'pro'` if missing
- `isPro` and `isPaid` exports: kept as computed values from `tier`

