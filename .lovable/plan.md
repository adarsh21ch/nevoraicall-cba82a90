
# Upgrade Subscription Plan System with Display Name Support

## Overview
Add a `display_name` column to the plans table so admins can set marketing-friendly names like "3 Months + 1 Month FREE" instead of auto-generated "4 Months" labels. The frontend will always show `display_name` instead of computing labels from `duration_days`.

---

## Changes

### 1. Database Migration
Add `display_name` column to `admin_subscription_plans`:
- Type: `text`, nullable, defaults to `NULL`
- When `NULL`, frontend falls back to `plan_name`
- Update `get_app_config()` function to include `display_name` in its output

### 2. Admin Panel -- PlansManager (`src/components/admin/PlansManager.tsx`)
- Add `display_name` input field to the plan edit form (labeled "Display Name (shown to users)")
- Add helper text: "Marketing-friendly name shown on upgrade page, e.g. '3 Months + 1 Month FREE'"
- Show `display_name` in the plan card if set

### 3. Types Update (`src/hooks/useAdminConfig.ts`)
- Add `display_name?: string | null` to `SubscriptionPlan` interface

### 4. Payment Links Hook (`src/hooks/usePaymentLinks.ts`)
- Map `display_name` from admin plans into `PlanConfig`
- Add `displayName` field to `PlanConfig` interface

### 5. TierCard UI (`src/components/subscription/TierCard.tsx`)
- Remove `formatDuration()` function entirely
- Replace `formatDuration(plan.durationDays)` with `plan.displayName || plan.name`
- This ensures the upgrade page shows whatever the admin typed, no auto-generation

### 6. UpgradeDrawer (`src/components/subscription/UpgradeDrawer.tsx`)
- Update the CTA button text to use `displayName` when available

---

## Technical Details

**Migration SQL:**
```sql
ALTER TABLE admin_subscription_plans
ADD COLUMN display_name text;
```

**get_app_config() update** -- add `'display_name', display_name` to the plans jsonb output.

**Files modified:**
- `src/hooks/useAdminConfig.ts` -- add `display_name` to `SubscriptionPlan` type
- `src/hooks/usePaymentLinks.ts` -- add `displayName` to `PlanConfig`, map from plan data
- `src/components/subscription/TierCard.tsx` -- remove `formatDuration`, use `displayName`
- `src/components/subscription/UpgradeDrawer.tsx` -- use `displayName` in CTA button
- `src/components/admin/PlansManager.tsx` -- add `display_name` field to edit form

**Backward compatibility:** If `display_name` is empty/null, falls back to `plan_name`. No existing columns removed. Existing plans continue working.
