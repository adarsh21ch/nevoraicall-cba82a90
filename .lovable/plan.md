

# Fix: "Video Send" & "Enrollment" Numbers Load 5-6 Seconds Late

## Root Cause

The snapshot read hooks (`usePersonalSnapshotV2Read`, `useTotalSnapshotV2Read`) each import and call `useTrackingFormat()` **directly**, creating their own separate instances of the hook. Meanwhile, the `TrackingFormatContext` also calls `useTrackingFormat()`. This means:

- 3 independent copies of `useTrackingFormat` are running, each making their own RPC calls
- The read hooks' copies may resolve later than the context's copy
- Until a hook's tag names resolve, the slot-to-name mapping is skipped (the `if leadsTrackingTagNames.length > 0` check fails), so data like `response_tag_1: 5` stays as slot keys
- The table looks for `responseTags["Video Send"]` but finds `response_tag_1` instead, showing `--` (zero)
- After 5-6 seconds when the tag names finally arrive, the `useMemo` re-runs and the correct values appear

## Solution

Remove the duplicate `useTrackingFormat()` calls from the read hooks and instead pass the tag names down from the `TrackingFormatContext` (which already has cached data from localStorage for instant hydration).

### File 1: `src/hooks/usePersonalSnapshotV2Read.ts`
- Remove the `useTrackingFormat()` import and call
- Accept `leadsTrackingTagNames` and `stageTagNames` as **parameters** instead
- This way the hook uses the same tag names the rest of the app uses (from context, with localStorage cache)

### File 2: `src/hooks/useTotalSnapshotV2Read.ts`
- Same change: accept tag names as parameters, remove internal `useTrackingFormat()` call

### File 3: `src/pages/Tracking.tsx`
- Pass `leadsTrackingTagNames` and `stageTagNames` from `useTrackingFormatContext()` into the read hooks

### File 4: `src/components/profile/ProfileTrackUp.tsx`
- Pass tag names from its own `useTrackingFormat()` into the read hook

## Why This Fixes It

```
BEFORE (3 independent format fetches):
  TrackingFormatContext -> useTrackingFormat() -> cached instantly
  usePersonalSnapshotV2Read -> useTrackingFormat() -> fetches from DB (5-6s)
  useTotalSnapshotV2Read -> useTrackingFormat() -> fetches from DB (5-6s)
  
  Result: Tag mapping delayed 5-6s in read hooks

AFTER (single source of truth):
  TrackingFormatContext -> useTrackingFormat() -> cached instantly
  usePersonalSnapshotV2Read(tagNames) -> uses passed-in names -> instant mapping
  useTotalSnapshotV2Read(tagNames) -> uses passed-in names -> instant mapping
  
  Result: Tag mapping happens instantly from cache
```

## Additional Benefit

- Eliminates 4 redundant RPC calls per page load (2 hooks x 2 RPC calls each)
- Reduces network overhead and speeds up overall page load
- Single source of truth for tag names across the entire app

