
## Fix: Free Users Blocked Despite Admin Turning Off Limits

### The Bug (Root Cause)

There are **3 layers** all falling back to hardcoded 200 when admin disables limits:

1. **Backend RPC `check_upload_limit`**: When `free_total_leads` is disabled (turned OFF), the SQL query returns NULL, and `COALESCE(v_base_total, 200)` defaults to 200 -- still blocking users.

2. **Frontend `get_app_config` RPC**: Only returns limits where `is_enabled = true`. When disabled, the key is missing from the response, and the frontend falls back to `SAFE_DEFAULTS` which has `free_total_leads: 200` and `hard_limit: 200`.

3. **Frontend hooks** (`useLifetimeLeadLimit`, `useUpgradeNudge`, `HardLimitModal`): All read from these fallback values and show upgrade modals.

### The Fix

#### Part 1: Fix Backend RPC `check_upload_limit`

Update the function so that when `free_total_leads` is disabled (not found with `is_enabled = true`), it sets `v_effective_total := NULL` for free users instead of defaulting to 200. When `v_effective_total IS NULL`, skip the total limit check entirely.

Same logic for `free_daily_upload` -- if disabled, skip daily limit check for free users.

#### Part 2: Fix `get_app_config` RPC -- Include disabled limits

Change the limits query to include ALL limit keys (even disabled ones), but return 0 for disabled limits and include the `is_enabled` status. This way the frontend knows whether a limit is active or not.

Alternative (simpler): Return all limits with a special convention -- include an `_enabled` suffix key for each limit.

**Chosen approach**: Return ALL limits with their values, plus a separate `limits_enabled` object showing which are enabled.

#### Part 3: Update Frontend `useAdminConfig`

- Add `limits_enabled: Record<string, boolean>` to `AppConfig` interface
- Parse the new `limits_enabled` map from `get_app_config` response
- Update `SAFE_DEFAULTS` to include `limits_enabled` with sensible defaults

#### Part 4: Update Frontend `useLifetimeLeadLimit`

- Read `config.limits_enabled.free_total_leads` to check if the limit is actually enabled
- If disabled, return unlimited (no restrictions) regardless of the numeric value

#### Part 5: Update `useUpgradeNudge`

- Read `config.limits_enabled.hard_limit` and `config.limits_enabled.free_total_leads`
- If these are disabled, set `currentStage` to `'none'` -- no upgrade nudges

#### Part 6: Update `HardLimitModal` and `AddProspectDialog` and `ImportExcelDialog`

- These already use `useLifetimeLeadLimit` and `useUpgradeNudge`, so they will automatically respect the disabled state once Parts 4 and 5 are fixed.
- Verify no additional hardcoded checks remain.

### Files Changed

| File | Change |
|------|--------|
| New migration SQL | Fix `check_upload_limit` RPC to respect disabled limits; Update `get_app_config` to return `limits_enabled` map |
| `src/hooks/useAdminConfig.ts` | Add `limits_enabled` to AppConfig type and parsing |
| `src/hooks/useLifetimeLeadLimit.ts` | Check `limits_enabled.free_total_leads` before applying limit |
| `src/hooks/useUpgradeNudge.ts` | Check `limits_enabled.hard_limit` / `free_total_leads` before showing nudges |
| `src/hooks/useLeadLimit.ts` | Check `limits_enabled.free_total_leads` before applying limit |

### Result

- When admin turns OFF `free_total_leads` and `hard_limit` in the Limits panel, free users will have NO lifetime lead restriction -- both on frontend (no modals) and backend (no blocking).
- When admin turns them back ON, limits are enforced again with the configured values.
- No new admin UI needed -- the existing toggle is already there, it just needs to actually work end-to-end.
