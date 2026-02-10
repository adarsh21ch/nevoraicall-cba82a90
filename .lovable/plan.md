

## Phase 2: Fix Application Tracking Logic (Cumulative + Personal Tags)

### What's Wrong Now

The `useApplicationSnapshots` hook has 3 logic bugs:

1. **Responses count** -- only counts leads with `action_taken` set. Leads that have personal tags but no response tag are missed.
2. **Response stages are NOT cumulative** -- if a lead has Response 3, it only increments Response 3's count. It should increment Response 1, 2, AND 3 (backfill).
3. **Funnel stages are NOT cumulative** -- same issue. A lead at Stage 3 should count in Stage 1, 2, and 3.

### What Changes

Only ONE file: `src/hooks/useApplicationSnapshots.ts`

No changes to snapshots, automation, source logic, team aggregation, or any other file.

### New Logic (per day, per lead)

```text
A) LEADS = count of all prospects for that day (unchanged)

B) RESPONSES = count of leads that have ANY tag:
   - action_taken is set, OR
   - personal_tags array is non-empty
   Count each lead once.

C) RESPONSE STAGES (cumulative):
   Tags are ordered: [Response1, Response2, Response3, ...]
   If lead's action_taken = Response3 (index 2):
     -> increment Response1, Response2, Response3

D) FUNNEL STAGES (cumulative):
   Tags are ordered: [Stage1, Stage2, Stage3, ...]
   If lead's funnel_stage = Stage3 (index 2):
     -> increment Stage1, Stage2, Stage3

E) PERSONAL TAGS:
   - Count toward Responses (base count)
   - Do NOT affect response stage counts
   - Do NOT affect funnel stage counts
```

### Technical Details

1. Add `personal_tags` to the Supabase query select
2. Update `totalResponses` to count leads with `action_taken` OR non-empty `personal_tags`
3. For response tag counting: find the index of the lead's `action_taken` in `leadsTrackingTagNames`, then increment ALL tags from index 0 up to that index
4. For stage tag counting: find the index of the lead's `funnel_stage` in `stageTagNames`, then increment ALL tags from index 0 up to that index
5. `final_tag_count` and `funnel_tag_count` will automatically be correct since they read from the already-cumulative tag objects

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useApplicationSnapshots.ts` | Update query + counting logic (cumulative + personal tags) |

No other files are touched. The `useApplicationTotalSnapshots` hook consumes the output of this hook, so it automatically gets correct data too.
