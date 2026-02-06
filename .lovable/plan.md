

# Restrict Historical Data Access for Free Users (Post-Trial)

## Overview

Add admin-controlled gating that prevents free (post-trial) users from viewing past-date data in the TrackUp dashboard (Leads and Funnel trackers). Pro and trial users retain full access. Admin settings are the single source of truth.

---

## 1. Database: Add Admin Config Keys

Insert three new rows into `admin_usage_limits`:

| config_key | config_value | description |
|---|---|---|
| `restrict_historical_data` | 0 | Boolean toggle (1=ON, 0=OFF) |
| `allowed_past_days` | 0 | Number of past days free users can access (0 = today only) |

Insert one row into `admin_config_text`:

| config_key | config_value | description |
|---|---|---|
| `historical_restriction_scope` | `leads,funnel` | Comma-separated list of scopes (leads, funnel) |

---

## 2. Admin Panel: Update UsageLimitsManager

**File:** `src/components/admin/UsageLimitsManager.tsx`

- Add a new category `'Historical Access'` to `LIMIT_CATEGORIES` with keys `['restrict_historical_data', 'allowed_past_days']`
- Add icons for the new keys (e.g., `Lock` for restrict_historical_data, `CalendarDays` for allowed_past_days)
- Mark `restrict_historical_data` as a boolean field (like `trial_only_mode`) so it shows a toggle instead of numeric input
- Add a new section below the limits for scope selection (checkboxes for "Leads Tracking" and "Funnel Tracking") that reads/writes the `historical_restriction_scope` value from `admin_config_text`

---

## 3. New Hook: useHistoricalAccess

**File:** `src/hooks/useHistoricalAccess.ts` (new)

This hook encapsulates all historical access logic:

- Reads `restrict_historical_data` and `allowed_past_days` from `useAdminConfig().config.limits`
- Reads `historical_restriction_scope` from `admin_config_text` table
- Uses `useSubscription()` for Pro status
- Uses `useFreeTrial()` for trial status
- Exposes:
  - `isDateRestricted(date: Date, scope: 'leads' | 'funnel'): boolean` -- returns true if the date should be blocked
  - `restrictionEnabled: boolean` -- master toggle
  - `allowedPastDays: number`
  - `showUpgradeModal: boolean` + `setShowUpgradeModal` state
  - `triggerRestriction()` -- sets showUpgradeModal to true

Logic:
- If user is Pro or trial is active: never restrict
- If toggle is OFF: never restrict
- If scope doesn't include the tracker type: never restrict
- Otherwise: restrict dates older than `allowedPastDays` from today

---

## 4. Update DynamicLeadsTracker

**File:** `src/components/tracking/DynamicLeadsTracker.tsx`

- Import and use `useHistoricalAccess`
- On the **month selector**: when user navigates to a past month and restriction applies, block the entire view and show the upgrade modal instead of loading data
- On **individual date columns**: for restricted dates, show a lock icon instead of data (not zeros, not blank)
- When clicking a restricted column or navigating to a restricted month, call `triggerRestriction()` to show the upgrade modal
- Render the `UpgradeModal` at the bottom of the component with custom title/description about historical data

---

## 5. Update DynamicFunnelTracker

**File:** `src/components/tracking/DynamicFunnelTracker.tsx`

- Same pattern as LeadsTracker:
  - Import `useHistoricalAccess`
  - Block past month navigation when restricted
  - Show lock icons on restricted funnel period columns
  - Show upgrade modal on interaction with restricted data

---

## 6. Update Tracking Page (Month Navigation Guard)

**File:** `src/pages/Tracking.tsx`

- No major changes needed; the restriction logic lives in the child tracker components
- The month selector `changeMonth('prev')` calls already exist in the trackers -- restriction is enforced there

---

## Technical Details

### Boolean Toggle Convention
`restrict_historical_data` follows the existing convention: stored as integer (1/0) in `admin_usage_limits.config_value`, detected via `'restrict_historical_data' in config.limits` (presence = enabled, since `get_app_config` RPC only returns enabled keys).

### Date Restriction Logic (in useHistoricalAccess)
```text
const today = startOfDay(new Date())
const cutoffDate = subDays(today, allowedPastDays)
isRestricted = targetDate < cutoffDate
```

### Month-Level Restriction
When user navigates to a past month in either tracker:
- If ALL days in that month are restricted, block the entire month view
- Show upgrade modal immediately instead of loading restricted data
- The `changeMonth('prev')` still works (dates are visible) but data cells show lock icons and clicking triggers the modal

### Scope Filtering
The `historical_restriction_scope` text config allows admins to selectively apply restrictions to only Leads, only Funnel, or both. Default: both.

### Cache Invalidation
Changes saved in Admin Panel automatically invalidate `admin-config` query key (existing behavior), ensuring immediate reflection in the user-facing app.

### Upgrade Modal Messaging
Title: "Historical Data is a Pro Feature"
Description: "Upgrade to Pro to view past leads and funnel performance data."
CTA: Standard plan selection via existing UpgradeModal component.

