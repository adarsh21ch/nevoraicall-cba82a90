

# Admin-Controlled Feature Registry: Complete Architecture Overhaul

## Current State Analysis

Your app already has the **foundation** but it's underused:
- `admin_feature_flags` table exists with 6 features, but only has `free_access` / `pro_access` booleans (no trial column, no numeric limits)
- `useFeatureAccess` hook exists but is **never imported** anywhere in the app
- `isPro` / `isPaid` from `useSubscription` is hardcoded in **32+ files** across the codebase
- Trial logic is separate from feature flags (handled by `useFreeTrial` hook independently)
- Numeric limits live in a separate `admin_usage_limits` table, disconnected from features

## ✅ BATCH 1 COMPLETE: Database + Core Hooks

### Phase 1: Database Schema Enhancement ✅
- Added `trial_access`, `free_limit`, `pro_limit`, `trial_limit`, `category` columns to `admin_feature_flags`
- Seeded 21 feature keys across 8 categories (calling, leads, tracking, todo, export, automation, analytics, team)
- Updated `get_app_config` RPC to return all new columns

### Phase 2: Central Access Hook ✅
- Upgraded `useFeatureAccess` with trial-aware logic returning `{ canAccess, limit, reason, isLoading }`
- Created `PermissionsProvider` context at `src/contexts/PermissionsContext.tsx`
- Provides `checkFeature()`, `getLimit()`, `getPermission()` helpers app-wide
- Wired into `App.tsx`

### Phase 4: Admin UI Enhancement ✅
- Upgraded `FeatureFlagsManager.tsx` with category grouping, trial toggle, numeric limit inputs, add feature button

## ✅ BATCH 2 COMPLETE: Subscription Hooks + Upgrade Components

### Limit Hooks Migrated ✅
- `useLeadLimit` → reads `total_lead_limit` from feature registry
- `useProspectLimit` → reads from feature registry  
- `useLifetimeLeadLimit` → reads from feature registry
- `useHistoricalAccess` → uses `usePermissions` instead of `isPro`
- `useDailyUploadLimit` → untouched (uses backend RPC, already correct)

### Subscription Components Migrated ✅
- `UpgradeButton` → uses `usePermissions` instead of `useSubscription`
- `UpgradeBar` → uses `usePermissions` instead of `useSubscription`
- `UpgradeCard` → uses `usePermissions` for visibility
- `UpgradeDrawer` → uses `usePermissions` for visibility

### Subscription Modals ✅ (already use dynamic plans from admin config)
- `HardLimitModal` — already reads from `useUpgradeNudge` → `useLifetimeLeadLimit` → feature registry
- `LeadLimitModal` — already reads from admin config
- `TrialExpiredModal` — already reads from admin config

## 🔲 BATCH 3: All Frontend Components (REMAINING)

### Phase 3: Frontend Migration (32+ files)

Replace all remaining `isPro` / `isPaid` checks with `useFeatureAccess('feature_key')` calls:

**High-impact files still to update:**
- `src/components/trackup/ProspectAnalytics.tsx` -- uses `isPro` to hide/show stats
- `src/components/trackup/LeadsTracker.tsx` -- uses `isPro` for KPI display
- `src/components/trackup/ExportFunnelData.tsx` -- uses `isPro` for export gating
- `src/components/tracking/DynamicFunnelTracker.tsx` -- uses `isPro` for data display
- `src/components/prospects/ImportExcelDialog.tsx` -- uses `isPaid` for limit checks
- `src/pages/Profile.tsx` -- uses `isPro` for UI sections
- All tracking components using direct subscription checks

### Phase 5: Trial Integration

Update trial system to read from feature flags:
- When trial is active, check `trial_access` per feature instead of treating trial as "full Pro"
- `useFreeTrial` hook updated to provide trial state, while `useFeatureAccess` handles the access decision

---

## Technical Details

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
// limit is 50 for free, null for unlimited
```

---

## Risk & Considerations

- **Breaking changes**: Every file using `isPro` needs updating. Must be done carefully to avoid regressions.
- **Performance**: `useUserPermissions` context ensures single fetch vs. per-component queries.
- **Backward compatibility**: `useSubscription` hook will still exist for payment/expiry logic but should NOT be used for feature gating.
- **Admin seeding**: All ~20 feature keys must be seeded with correct defaults so nothing breaks on deploy.
