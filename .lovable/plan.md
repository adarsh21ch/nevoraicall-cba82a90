
# Fix: Admin Panel Trial/Limit Sync Not Reflected in User UI

## Problem Summary

Despite configuring a 7-day free trial in the Admin Panel (with "Free Trial Days = 7" and "Trial Only Mode = ON"), the user-facing UI is still:
1. Showing the old "200 prospect limit" paywall modal instead of trial-aware messaging
2. Not displaying any trial banner or badge on the Profile page
3. Not showing the trial countdown on all main tabs

**Root Causes Identified:**

1. **`useFreeTrial` hook ignores `is_enabled` flag**: The hook checks if `free_trial_days > 0` but doesn't verify the `is_enabled` flag from the database. Since the `get_app_config` RPC only returns limits where `is_enabled = true`, this works but the logic is confusing.

2. **`trialOnlyMode` check is broken**: The hook checks `config.limits.trial_only_mode > 0`, but the admin panel stores this as `is_enabled = true` (toggle on/off), not as a numeric value. The database shows `trial_only_mode = 0` with `is_enabled = true`, which means the toggle IS enabled but the check `> 0` fails.

3. **Trial banner only on Home page**: The `TrialBanner` component is only rendered on the Home page, not on Profile or other tabs.

4. **Profile page has no trial indicator**: There's no Pro/Trial badge showing remaining days on the Profile page.

5. **HardLimitModal doesn't respect trial status**: When trial is active and trial-only mode is on, the paywall modal should not show at all - but currently it still triggers based on lead count.

---

## Technical Root Cause Analysis

### Database State
```
config_key         | config_value | is_enabled
-------------------|--------------|----------
free_trial_days    | 7            | true
trial_only_mode    | 0            | true    <-- Problem: value=0, but toggle is ON
hard_limit         | 200          | true
free_total_leads   | 200          | true
```

The `trial_only_mode` design flaw: The toggle being ON (`is_enabled = true`) should mean trial-only mode is active, but the current hook checks `config_value > 0` which is `0 > 0 = false`.

### Current Hook Logic (Broken)
```typescript
// useFreeTrial.ts line 26
const trialOnlyMode = (config.limits.trial_only_mode ?? 0) > 0; // Returns FALSE
```

The `get_app_config` RPC only returns limits where `is_enabled = true`, so `trial_only_mode` IS in the config, but its value is 0.

### User's Profile
- `created_at`: 2026-01-27 10:07:35 (2 days ago)
- `total_leads_added`: 200

With a 7-day trial starting Jan 27, the trial would end Feb 3. Today is Jan 29, so the trial IS active. But the system is ignoring this.

---

## Solution Plan

### Phase 1: Fix Trial Only Mode Detection

**File: `src/hooks/useFreeTrial.ts`**

The issue is that `trial_only_mode` should be considered "enabled" when it appears in the limits object (meaning `is_enabled = true` in the database), regardless of its numeric value. Alternatively, fix the admin panel to store `1` when the toggle is ON.

**Recommended Fix**: Change the admin panel logic so when the toggle is ON, it sets `config_value = 1`, and when OFF, it sets `config_value = 0`. Then the hook logic `> 0` will work correctly.

**Alternative (simpler)**: Check if the key exists in the returned limits (which means `is_enabled = true`):
```typescript
// If trial_only_mode key exists in limits, it means the toggle is ON
const trialOnlyMode = 'trial_only_mode' in config.limits;
```

However, this is semantically confusing. Better approach:

**Best Fix**: Store `trial_only_mode` as boolean-like: toggle ON = value 1, toggle OFF = value 0 AND disabled.

Update `UsageLimitsManager.tsx` to set `config_value = 1` when enabling and `config_value = 0` when disabling for `trial_only_mode` specifically.

---

### Phase 2: Add Trial Banner to All Main Tabs

**Files to modify:**
- `src/pages/Profile.tsx` - Add trial badge/banner
- `src/pages/Dashboard.tsx` - Add trial banner
- `src/pages/ListUp.tsx` - Add trial banner
- `src/pages/TodoUp.tsx` - Add trial banner (optional)

**Profile Page Enhancement:**
- Add a trial badge next to the Pro badge showing remaining days
- Add `TrialBanner` component for users in active trial

```typescript
// In Profile.tsx, near the Pro badge
{isTrialActive && !isPro && (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
    <Gift className="h-3 w-3" />
    {daysRemaining}d Trial
  </span>
)}
```

---

### Phase 3: Make Paywalls Trial-Aware

**Files to modify:**
- `src/components/subscription/HardLimitModal.tsx`
- `src/components/subscription/LeadLimitModal.tsx`
- `src/components/prospects/AddProspectDialog.tsx`
- `src/components/prospects/ImportExcelDialog.tsx`

**Logic Change:**

In `AddProspectDialog.tsx` and `ImportExcelDialog.tsx`, before showing the `HardLimitModal`, check if user is in active trial with trial-only mode:

```typescript
const { isTrialActive, trialOnlyMode } = useFreeTrial();

// In handleOpenChange or before showing modal
if (isTrialActive && trialOnlyMode) {
  // Allow the action, don't show modal
  setOpen(isOpen);
  return;
}

// Otherwise, existing limit check logic
if (isOpen && isAtLimit && !isTrialActive) {
  setShowLimitModal(true);
  return;
}
```

**TrialExpiredModal Enhancement:**
The `TrialExpiredModal` already exists but only shows when:
1. `isTrialExpired` is true
2. `trialOnlyMode` is true
3. User is not paid

Currently it's not triggering because `trialOnlyMode` is returning false.

---

### Phase 4: Database Migration - Fix Trial Only Mode Value

**SQL Migration:**
```sql
-- Update trial_only_mode to have value=1 when enabled
-- This makes the is_enabled toggle meaningful
UPDATE admin_usage_limits 
SET config_value = 1 
WHERE config_key = 'trial_only_mode' 
AND is_enabled = true;
```

This ensures that when the toggle is ON, the config_value is 1, making the hook logic work correctly.

---

## Implementation Steps

1. **Database Fix**: Update `trial_only_mode` to have `config_value = 1` when enabled

2. **Update UsageLimitsManager**: For trial_only_mode specifically, when toggling ON, set value to 1; when toggling OFF, set value to 0

3. **Fix useFreeTrial hook**: Add fallback logic to check if key exists in limits as additional signal

4. **Add TrialBanner to all pages**: Dashboard, Profile, ListUp, TodoUp

5. **Add trial badge to Profile**: Show "Xd Trial" badge next to name when in active trial

6. **Make dialogs trial-aware**: Skip limit modal when trial is active with trial-only mode

7. **Ensure TrialExpiredModal works**: Verify it triggers correctly when trial expires

---

## Files to Create/Modify

| File | Changes |
|------|---------|
| `supabase/migrations/` | Set `trial_only_mode.config_value = 1` where enabled |
| `src/hooks/useFreeTrial.ts` | Refine trialOnlyMode detection logic |
| `src/components/admin/UsageLimitsManager.tsx` | Special handling for trial_only_mode toggle |
| `src/pages/Profile.tsx` | Add TrialBanner + trial badge in user card |
| `src/pages/Dashboard.tsx` | Add TrialBanner component |
| `src/pages/ListUp.tsx` | Add TrialBanner component |
| `src/components/prospects/AddProspectDialog.tsx` | Skip limit check if in trial with trial-only mode |
| `src/components/prospects/ImportExcelDialog.tsx` | Skip limit check if in trial with trial-only mode |
| `src/components/subscription/HardLimitModal.tsx` | Don't render if in active trial |

---

## Expected Outcome

After implementation:
1. Admin sets "Free Trial Days = 7" and toggles "Trial Only Mode" ON
2. All users see trial banner on Dashboard, Home, ListUp, Profile
3. Profile shows trial badge with remaining days
4. Users can add/import leads without seeing the 200-limit paywall during trial
5. When trial expires, `TrialExpiredModal` appears prompting upgrade
6. All settings sync from Admin Panel in real-time (30s cache)
