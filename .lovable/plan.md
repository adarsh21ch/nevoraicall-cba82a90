

## Fix: Application Source Data Not Appearing in TrackUp

### Root Cause

There are two separate issues preventing APPLICATION mode from working:

1. **No source filter on reads**: `usePersonalSnapshotV2Read` fetches ALL rows from `personal_snapshot_v2` regardless of their `source` column. When a user switches to APPLICATION, they still see MANUAL data (or a mix of both).

2. **No auto-write bridge**: When prospects are added/updated (imports, tag changes), `useDailyTrackingLog` writes to `daily_tracking_logs` -- a table that TrackUp never reads. Nobody writes APPLICATION-sourced rows into `personal_snapshot_v2`. So there is nothing to show.

### The Fix (3 Parts)

---

### Part 1: Filter snapshots by source preference

**File:** `src/hooks/usePersonalSnapshotV2Read.ts`

- Accept a new optional parameter: `sourceFilter?: 'MANUAL' | 'APPLICATION' | null`
- When provided, add `.eq('source', sourceFilter)` to the Supabase query
- Include `sourceFilter` in the query key so switching sources triggers a fresh fetch
- Default: `null` (no filter, backward compatible)

**File:** `src/pages/Tracking.tsx`

- Import `useTrackingSourcePreferences`
- Map `personalSource` to the DB source value: `'AUTO'` maps to `'APPLICATION'`, `'MANUAL'` maps to `'MANUAL'`
- Pass this mapped value to `usePersonalSnapshotV2Read` as `sourceFilter`

**File:** `src/components/profile/ProfileTrackUp.tsx`

- Same change: read source preference and pass filter to the read hook

---

### Part 2: Auto-write APPLICATION snapshots from prospects

**File:** `src/hooks/useAutoTrackingSync.ts` (NEW)

A new hook that computes today's tracking numbers from the prospects table and writes them to `personal_snapshot_v2` with `source: 'APPLICATION'`.

Logic:
- Query today's prospects (same logic as `useDailyTrackingLog`)
- Count leads, responses, and tag distributions
- Call `usePersonalSnapshotV2Write.savePersonal()` with `source: 'APPLICATION'`
- Debounced (1 second) to batch rapid updates
- Only runs when `personalSource === 'AUTO'`

**File:** `src/contexts/ProspectsContext.tsx`

- After every prospect add/update/delete/import, call the auto-sync function
- This replaces the current `triggerDailyLog()` call (which writes to the unused table) with a call that actually writes APPLICATION data to the snapshot table TrackUp reads from

---

### Part 3: Ensure ManualUpdateDrawer respects source

**File:** `src/components/trackup-v2/ManualUpdateDrawer.tsx`

- Already correctly disables manual inputs when `personalSource === 'AUTO'` (line 129)
- Already writes with the correct source mapping (line 163)
- No changes needed here

---

### Data Flow After Fix

```text
Source = MANUAL:
  User opens ManualUpdateDrawer -> saves with source='MANUAL'
  -> personal_snapshot_v2 (source=MANUAL)
  -> usePersonalSnapshotV2Read(sourceFilter='MANUAL') -> TrackUp shows manual data

Source = APPLICATION:
  User adds/imports/tags prospects -> ProspectsContext triggers auto-sync
  -> useAutoTrackingSync computes counts from prospects table
  -> writes to personal_snapshot_v2 (source='APPLICATION') via edge function
  -> usePersonalSnapshotV2Read(sourceFilter='APPLICATION') -> TrackUp shows app data
```

---

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/usePersonalSnapshotV2Read.ts` | Add `sourceFilter` parameter and include in query |
| `src/hooks/useAutoTrackingSync.ts` | NEW -- computes prospect-based tracking and writes APPLICATION snapshots |
| `src/pages/Tracking.tsx` | Read source preference, pass filter to read hook |
| `src/components/profile/ProfileTrackUp.tsx` | Read source preference, pass filter to read hook |
| `src/contexts/ProspectsContext.tsx` | Call auto-sync after prospect mutations when source=AUTO |

### What This Does NOT Change
- No funnel logic changes
- No response counting rule changes
- No historical data modifications
- No time-based rules
- ManualUpdateDrawer behavior unchanged
