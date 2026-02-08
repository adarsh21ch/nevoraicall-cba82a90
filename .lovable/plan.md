

# Fix: TrackUp Data Loading Inconsistency

## Root Cause Analysis

There are three interconnected issues causing the inconsistent data display:

### Problem 1: Unstable React Query Keys
The snapshot read hooks (`usePersonalSnapshotV2Read`, `useTotalSnapshotV2Read`) include the full tag name arrays (`leadsTrackingTagNames`, `stageTagNames`) in their query keys. These arrays are loaded asynchronously from the leader's profile. When they resolve (or change reference), React Query sees a completely **new query key**, discards the old cached data, and starts a fresh fetch. This causes the "data appears then disappears" symptom.

### Problem 2: Cache Invalidation Doesn't Match
Write hooks invalidate queries using a 3-part key: `['personal-snapshot-v2', userId, monthYear]`. But the actual query key has 5 parts (includes tag arrays). While React Query's prefix matching should still work, the constant key changes from Problem 1 mean the invalidation might target a stale key that no longer has an active observer.

### Problem 3: Drawer Closes Before Data Refreshes
After saving, the ManualUpdateDrawer closes immediately. The cache invalidation fires in the background, but the main page may briefly show stale or empty data until the refetch completes.

## Solution

### 1. Remove tag arrays from query keys (Read Hooks)
**Files:** `usePersonalSnapshotV2Read.ts`, `useTotalSnapshotV2Read.ts`

Move the slot-to-name conversion **out of the query function** and into a post-processing step using `useMemo`. The query should only depend on `userId` and `monthYear` -- these are stable values that don't change during the session.

```
BEFORE query key: ['personal-snapshot-v2', userId, monthYear, tagNames[], stageNames[]]
AFTER query key:  ['personal-snapshot-v2', userId, monthYear]
```

The tag name conversion will happen in a `useMemo` that depends on the raw query data and the tag names. This way:
- The query fetches once and stays cached
- Tag name mapping re-runs reactively when tag config loads
- No more data disappearing when tag arrays resolve

### 2. Await invalidation before closing drawer
**File:** `ManualUpdateDrawer.tsx`

After saving, wait for query invalidation to complete before closing:
```
await queryClient.invalidateQueries(...)  // wait for refetch
onOpenChange(false)                       // then close
```

This is done by moving the invalidation + close logic into the drawer's `handleSave`, using the query client directly.

### 3. Add `refetchOnMount: 'always'` to read hooks
**Files:** `usePersonalSnapshotV2Read.ts`, `useTotalSnapshotV2Read.ts`

Ensure that when the Tracking page mounts (e.g., after tab switch), fresh data is always fetched rather than relying solely on potentially stale cache.

## Technical Changes

### File 1: `src/hooks/usePersonalSnapshotV2Read.ts`
- Remove `leadsTrackingTagNames` and `stageTagNames` from the query key
- Return raw snapshot data from query (no tag conversion inside queryFn)
- Add a `useMemo` that converts slot keys to tag names using the tag arrays
- Add `refetchOnMount: 'always'`

### File 2: `src/hooks/useTotalSnapshotV2Read.ts`
- Same changes as personal read hook

### File 3: `src/components/trackup-v2/ManualUpdateDrawer.tsx`
- Import `useQueryClient` from `@tanstack/react-query`
- In `handleSave`: after both saves complete, explicitly `await queryClient.invalidateQueries` for both snapshot keys
- Only close the drawer after invalidation completes

## Expected Result
- Data loads once and stays visible (no flickering or disappearing)
- Tab switches show cached data instantly
- After saving, the drawer waits until fresh data is loaded, then closes -- user sees updated numbers immediately
- Tag name resolution happens reactively without triggering refetches
