

# Comprehensive Admin Configuration Panel Implementation Plan

## Executive Summary

This plan transforms the Nevorai/TrackUp Admin Panel into a complete business control center where all subscription plans, pricing, offers, usage limits, and feature flags are managed from the backend - eliminating hardcoded values from the frontend.

## Current State Analysis

### Current Hardcoded Values (Problems to Solve)
| Location | Hardcoded Values |
|----------|------------------|
| `usePaymentLinks.ts` | Plan names, prices (₹99, ₹299), durations (30, 120 days), payment links, features list, FREE_LEAD_LIMIT (500) |
| `useRazorpay.ts` | PLAN_CONFIG with amounts (9900, 29900 paise), duration_days |
| `useLifetimeLeadLimit.ts` | FREE_LIFETIME_LEAD_LIMIT (1000), LEAD_WARNING_THRESHOLD (950) |
| `useUpgradeNudge.ts` | NUDGE_THRESHOLDS (800, 900, 950, 1000) |
| `UpgradeDrawer.tsx` | Plan display logic, feature lists |
| `Admin.tsx` | DURATION_OPTIONS array |

### Current Tables Available
- `user_subscriptions` - User plan status, expiry, admin override
- `user_roles` - Admin role checking via `has_role()` function
- `profiles` - User profile with `total_leads_added` counter
- `payments_log` - Payment history

---

## Phase 1: Database Schema Design

### New Tables to Create

```text
+---------------------------+
| admin_subscription_plans  |
+---------------------------+
| id (uuid, PK)            |
| plan_key (text, unique)  | e.g., 'monthly', 'quarterly', '6month'
| plan_name (text)         | e.g., 'Pro Monthly'
| description (text)       |
| price_inr (integer)      | Price in rupees (99, 299, etc.)
| duration_days (integer)  | 30, 120, 180, etc.
| payment_link (text)      | Razorpay static link
| features (jsonb)         | Array of feature strings
| is_active (boolean)      | Show/hide plan
| is_default (boolean)     | Default selected plan
| sort_order (integer)     | Display order
| badge_text (text, null)  | e.g., "Best Value", "Popular"
| created_at (timestamptz) |
| updated_at (timestamptz) |
+---------------------------+

+---------------------------+
| admin_offers              |
+---------------------------+
| id (uuid, PK)            |
| offer_name (text)        | e.g., 'Welcome 50% Off'
| discount_type (text)     | 'percent' or 'flat'
| discount_value (integer) | 50 for 50%, or 100 for ₹100 off
| applicable_plan_ids (uuid[]) | Plans this offer applies to
| start_date (timestamptz) |
| end_date (timestamptz)   |
| is_active (boolean)      |
| max_uses_per_user (int)  | null = unlimited
| promo_code (text, null)  | Optional code
| created_at (timestamptz) |
| updated_at (timestamptz) |
+---------------------------+

+---------------------------+
| admin_usage_limits        |
+---------------------------+
| id (uuid, PK)            |
| config_key (text, unique)| e.g., 'free_total_leads', 'free_daily_upload'
| config_value (integer)   | The limit value
| description (text)       | Human-readable description
| is_enabled (boolean)     | Toggle enforcement
| updated_at (timestamptz) |
| updated_by (uuid)        | Admin who last changed
+---------------------------+

Default rows:
- 'free_total_leads' = 1000
- 'free_daily_upload' = 100
- 'pro_daily_upload' = 500 (or null for unlimited)
- 'warning_threshold_1' = 800
- 'warning_threshold_2' = 900
- 'warning_threshold_3' = 950
- 'hard_limit' = 1000

+---------------------------+
| admin_feature_flags       |
+---------------------------+
| id (uuid, PK)            |
| feature_key (text, unique)| e.g., 'insights', 'export', 'ai_tips'
| feature_name (text)      | Display name
| description (text)       |
| free_access (boolean)    | Can free users use it?
| pro_access (boolean)     | Can pro users use it?
| is_enabled (boolean)     | Global toggle
| created_at (timestamptz) |
| updated_at (timestamptz) |
+---------------------------+

+---------------------------+
| admin_user_overrides      |
+---------------------------+
| id (uuid, PK)            |
| user_id (uuid, FK)       | References auth.users
| force_pro_access (bool)  | Bypass subscription check
| custom_daily_limit (int) | Override daily upload limit
| custom_total_limit (int) | Override total lead limit
| custom_expiry_date (date)| Override plan expiry
| notes (text)             | Internal admin notes
| created_by (uuid)        | Admin who created
| created_at (timestamptz) |
| updated_at (timestamptz) |
+---------------------------+
```

### RLS Policies

All tables will use admin-only policies:

```sql
-- Read: Any authenticated user can read (for frontend config fetch)
CREATE POLICY "Anyone can read config"
  ON admin_subscription_plans FOR SELECT
  USING (true);

-- Write: Only admins can modify
CREATE POLICY "Only admins can modify plans"
  ON admin_subscription_plans FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
```

User overrides table is admin-only for all operations.

---

## Phase 2: Admin UI Components

### New Tab Structure in Admin Panel

```text
Admin Panel Tabs:
├── Users (existing)
├── Analytics (existing)  
├── Support (existing)
├── Plans Manager (NEW)
├── Offers (NEW)
├── Usage Limits (NEW)
├── Feature Flags (NEW)
└── User Overrides (NEW - merged into Users tab)
```

### 2.1 Plans Manager Component
**File:** `src/components/admin/PlansManager.tsx`

UI Features:
- Card-based list of all plans (active/inactive grouped)
- Each card shows: Name, Price, Duration, Status badge, Payment link (truncated)
- Actions: Edit (opens drawer), Toggle Active, Drag to reorder
- "Add New Plan" button opens creation drawer
- Edit drawer has all fields including feature list editor

### 2.2 Offers Manager Component
**File:** `src/components/admin/OffersManager.tsx`

UI Features:
- List of offers with active/expired status
- Date range display
- Quick toggle for activation
- Create/edit drawer with:
  - Offer name, type (% or flat), value
  - Multi-select for applicable plans
  - Date pickers for start/end
  - Max uses input

### 2.3 Usage Limits Component
**File:** `src/components/admin/UsageLimitsManager.tsx`

UI Features:
- Simple table/list with editable inline values
- Categories: Free Limits, Pro Limits, Warning Thresholds
- Each row: Config name, Current value, Enable toggle
- Save Changes button (batch update)
- Reset to Defaults option

### 2.4 Feature Flags Component  
**File:** `src/components/admin/FeatureFlagsManager.tsx`

UI Features:
- Grid of feature cards
- Each card: Feature name, Free access toggle, Pro access toggle, Global enable toggle
- Visual indicators for current state
- Quick toggle without opening a modal

### 2.5 User Overrides (Extended Users Tab)
**Enhanced:** `src/pages/Admin.tsx` Users tab

New per-user controls:
- "Override" button/expander on each user row
- Fields: Force Pro, Custom Limits, Custom Expiry, Notes
- Visual badge when user has active overrides

---

## Phase 3: Frontend Hooks Refactoring

### 3.1 New Config Fetching Hook
**File:** `src/hooks/useAdminConfig.ts`

```typescript
interface AppConfig {
  plans: SubscriptionPlan[];
  offers: Offer[];
  limits: Record<string, number>;
  features: Record<string, FeatureFlag>;
}

export function useAdminConfig() {
  // Fetch all admin config tables on app load
  // Cache with 5-minute stale time
  // Provides safe defaults if fetch fails
  return { config, loading, error };
}
```

### 3.2 Refactored usePaymentLinks.ts

**Before:** Hardcoded PLAN_CONFIG, PAYMENT_LINKS
**After:** Reads from `useAdminConfig()` → config.plans

```typescript
export function usePaymentLinks() {
  const { config } = useAdminConfig();
  const activePlans = config.plans.filter(p => p.is_active);
  
  const openPaymentLink = (planKey: string) => {
    const plan = activePlans.find(p => p.plan_key === planKey);
    if (plan?.payment_link) {
      window.location.href = plan.payment_link;
    }
  };
  
  return { plans: activePlans, openPaymentLink };
}
```

### 3.3 Refactored useLifetimeLeadLimit.ts

**Before:** Hardcoded FREE_LIFETIME_LEAD_LIMIT = 1000
**After:** Reads from config.limits['free_total_leads']

Also checks `admin_user_overrides` for per-user custom limits.

### 3.4 Refactored useUpgradeNudge.ts

**Before:** Hardcoded NUDGE_THRESHOLDS
**After:** Reads thresholds from config.limits

### 3.5 New useFeatureAccess.ts Hook

```typescript
export function useFeatureAccess(featureKey: string) {
  const { config } = useAdminConfig();
  const { isPro } = useSubscription();
  
  const feature = config.features[featureKey];
  const canAccess = feature?.is_enabled && 
    (isPro ? feature.pro_access : feature.free_access);
  
  return { canAccess, feature };
}
```

### 3.6 Refactored UpgradeDrawer.tsx

**Before:** Hardcoded plan cards with static prices
**After:** Maps over `config.plans` to render dynamic cards

---

## Phase 4: Database Functions

### 4.1 Bulk Config Fetch
```sql
CREATE FUNCTION get_app_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'plans', (SELECT jsonb_agg(...) FROM admin_subscription_plans WHERE is_active),
    'offers', (SELECT jsonb_agg(...) FROM admin_offers WHERE is_active AND ...),
    'limits', (SELECT jsonb_object_agg(...) FROM admin_usage_limits),
    'features', (SELECT jsonb_object_agg(...) FROM admin_feature_flags)
  );
END;
$$;
```

### 4.2 Get User With Overrides
```sql
CREATE FUNCTION get_user_effective_limits(p_user_id uuid)
RETURNS TABLE(
  total_limit int,
  daily_limit int,
  is_override bool
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_override RECORD;
  v_base_total int;
  v_base_daily int;
BEGIN
  -- Check for user-specific overrides first
  SELECT * INTO v_override FROM admin_user_overrides WHERE user_id = p_user_id;
  
  -- Get base limits from config
  SELECT config_value INTO v_base_total FROM admin_usage_limits WHERE config_key = 'free_total_leads';
  SELECT config_value INTO v_base_daily FROM admin_usage_limits WHERE config_key = 'free_daily_upload';
  
  RETURN QUERY SELECT
    COALESCE(v_override.custom_total_limit, v_base_total),
    COALESCE(v_override.custom_daily_limit, v_base_daily),
    v_override.id IS NOT NULL;
END;
$$;
```

---

## Phase 5: Implementation Steps

### Step 1: Database Migration
Create all 5 new tables with appropriate columns, defaults, and RLS policies.

Seed initial data:
- 2 plans (monthly ₹99/30d, quarterly ₹299/120d) matching current setup
- Default usage limits matching current hardcoded values
- Initial feature flags for existing features

### Step 2: Create Admin UI Components
1. `PlansManager.tsx` - Full CRUD for plans
2. `OffersManager.tsx` - Offers management
3. `UsageLimitsManager.tsx` - Limits configuration
4. `FeatureFlagsManager.tsx` - Feature toggles
5. Update `Admin.tsx` to add new tabs

### Step 3: Create Config Hooks
1. `useAdminConfig.ts` - Central config fetching
2. Update `usePaymentLinks.ts` to use dynamic config
3. Update `useLifetimeLeadLimit.ts` for dynamic limits
4. Update `useUpgradeNudge.ts` for dynamic thresholds
5. Create `useFeatureAccess.ts` for feature gating

### Step 4: Update Frontend Components
1. `UpgradeDrawer.tsx` - Use dynamic plans
2. `ProgressiveNudgeBanner.tsx` - Use dynamic thresholds
3. `HardLimitModal.tsx` - Use dynamic limit values
4. Any feature-gated components - Use `useFeatureAccess`

### Step 5: Update Edge Functions
- `create-razorpay-order` - Fetch plan amount from database
- `razorpay-webhook` - Validate against configured plans

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/admin/PlansManager.tsx` | Plans CRUD UI |
| `src/components/admin/PlanEditDrawer.tsx` | Plan edit form |
| `src/components/admin/OffersManager.tsx` | Offers CRUD UI |
| `src/components/admin/OfferEditDrawer.tsx` | Offer edit form |
| `src/components/admin/UsageLimitsManager.tsx` | Limits config UI |
| `src/components/admin/FeatureFlagsManager.tsx` | Feature flags UI |
| `src/components/admin/UserOverrideDrawer.tsx` | Per-user overrides |
| `src/hooks/useAdminConfig.ts` | Central config hook |
| `src/hooks/useFeatureAccess.ts` | Feature gating hook |
| `src/hooks/usePlansConfig.ts` | Plans-specific hook |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Admin.tsx` | Add 4 new tabs, integrate new components |
| `src/hooks/usePaymentLinks.ts` | Remove hardcoded config, use dynamic |
| `src/hooks/useLifetimeLeadLimit.ts` | Dynamic limits |
| `src/hooks/useUpgradeNudge.ts` | Dynamic thresholds |
| `src/hooks/useRazorpay.ts` | Fetch plan amount from config |
| `src/components/subscription/UpgradeDrawer.tsx` | Dynamic plan rendering |
| `supabase/functions/create-razorpay-order/index.ts` | Fetch plan from DB |

---

## Safe Defaults & Fallbacks

To ensure the app never breaks if config is missing:

```typescript
const SAFE_DEFAULTS = {
  limits: {
    free_total_leads: 1000,
    free_daily_upload: 100,
    warning_threshold_1: 800,
    warning_threshold_2: 900,
    warning_threshold_3: 950,
    hard_limit: 1000,
  },
  plans: [
    { plan_key: 'monthly', price_inr: 99, duration_days: 30 },
    { plan_key: 'quarterly', price_inr: 299, duration_days: 120 },
  ],
};
```

The `useAdminConfig` hook will merge fetched data with these defaults.

---

## Summary

This implementation creates a complete admin-controlled monetization system:

1. **No Hardcoding** - All pricing, limits, and features are database-driven
2. **Instant Updates** - Changes in admin panel reflect immediately
3. **Safe Fallbacks** - App works even if config fetch fails
4. **Scalable** - Easy to add new plans, offers, or feature flags
5. **Auditable** - All changes tracked with timestamps and admin IDs
6. **Secure** - RLS ensures only admins can modify configuration

