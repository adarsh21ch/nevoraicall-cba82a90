
# Complete Admin Panel & Lead Limits Fix Plan

## Current Issues Summary

Based on my analysis, here are the confirmed bugs:

| Issue | Root Cause | Severity |
|-------|-----------|----------|
| Audit Log shows "Failed to load audit logs" | Table is empty - no admin actions are being logged | High |
| Daily upload limit (50) not enforced | No tracking table, no enforcement logic anywhere | Critical |
| Plan updates not reflecting in app | Cache not invalidated after admin changes | Medium |
| Offers missing payment link | Schema and UI missing offer_payment_link field | Medium |
| Coupon doesn't change payment link | No logic to swap payment links | Medium |

---

## Phase 1: Fix Audit Logging

**Problem**: Admin actions (plan CRUD, offer CRUD, limit updates, feature flag updates) are not being logged to the audit log. Only user pro grants/revokes in EnhancedUsersTab are logged.

**Solution**: Add `logAdminAction()` calls to all admin operations.

### Files to Modify

**1. src/components/admin/PlansManager.tsx**
- Import `logAdminAction` from `@/hooks/useAuditLogs`
- Add logging after:
  - `createPlan()` success: `logAdminAction('plan_created', 'plan', planId, null, planData, 'Created plan: ' + planName)`
  - `updatePlan()` success: `logAdminAction('plan_updated', 'plan', planId, oldPlan, newPlan, 'Updated plan: ' + planName)`
  - `deletePlan()` success: `logAdminAction('plan_deleted', 'plan', planId, oldPlan, null, 'Deleted plan: ' + planName)`
  - Toggle active: `logAdminAction('plan_updated', 'plan', id, {is_active: !old}, {is_active: new}, 'Plan status changed')`

**2. src/components/admin/OffersManager.tsx**
- Import `logAdminAction`
- Add logging for create/update/delete/toggle operations

**3. src/components/admin/UsageLimitsManager.tsx**
- Import `logAdminAction`
- Add logging in `handleSaveAll()` for each limit change:
  - `logAdminAction('limit_updated', 'limit', limitId, {config_key, old_value}, {config_key, new_value}, 'Updated ' + limitKey)`

**4. src/components/admin/FeatureFlagsManager.tsx**
- Import `logAdminAction`
- Add logging for flag updates

---

## Phase 2: Daily Upload Limit Enforcement (Critical)

**Problem**: `admin_usage_limits` shows `free_daily_upload: 50` but users can import 100+ leads. No enforcement exists.

### Database Changes

**1. Create `user_daily_uploads` tracking table**
```sql
CREATE TABLE public.user_daily_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  upload_date DATE NOT NULL DEFAULT CURRENT_DATE,
  upload_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, upload_date)
);

ALTER TABLE user_daily_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own uploads"
  ON user_daily_uploads FOR SELECT
  USING (auth.uid() = user_id);
```

**2. Create `check_upload_limit` RPC function**
```sql
CREATE OR REPLACE FUNCTION public.check_upload_limit(p_user_id UUID, p_count INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_is_pro BOOLEAN;
  v_total_added INTEGER;
  v_today_count INTEGER;
  v_free_total_limit INTEGER;
  v_free_daily_limit INTEGER;
  v_pro_daily_limit INTEGER;
BEGIN
  -- Check if user is Pro
  SELECT (plan = 'pro' AND (expires_at IS NULL OR expires_at > NOW()))
  INTO v_is_pro
  FROM user_subscriptions
  WHERE user_id = p_user_id;
  
  v_is_pro := COALESCE(v_is_pro, false);
  
  -- Get user's total leads added
  SELECT COALESCE(total_leads_added, 0) INTO v_total_added
  FROM profiles WHERE user_id = p_user_id;
  
  -- Get today's upload count
  SELECT COALESCE(upload_count, 0) INTO v_today_count
  FROM user_daily_uploads
  WHERE user_id = p_user_id AND upload_date = CURRENT_DATE;
  
  -- Get limits from admin config
  SELECT config_value INTO v_free_total_limit
  FROM admin_usage_limits WHERE config_key = 'free_total_leads' AND is_enabled = true;
  
  SELECT config_value INTO v_free_daily_limit
  FROM admin_usage_limits WHERE config_key = 'free_daily_upload' AND is_enabled = true;
  
  SELECT config_value INTO v_pro_daily_limit
  FROM admin_usage_limits WHERE config_key = 'pro_daily_upload' AND is_enabled = true;
  
  -- Defaults
  v_free_total_limit := COALESCE(v_free_total_limit, 1000);
  v_free_daily_limit := COALESCE(v_free_daily_limit, 50);
  v_pro_daily_limit := COALESCE(v_pro_daily_limit, 500);
  
  -- Pro user check
  IF v_is_pro THEN
    IF v_pro_daily_limit > 0 AND (v_today_count + p_count) > v_pro_daily_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Daily Pro upload limit reached (' || v_pro_daily_limit || '/day)',
        'limit_type', 'pro_daily'
      );
    END IF;
    RETURN jsonb_build_object('allowed', true, 'reason', '', 'limit_type', 'pro');
  END IF;
  
  -- Free user: check total limit first
  IF (v_total_added + p_count) > v_free_total_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Total free leads limit reached (' || v_free_total_limit || '). Upgrade to Pro for unlimited.',
      'limit_type', 'total'
    );
  END IF;
  
  -- Free user: check daily limit
  IF (v_today_count + p_count) > v_free_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Daily free upload limit reached (' || v_free_daily_limit || '/day). Try again tomorrow or upgrade to Pro.',
      'limit_type', 'daily'
    );
  END IF;
  
  RETURN jsonb_build_object('allowed', true, 'reason', '', 'limit_type', 'free');
END;
$$;
```

**3. Create `increment_daily_upload` RPC function**
```sql
CREATE OR REPLACE FUNCTION public.increment_daily_upload(p_user_id UUID, p_count INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  INSERT INTO user_daily_uploads (user_id, upload_date, upload_count)
  VALUES (p_user_id, CURRENT_DATE, p_count)
  ON CONFLICT (user_id, upload_date)
  DO UPDATE SET 
    upload_count = user_daily_uploads.upload_count + p_count,
    updated_at = now()
  RETURNING upload_count INTO v_new_count;
  
  RETURN v_new_count;
END;
$$;
```

### Frontend Changes

**1. Create `src/hooks/useDailyUploadLimit.ts`**
```typescript
export function useDailyUploadLimit() {
  const { user } = useAuth();
  
  const checkLimit = async (count: number): Promise<{allowed: boolean; reason: string}> => {
    const { data, error } = await supabase.rpc('check_upload_limit', {
      p_user_id: user.id,
      p_count: count
    });
    if (error) return { allowed: true, reason: '' }; // Fail open
    return data;
  };
  
  const incrementCount = async (count: number) => {
    await supabase.rpc('increment_daily_upload', {
      p_user_id: user.id,
      p_count: count
    });
  };
  
  return { checkLimit, incrementCount };
}
```

**2. Update `src/components/prospects/ImportExcelDialog.tsx`**
- Import `useDailyUploadLimit`
- Before starting import, call `checkLimit(prospects.length)`
- If not allowed, show error with specific reason
- After successful import, call `incrementCount(result.imported)`

**3. Update `src/hooks/useProspectsQuery.ts`**
- In `addMutation.mutationFn`, add daily limit check before insert
- After successful insert, increment daily count

---

## Phase 3: Offer Payment Links

**Problem**: Offers have no payment link field. When coupon is applied, payment link doesn't change.

### Database Changes

```sql
ALTER TABLE admin_offers 
ADD COLUMN offer_payment_link TEXT;
```

### Frontend Changes

**1. Update `src/components/admin/OffersManager.tsx`**
- Add `offer_payment_link` field to OfferEditForm
- Make it required for active offers
- Show validation error if missing

**2. Update offer types in `src/hooks/useAdminConfig.ts`**
```typescript
export interface Offer {
  // ... existing fields
  offer_payment_link: string | null;
}
```

**3. Update payment flow in `src/hooks/useRazorpay.ts`**
- When coupon is applied, use `offer_payment_link` instead of plan's `payment_link`
- Pass coupon code in payment metadata

---

## Phase 4: Cache Invalidation

**Problem**: When admin updates plans/limits/offers, user-facing components show stale data due to 5-minute cache.

### Solution

**1. Update `src/hooks/useAdminConfig.ts`**

In each admin CRUD hook (useAdminPlans, useAdminOffers, useAdminUsageLimits, useAdminFeatureFlags), after successful mutation:

```typescript
const queryClient = useQueryClient();

// After createPlan/updatePlan/deletePlan:
queryClient.invalidateQueries({ queryKey: ['admin-config'] });
```

**2. Add `refetchOnMount: 'always'` to useAdminConfig**

```typescript
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['admin-config'],
  queryFn: fetchAppConfig,
  staleTime: 5 * 60 * 1000,
  refetchOnMount: 'always', // Always refetch when component mounts
});
```

---

## Phase 5: Admin Validation

### PlansManager.tsx
- Before saving, validate `payment_link` is not empty
- Show toast error: "Payment link is required"

### OffersManager.tsx
- Before saving, validate:
  - `offer_payment_link` is not empty (when is_active = true)
  - `applicable_plan_ids` has at least one plan
- Show specific error messages

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `src/hooks/useDailyUploadLimit.ts` | Daily limit checking hook |

### Database Migration
- Create `user_daily_uploads` table
- Add `check_upload_limit` function
- Add `increment_daily_upload` function
- Add `offer_payment_link` column to `admin_offers`

### Modified Files
| File | Changes |
|------|---------|
| `src/components/admin/PlansManager.tsx` | Add audit logging, validation |
| `src/components/admin/OffersManager.tsx` | Add audit logging, payment link field, validation |
| `src/components/admin/UsageLimitsManager.tsx` | Add audit logging |
| `src/components/admin/FeatureFlagsManager.tsx` | Add audit logging |
| `src/components/prospects/ImportExcelDialog.tsx` | Add daily limit check |
| `src/hooks/useProspectsQuery.ts` | Add daily limit check in addProspect |
| `src/hooks/useAdminConfig.ts` | Add cache invalidation, update Offer type |
| `src/hooks/useRazorpay.ts` | Use offer payment link when coupon applied |

---

## Implementation Order

1. **Database migration** - Create tables and functions
2. **Audit logging** - Fix PlansManager, OffersManager, UsageLimitsManager, FeatureFlagsManager
3. **Daily limit enforcement** - Create hook, update ImportExcelDialog and useProspectsQuery
4. **Offer payment links** - Schema change, UI update
5. **Cache invalidation** - Update admin hooks
6. **Validation** - Add to admin forms

---

## Expected Outcomes

After implementation:
- Audit log shows all admin actions with old/new values
- Free users blocked at 50 leads/day with clear error message
- Plan updates instantly visible in upgrade popup (no stale data)
- Offers have dedicated payment links that apply when coupon used
- Admin cannot save incomplete configurations
