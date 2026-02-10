
## Fix: Application Mode Not Showing Leads Data in TrackUp

### Root Cause Found

The auto-sync (`useAutoTrackingSync`) only counts prospects added **today** (filters by `date_added` between today's start and end). But the user's 300+ leads were imported on previous days (Feb 1-8). So when auto-sync runs, it finds 0 prospects for today and writes `total_leads: 0` to the snapshot.

Additionally, the auto-sync only triggers on prospect mutations (add/import/delete). If the user just switches to Application mode, nothing triggers a sync for historical dates.

Database proof:
- User has leads spread across Jan 13 - Feb 8 (various import batches)
- The APPLICATION snapshot row for Feb 10 shows `total_leads: 0` because no prospects were added on Feb 10
- Previous days have no APPLICATION rows at all

### Solution: Compute Application Data from Prospects at Read Time

Instead of trying to write snapshot rows for every historical date (which would require dozens of slow edge function calls), we compute the data **directly from the prospects table** when the source is APPLICATION. This guarantees the data is always fresh and correct.

---

### Changes

**1. New Hook: `src/hooks/useApplicationSnapshots.ts`**

A new hook that replaces snapshot reads when source = APPLICATION:
- Queries ALL prospects for the given month (grouped by `date(date_added)`)
- Counts leads, response tags, and stage tags per day
- Returns data in the same `SnapshotRow[]` format that the dashboard expects
- No edge function calls needed -- pure client-side computation from the prospects table

**2. Update: `src/pages/Tracking.tsx`**

- When `personalSource === 'AUTO'`, use `useApplicationSnapshots` for personal data instead of `usePersonalSnapshotV2Read`
- When `personalSource === 'MANUAL'`, keep using the existing snapshot read (unchanged behavior)
- The switch is seamless -- both return the same `SnapshotRow[]` format

**3. Update: `src/components/profile/ProfileTrackUp.tsx`**

- Same source-based switching as Tracking.tsx

**4. Cleanup: `src/hooks/useAutoTrackingSync.ts`**

- Keep for future use (writing APPLICATION rows for team aggregation)
- Fix it to compute per-date snapshots when triggered (not just today)
- But the dashboard no longer depends on it for display

---

### Data Flow After Fix

```text
Source = MANUAL:
  Read from personal_snapshot_v2 (existing behavior, unchanged)

Source = APPLICATION:
  Query prospects table directly for the month
  -> Group by date_added
  -> Count leads, responses, tags per day
  -> Return as SnapshotRow[] (same format)
  -> Dashboard renders correctly with real data
```

### What This Fixes

- 300+ imported leads now appear in TrackUp immediately when source = Application
- Tags applied in the Calling tab are reflected in real-time
- Historical data (all past days) shows correctly, not just today
- Switching between Manual and Application instantly changes the data source
- No dependency on edge function writes for display

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useApplicationSnapshots.ts` | NEW -- computes daily snapshots from prospects table |
| `src/pages/Tracking.tsx` | Use application snapshots when source = AUTO |
| `src/components/profile/ProfileTrackUp.tsx` | Same source-based switch |
| `src/hooks/useAutoTrackingSync.ts` | Fix to group by date instead of today-only (for team aggregation) |
