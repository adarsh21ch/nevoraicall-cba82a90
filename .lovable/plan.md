
# TrackUp Tab Rebuild: Mirror Website UI with Cross-Project Writes

## Overview

Rebuild the `/tracking` route to exactly match the website's TrackUp dashboard UI/UX. The key architectural change is that **writes go to the Website's edge function** (different Supabase project) while **reads stay on the App's Supabase**. No backend changes.

---

## Critical Architecture Change: Write Path

The current write hooks call `supabase.functions.invoke('update-tracking')` on the **App's** Supabase. The spec requires writes to go to the **Website's** edge function at:

```
https://xjnzxxmpidrqjtlvslui.supabase.co/functions/v1/update-tracking
```

This means the write hooks must be updated to use `fetch()` with the website's anon key, and pass the App's auth token as `app_access_token` in the body.

Additionally, tags must be converted to **position-based slot keys** (`response_tag_1`, `response_tag_2`, `stage_tag_1`, etc.) before writing, not human-readable label names.

---

## Changes Summary

### Files Modified (6 files)

| File | Change |
|------|--------|
| `src/hooks/usePersonalSnapshotV2Write.ts` | Switch from `supabase.functions.invoke` to `fetch()` targeting the website's edge function. Convert tag names to slot keys before sending. Pass `app_access_token`. |
| `src/hooks/useTotalSnapshotV2Write.ts` | Same change as personal write hook but for total snapshots. |
| `src/lib/snapshotSlotUtils.ts` | Add `tagNamesToSlotKeys()` and `slotKeysToTagNames()` converter functions for position-based mapping. |
| `src/hooks/usePersonalSnapshotV2Read.ts` | Add slot-to-name conversion when parsing snapshots so display always uses human-readable names. |
| `src/hooks/useTotalSnapshotV2Read.ts` | Same slot-to-name conversion as personal read hook. |
| `src/components/trackup-v2/ManualUpdateDrawer.tsx` | Pass tag name arrays to write hooks for slot key conversion. Disable Personal inputs when source is APPLICATION, disable Total inputs when source is AUTOMATED. |

### Files NOT Changed (per non-interference rule)

- `supabase/functions/update-tracking/index.ts` -- zero changes
- `src/hooks/useSnapshotV2ComputedData.ts` -- zero changes
- `src/hooks/useTrackingModes.ts` -- zero changes
- `src/hooks/useTrackingFormat.ts` -- zero changes
- `src/hooks/useTrackingSourcePreferences.ts` -- zero changes
- `src/pages/Tracking.tsx` -- zero changes (UI layout already matches spec)
- All table components -- zero changes
- `src/components/trackup-v2/ModeSelectors.tsx` -- zero changes
- `src/components/trackup-v2/ViewSelector.tsx` -- zero changes
- `src/components/trackup-v2/CollapsibleKPI.tsx` -- zero changes
- `src/components/trackup-v2/FloatingUpdateButton.tsx` -- zero changes

---

## Technical Details

### 1. Slot Key Conversion (snapshotSlotUtils.ts)

Add two functions:

- `tagNamesToSlotKeys(tagNames: string[], values: Record<string, number>, prefix: 'response_tag' | 'stage_tag')` -- Converts `{ "Interested": 3, "Follow Up": 2 }` to `{ "response_tag_1": 3, "response_tag_2": 2 }` based on position in the ordered tag names array.

- `slotKeysToTagNames(tagNames: string[], slotData: Record<string, number>, prefix: 'response_tag' | 'stage_tag')` -- Converts `{ "response_tag_1": 3, "response_tag_2": 2 }` back to `{ "Interested": 3, "Follow Up": 2 }`.

### 2. Write Hooks: Website Edge Function Call

Both write hooks will be updated to:

```
const WEBSITE_EDGE_URL = 'https://xjnzxxmpidrqjtlvslui.supabase.co/functions/v1/update-tracking';
const WEBSITE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

- Get the App's session token via `supabase.auth.getSession()`
- Pass it as `app_access_token` in the request body
- Use `Authorization: Bearer {WEBSITE_ANON_KEY}` and `apikey: {WEBSITE_ANON_KEY}` headers
- Convert tag names to slot keys before sending
- On success: invalidate React Query cache + dispatch sync events (unchanged)

### 3. Read Hooks: Slot Key to Name Conversion

When parsing snapshot rows from the database, if the `response_tags` or `stage_tags` JSON objects contain slot keys (`response_tag_1`, etc.), convert them to human-readable names using the tag names from `useTrackingFormat`. This ensures the computed data hook and table components always receive named tags.

**Note**: The read hooks will need access to tag name arrays. Since they currently don't have this context, the conversion will happen in `parseSnapshotRow` -- it will detect slot-keyed data (keys matching `response_tag_\d+` pattern) and leave it as-is for now, with the conversion happening at the point of use in the ManualUpdateDrawer hydration. This avoids changing the hook signatures.

Actually, the simpler approach: the read hooks already work with whatever keys are in the JSON. The `useSnapshotV2ComputedData` hook maps tag names to values. If the DB stores slot keys, we need to convert at read time. The cleanest way is to update `parseSnapshotRow` to accept an optional tag mapping and convert slot keys to names.

### 4. ManualUpdateDrawer: Disabled State for Source Controls

- When `personalSource === 'AUTO'` (Application): all Personal column inputs become `disabled` with `opacity-50`
- When `teamSource === 'AUTO'` (Automated): all Total column inputs become `disabled` with `opacity-50`

### 5. Sync Event Flow (unchanged)

```text
User saves in ManualUpdateDrawer
  -> writeHook calls Website edge function via fetch()
  -> On success: invalidateQueries + dispatch CustomEvent
  -> Read hooks hear event -> refetch() from App DB
  -> Tables and KPIs re-render with fresh data
```

### Implementation Order

1. Add slot key conversion utilities to `snapshotSlotUtils.ts`
2. Update `usePersonalSnapshotV2Write.ts` to use website fetch
3. Update `useTotalSnapshotV2Write.ts` to use website fetch
4. Update read hooks to convert slot keys if present
5. Update ManualUpdateDrawer for disabled states and slot key awareness
