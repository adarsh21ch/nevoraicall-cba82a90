

# Admin-Controlled Feature Registry: Complete Architecture Overhaul

## Current State Analysis

Your app already has the **foundation** but it's underused:
- `admin_feature_flags` table exists with 6 features, but only has `free_access` / `pro_access` booleans (no trial column, no numeric limits)
- `useFeatureAccess` hook exists but is **never imported** anywhere in the app
- `isPro` / `isPaid` from `useSubscription` is hardcoded in **32+ files** across the codebase
- Trial logic is separate from feature flags (handled by `useFreeTrial` hook independently)
- Numeric limits live in a separate `admin_usage_limits` table, disconnected from features

## What Needs to Change

### Phase 1: Database Schema Enhancement

**Upgrade `admin_feature_flags` table** to support:
- `trial_access` boolean column (does this feature work during trial?)
- `free_limit` integer column (numeric limit for free users, NULL = boolean-only)
- `pro_limit` integer column (numeric limit for pro users, NULL = unlimited)
- `trial_limit` integer column (numeric limit during trial, NULL = follows pro)
- `category` text column (for grouping in admin UI: "Calling", "Leads", "Tracking", etc.)

**Seed all required feature keys** into the table:
- `calling_tab`, `personal_tags`, `tracking_tags`, `lead_import`
- `daily_lead_limit` (with free_limit=50, pro_limit=500, trial_limit=500)
- `advanced_filters`, `retargeting_by_tags`, `followup_list_by_tag`
- `todo_create`, `todo_delete`
- `auto_tracking_personal`, `auto_tracking_team`
- `export_data`, `automation_followups`
- Plus existing: `insights`, `export`, `ai_tips`, `team_sync`, `team_view`, `funnel_analytics`

**Update `get_app_config` RPC** to return the new columns (trial_access, limits) in the features response.

### Phase 2: Central Access Hook (`useFeatureAccess` upgrade)

Upgrade the existing `useFeatureAccess` hook to:
1. Read `trial_access` from feature config
2. Integrate with `useFreeTrial` to check trial state
3. Return numeric limits alongside boolean access
4. Support a unified access decision: trial active? use `trial_access` + `trial_limit`. Paid? use `pro_access` + `pro_limit`. Free? use `free_access` + `free_limit`.

New return shape:
```text
{
  canAccess: boolean      -- can user use this feature?
  limit: number | null    -- numeric limit (null = unlimited)
  reason: string          -- why access is granted/denied
  isLoading: boolean
}
```

Create a new `useUserPermissions` context/hook that fetches ALL permissions once on login and provides them app-wide, avoiding per-component fetches.

### Phase 3: Frontend Migration (32+ files)

Replace all `isPro` / `isPaid` checks with `useFeatureAccess('feature_key')` calls:

**High-impact files to update:**
- `src/components/trackup/ProspectAnalytics.tsx` -- uses `isPro` to hide/show stats
- `src/components/trackup/LeadsTracker.tsx` -- uses `isPro` for KPI display
- `src/components/trackup/ExportFunnelData.tsx` -- uses `isPro` for export gating
- `src/components/tracking/DynamicFunnelTracker.tsx` -- uses `isPro` for data display
- `src/components/prospects/ImportExcelDialog.tsx` -- uses `isPaid` for limit checks
- `src/hooks/useLeadLimit.ts` -- hardcodes free/paid limit logic
- `src/hooks/useProspectLimit.ts` -- hardcodes soft limit
- `src/hooks/useDailyUploadLimit.ts` -- hardcodes daily limits
- `src/hooks/useHistoricalAccess.ts` -- likely uses subscription check
- `src/hooks/useLifetimeLeadLimit.ts` -- hardcodes lifetime limit logic
- `src/pages/Profile.tsx` -- uses `isPro` for UI sections
- `src/components/subscription/UpgradeCard.tsx` -- uses `isPro` for display
- `src/components/subscription/UpgradeBar.tsx` -- uses `isPaid` for gating
- `src/components/subscription/UpgradeButton.tsx` -- uses `isPaid` for visibility
- `src/components/subscription/UpgradeDrawer.tsx` -- uses `isPaid` for visibility
- All subscription modals (HardLimitModal, LeadLimitModal, TrialExpiredModal)

### Phase 4: Admin UI Enhancement

**Upgrade `FeatureFlagsManager.tsx`** to show:
- Feature grouped by category (Calling, Leads, Tracking, etc.)
- Trial access toggle (in addition to Free/Pro)
- Numeric limit inputs for Free/Pro/Trial where applicable
- Ability to add new feature keys from admin UI
- Clear visual indicator of which plan gets what

### Phase 5: Trial Integration

Update trial system to read from feature flags:
- When trial is active, check `trial_access` per feature instead of treating trial as "full Pro"
- Admin can choose per-feature: trial gets Pro access OR custom limits OR disabled
- `useFreeTrial` hook updated to provide trial state, while `useFeatureAccess` handles the access decision

---

## Technical Details

### Database Migration SQL (Phase 1)

Add columns to `admin_feature_flags`:
```text
ALTER TABLE admin_feature_flags 
  ADD COLUMN trial_access BOOLEAN DEFAULT true,
  ADD COLUMN free_limit INTEGER DEFAULT NULL,
  ADD COLUMN pro_limit INTEGER DEFAULT NULL,
  ADD COLUMN trial_limit INTEGER DEFAULT NULL,
  ADD COLUMN category TEXT DEFAULT 'general';
```

Seed ~20 feature keys with appropriate defaults.

Update `get_app_config` RPC to include new columns in the features object.

### New `useUserPermissions` Hook (Phase 2)

A single context provider that:
1. Calls `get_app_config` once
2. Reads user subscription state
3. Reads trial state
4. Computes a `permissions` map: `Record<string, { canAccess: boolean, limit: number | null }>`
5. Provides `checkFeature(key)` and `getLimit(key)` helpers

### Frontend Migration Pattern (Phase 3)

Before:
```text
const { isPro } = useSubscription();
if (!isPro) showUpgrade();
```

After:
```text
const { canAccess } = useFeatureAccess('export_data');
if (!canAccess) showUpgrade();
```

For numeric limits:
```text
const { limit } = useFeatureAccess('daily_lead_limit');
// limit is 50 for free, 500 for pro, null for unlimited
```

---

## Implementation Order

Due to the scale (32+ files), this should be done in **3 batches**:

**Batch 1** (Database + Core Hooks):
- Migration to add columns + seed features
- Update `get_app_config` RPC
- Upgrade `useFeatureAccess` hook
- Create `useUserPermissions` context

**Batch 2** (Admin UI + Subscription Hooks):
- Upgrade `FeatureFlagsManager.tsx` admin UI
- Migrate `useLeadLimit`, `useProspectLimit`, `useDailyUploadLimit`, `useLifetimeLeadLimit`
- Migrate subscription modals and upgrade components

**Batch 3** (All Frontend Components):
- Migrate tracking components (ProspectAnalytics, LeadsTracker, DynamicFunnelTracker, ExportFunnelData)
- Migrate prospect components (ImportExcelDialog, etc.)
- Migrate page-level checks (Profile, Tracking, etc.)
- Remove all direct `isPro`/`isPaid` usage from non-subscription components

---

## Risk & Considerations

- **Breaking changes**: Every file using `isPro` needs updating. Must be done carefully to avoid regressions.
- **Performance**: `useUserPermissions` context ensures single fetch vs. per-component queries.
- **Backward compatibility**: `useSubscription` hook will still exist for payment/expiry logic but should NOT be used for feature gating.
- **Admin seeding**: All ~20 feature keys must be seeded with correct defaults so nothing breaks on deploy.

