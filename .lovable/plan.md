
# Subscription Tier Renaming: UI-Only Refactor

## Overview

Rename the **display-facing** tier labels across the entire App and Admin Panel to match the new universal naming convention:

| Current Internal Tier | Current Display Name | New Display Name |
|---|---|---|
| `basic` | Basic (Free) | **Free** |
| `pro` | Pro | **Basic** |
| `premium` | Premium | **Pro** |

**Zero backend changes.** The database `tier` column values (`basic`, `pro`, `premium`) remain untouched. Only UI labels, toast messages, and user-facing strings change.

---

## What Changes

### 1. Create a Tier Display Name Mapping Utility

A single mapping constant so all components reference one source for display names:

```text
src/config/tierLabels.ts (new file)

TIER_DISPLAY_NAME: { basic: 'Free', pro: 'Basic', premium: 'Pro' }
TIER_ICON: { basic: null, pro: Crown, premium: Gem }
TIER_COLOR: { basic: 'muted', pro: 'primary', premium: 'amber' }
```

### 2. TierCard Component (`src/components/subscription/TierCard.tsx`)

- Rename feature lists:
  - `PRO_FEATURES` becomes `BASIC_FEATURES` (same content)
  - `PRO_EXCLUDED_FEATURES` becomes `BASIC_EXCLUDED_FEATURES`
  - `PREMIUM_FEATURES` becomes `PRO_FEATURES` (same content, but "Everything in Pro" becomes "Everything in Basic")
- Update the `isPremium` prop references to use the new display names
- "Recommended for Leaders" badge stays as-is (it applies to the top-tier, now called "Pro")

### 3. UpgradeDrawer (`src/components/subscription/UpgradeDrawer.tsx`)

- `tierName="Pro"` becomes `tierName="Basic"`
- `tierName="Premium"` becomes `tierName="Pro"`
- `isPremiumSelected` logic stays (still checks `tier === 'premium'` internally)
- Header text "Unlock Pro Features" becomes "Unlock Premium Features" or stays generic like "Upgrade Your Plan"
- Toast: "Pro Activated" becomes tier-aware (e.g., "Basic Plan Activated" or "Pro Plan Activated")
- Button text: "Upgrade to Pro" becomes "Upgrade Now" (generic) or tier-aware

### 4. UpgradeModal (`src/components/subscription/UpgradeModal.tsx`)

- Same tier label swaps as UpgradeDrawer
- Toast messages updated to use tier display names

### 5. UpgradeBar (`src/components/subscription/UpgradeBar.tsx`)

- "Upgrade to unlock this feature" -- stays generic (already good)
- Plan name display already comes from `defaultPlan?.name` (dynamic, no change needed)

### 6. HardLimitModal (`src/components/subscription/HardLimitModal.tsx`)

- "Upgrade to Pro for unlimited access" becomes "Upgrade for unlimited access"
- "Upgrade to Pro" button text becomes "Upgrade Now" or uses dynamic plan name
- Toast "Pro Activated" becomes dynamic

### 7. ProgressiveNudgeBanner, UpgradeCard, UpgradeButton

- All "Upgrade to Pro" labels become generic or use the new mapping
- "Pro Activated" toasts become tier-aware

### 8. Feature Lock Toasts (scattered across components)

Update hardcoded strings in these files:
- `src/components/trackup/ExportFunnelData.tsx` -- "Upgrade to Pro to export data"
- `src/components/prospects/ProspectFilters.tsx` -- "Upgrade to Pro to use retargeting filters"
- `src/components/prospects/ProspectTable.tsx` -- "Upgrade to Pro to export/share"
- `src/pages/Profile.tsx` -- "Upgrade to Pro to unlock AI Assistant"
- `src/pages/PaymentSuccess.tsx` -- "Pro Plan Activated", "Pro Features Unlocked"

All become generic: "Upgrade to unlock this feature" or "Upgrade your plan to access this"

### 9. Admin Panel -- PlansManager (`src/components/admin/PlansManager.tsx`)

- Tier labels in admin:
  - `basic: '🆓 Basic (Free)'` becomes `basic: '🆓 Free'`
  - `pro: '⭐ Pro'` becomes `pro: '⭐ Basic'`
  - `premium: '💎 Premium'` becomes `premium: '💎 Pro'`
- Tier dropdown options in plan creation form updated similarly
- Tier select values remain `basic`, `pro`, `premium` (internal, unchanged)

### 10. FunnelsProBadge (`src/components/funnels/FunnelsProBadge.tsx`)

- Badge text "PRO" stays as "PRO" (this is the top tier now, still called Pro)

### 11. Brand Config (`src/config/brand.ts`)

- `PLAN_NAME_PRO` updated to reflect new naming

### 12. Safe Defaults (`src/hooks/useAdminConfig.ts`)

- `SAFE_DEFAULTS` plan names: "Pro 6-Month" becomes "Basic 6-Month", "Pro Monthly" becomes "Basic Monthly" (fallback only)

---

## What Does NOT Change

- Database `tier` column values (`basic`, `pro`, `premium`) -- untouched
- `SubscriptionTier` TypeScript type -- stays `'basic' | 'pro' | 'premium'`
- `TIER_RANK` ordering -- stays `basic: 0, pro: 1, premium: 2`
- `meetsRequiredTier()` logic -- untouched
- `useSubscription` hook -- `isPro`, `isPremium`, `isPaid` remain as-is
- `PermissionsContext` -- untouched
- `useFeatureAccess` -- untouched
- Edge functions -- untouched
- RLS policies -- untouched
- Razorpay integration -- untouched
- `admin_subscription_plans` table -- untouched
- `admin_feature_flags` table -- untouched
- `user_subscriptions` table -- untouched
- Payment webhooks -- untouched

---

## Technical Details

### Files to Create (1)

| File | Purpose |
|---|---|
| `src/config/tierLabels.ts` | Central display name mapping for tiers |

### Files to Modify (~15)

| File | Change |
|---|---|
| `src/config/brand.ts` | Update plan name constants |
| `src/components/subscription/TierCard.tsx` | Rename feature arrays, use new display names |
| `src/components/subscription/UpgradeDrawer.tsx` | Swap tier display names in TierCard props and toasts |
| `src/components/subscription/UpgradeModal.tsx` | Same as UpgradeDrawer |
| `src/components/subscription/UpgradeBar.tsx` | Generic upgrade text |
| `src/components/subscription/HardLimitModal.tsx` | Generic upgrade text, dynamic toasts |
| `src/components/subscription/UpgradeCard.tsx` | Dynamic toast messages |
| `src/components/subscription/ProgressiveNudgeBanner.tsx` | Generic trigger text |
| `src/components/admin/PlansManager.tsx` | Update tier label mapping |
| `src/hooks/useAdminConfig.ts` | Update SAFE_DEFAULTS plan names |
| `src/hooks/usePaymentLinks.ts` | Update legacy plan names |
| `src/components/trackup/ExportFunnelData.tsx` | Generic upgrade toast |
| `src/components/prospects/ProspectFilters.tsx` | Generic upgrade toast |
| `src/components/prospects/ProspectTable.tsx` | Generic upgrade toast |
| `src/pages/Profile.tsx` | Generic upgrade toast for AI |
| `src/pages/PaymentSuccess.tsx` | Dynamic tier name in success messages |

### Migration / Data Changes

**None required.** This is purely a display-layer rename. Existing subscriptions auto-map correctly because the internal tier values are unchanged.
