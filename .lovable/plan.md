
# Admin Panel & Core UX Bug Fixes

## Issues Identified

### 1. Trial Banner Visibility - Config Not Applied to To-Do and TrackUp
**Root Cause**: The Admin Panel config (`admin_config_text.trial_banner_tabs`) includes `todoup,tracking`, but the `TodoUp.tsx` and `Tracking.tsx` pages are **missing the `<TrialBanner>` component** entirely. Other pages (Dashboard, ListUp, Profile) properly include it.

**Evidence**:
- `admin_config_text` shows `config_value: "dashboard,listup,profile,todoup,tracking"` with `is_enabled: true`
- Search results show `<TrialBanner tabId="...">` exists in Dashboard, ListUp, Profile, Home - but NOT in TodoUp.tsx or Tracking.tsx

**Fix**: Add `<TrialBanner tabId="todoup" />` to TodoUp.tsx and `<TrialBanner tabId="tracking" />` to Tracking.tsx in the same location pattern as other pages.

---

### 2. Audit Logs - Failed to Load
**Root Cause**: The `admin_get_audit_logs` RPC function exists and works correctly. The table has data (verified: 5+ entries visible). The issue is likely a type mismatch similar to the `admin_get_pro_users` error visible in console logs.

**Console Errors Found**:
```
[useProUsers] Error: {
  "code": "42804",
  "details": "Returned type integer does not match expected type bigint in column 11.",
  "message": "structure of query does not match function result type"
}
```

This indicates the return type declarations in one or more admin RPC functions have type mismatches. Need to verify the `admin_get_audit_logs` function signature matches its return values.

**Fix**: Create a migration to fix the type casting in `admin_get_pro_users` (cast `payment_amount` to `bigint`) and audit `admin_get_audit_logs` for similar issues.

---

### 3. Admin Analytics - Data Not Loading
**Root Cause**: Similar type mismatch issues in RPC functions. The `admin_get_pro_users` error cascades because analytics depend on subscription data.

The following need verification/fixes:
- `admin_get_trial_analytics` - Uses `trial_duration_days` config key but admin uses `free_trial_days`
- `admin_get_offer_analytics` - May have similar casting issues
- `admin_get_recent_payments` - Revenue section depends on this

**Fix**: 
1. Update `admin_get_trial_analytics` to read from correct config key (`free_trial_days` instead of `trial_duration_days`)
2. Fix type casting in `admin_get_pro_users` 
3. Verify other analytics functions work correctly

---

### 4. Safe Delete UX (Undo + Restore)
**Current State**: 
- Delete is immediate and permanent (hard delete)
- `restoreProspect` and `restoreProspects` functions exist but require the deleted data to be preserved
- No "Undo" toast with restore action
- No "Recently Deleted" section in Profile

**Required Implementation**:

#### A. Undo on Delete (Toast with Undo)
- After delete, show toast: "X item(s) deleted" with "Undo" button
- Store deleted items temporarily in component state (3-5 second window)
- Use existing `restoreProspect` / `restoreProspects` functions to restore

#### B. Soft Delete Architecture (For Recently Deleted)
- Add `deleted_at` column to `prospects` table (nullable timestamp)
- Modify delete operations to SET `deleted_at = now()` instead of hard DELETE
- Update all prospect queries to filter WHERE `deleted_at IS NULL`
- Create "Recently Deleted" view in Profile with restore option
- Background cleanup: Auto-purge items older than 30 days

---

## Technical Implementation Plan

### Phase 1: Trial Banner Visibility Fix
**Files to modify:**
| File | Change |
|------|--------|
| `src/pages/TodoUp.tsx` | Add `<TrialBanner tabId="todoup" />` after header |
| `src/pages/Tracking.tsx` | Add `<TrialBanner tabId="tracking" />` after header |

Both pages need to:
1. Import `TrialBanner` from `@/components/subscription/TrialBanner`
2. Add the component in the main content area, typically at the start of the container

---

### Phase 2: Admin RPC Type Fixes
**Database Migration:**

```sql
-- Fix admin_get_pro_users type mismatch (payment_amount should be bigint)
CREATE OR REPLACE FUNCTION public.admin_get_pro_users()
RETURNS TABLE(
  user_id uuid,
  display_name text,
  email text,
  neverai_id text,
  plan text,
  subscribed_at timestamptz,
  expires_at timestamptz,
  is_admin_override boolean,
  is_expired boolean,
  days_remaining integer,
  payment_amount bigint  -- This was the issue
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Cast payment_amount to bigint explicitly
  ...
  COALESCE((SELECT pl.amount FROM payments_log pl WHERE pl.user_id = us.user_id AND pl.status = 'success' ORDER BY pl.created_at DESC LIMIT 1), 0)::bigint as payment_amount
  ...
END;
$$;

-- Fix admin_get_trial_analytics config key
-- Change 'trial_duration_days' to 'free_trial_days' to match admin panel config
```

---

### Phase 3: Undo Delete with Toast
**Implementation approach:**

1. **Create `useDeleteUndo` hook** that:
   - Stores recently deleted items in state
   - Shows toast with "Undo" action button
   - Auto-clears after 5 seconds
   - Calls `restoreProspects` when Undo clicked

2. **Update delete handlers** in:
   - `src/pages/Dashboard.tsx` - For prospect delete
   - `src/contexts/ProspectsContext.tsx` - Return deleted data for restoration
   - `src/hooks/useSheets.ts` - For sheet delete (preserve deleted sheet data)

3. **Toast pattern:**
```tsx
const handleDelete = async (id: string) => {
  const deleted = await deleteProspect(id);
  if (deleted) {
    toast("Item deleted", {
      action: {
        label: "Undo",
        onClick: () => restoreProspect(deletedItem)
      },
      duration: 5000
    });
  }
};
```

---

### Phase 4: Soft Delete & Recently Deleted Section
**Database Migration:**

```sql
-- Add soft delete column to prospects
ALTER TABLE prospects ADD COLUMN deleted_at timestamptz DEFAULT NULL;

-- Create index for efficient filtering
CREATE INDEX idx_prospects_deleted_at ON prospects(deleted_at) WHERE deleted_at IS NOT NULL;

-- Update RLS policies to filter out deleted
-- (All existing SELECT policies should add: AND deleted_at IS NULL)
```

**Frontend Changes:**
| File | Change |
|------|--------|
| `src/contexts/ProspectsContext.tsx` | Update delete to soft-delete (SET deleted_at) |
| `src/hooks/useDeletedProspects.ts` | New hook to fetch deleted items |
| `src/components/profile/RecentlyDeletedDrawer.tsx` | New component for restore UI |
| `src/pages/Profile.tsx` | Add "Recently Deleted" menu item |

**Recently Deleted UI:**
- List deleted items with: Name, Phone (masked), Deleted date
- "Restore" button per item
- "Restore All" bulk action
- "Permanently Delete" option
- Auto-purge after 30 days (database trigger or scheduled function)

---

## Files Summary

| File | Phase | Change Type |
|------|-------|-------------|
| `src/pages/TodoUp.tsx` | 1 | Add TrialBanner import and component |
| `src/pages/Tracking.tsx` | 1 | Add TrialBanner import and component |
| `supabase/migrations/` | 2 | Fix RPC type mismatches |
| `supabase/migrations/` | 2 | Fix trial_duration_days → free_trial_days |
| `src/pages/Dashboard.tsx` | 3 | Add undo toast on delete |
| `src/hooks/useSheets.ts` | 3 | Return deleted sheet for undo |
| `supabase/migrations/` | 4 | Add deleted_at column |
| `src/contexts/ProspectsContext.tsx` | 4 | Update to soft-delete |
| `src/hooks/useDeletedProspects.ts` | 4 | New: fetch deleted items |
| `src/components/profile/RecentlyDeletedDrawer.tsx` | 4 | New: restore UI |
| `src/pages/Profile.tsx` | 4 | Add Recently Deleted menu |

---

## Success Criteria

| Requirement | Verification |
|-------------|--------------|
| Trial banner respects admin config in ALL tabs | Banner shows in To-Do and TrackUp when enabled |
| Admin audit logs load correctly | Audit Log viewer shows entries with pagination |
| Admin analytics load real data | Trials/Offers/Revenue sections display data |
| Users can undo deletes | Toast with "Undo" appears after delete, restores on click |
| Deleted data can be restored safely | Recently Deleted section in Profile shows restorable items |
