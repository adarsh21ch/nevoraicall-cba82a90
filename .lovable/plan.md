
## Fix nevorai-ai: Three Critical Data Bugs

### Bug 1: Label Parsing Broken

**Current code** (`parseLabels`, line 54-62):
```js
if (typeof raw === "object" && Array.isArray(raw.tracking)) return raw.tracking;
```

**Actual data format**:
- `response_labels`: `{tracking: [{name: "Video Sent"}, {name: "Enrolment"}]}`
- `stage_labels`: `{stages: [{name: "Day 1"}, {name: "Day 2"}, ...]}`

The function returns `[{name: "Video Sent"}, ...]` (objects) instead of `["Video Sent", ...]` (strings). And it never checks `raw.stages` for stage labels.

**Fix**: Update `parseLabels` to:
- Extract `.name` from object-style entries: `raw.tracking.map(t => t.name)`
- Also check `raw.stages` for stage labels: `raw.stages.map(s => s.name)`

### Bug 2: Wrong Table for "My KPIs"

The user's `personal_snapshot_v2` has ALL ZEROS. The dashboard "Total" view reads from `total_snapshot_v2` which has the real data (4718 leads, etc.).

**Fix**: Update `get_snapshot_kpis` to accept an optional `source` parameter (`"personal"` or `"total"`, defaulting to `"total"`), and query the appropriate table. Similarly update `get_funnel_stages`, `get_conversion_rates`, and `get_tracking_status` to also query `total_snapshot_v2` as fallback when personal data is empty.

Update the tool definition to include the `source` parameter, and update the system prompt to tell the AI:
- Use `source: "total"` by default (matches dashboard "Total" view)
- Use `source: "personal"` only when the user explicitly asks for personal-only data

### Bug 3: Enrollment Uses Wrong Column

`final_tag_count` is 0 everywhere. The dashboard's "250 Enrolment" comes from summing the response tag that has `isStageTag: true` or is named "Enrolment" (i.e., `response_tag_2`).

**Fix**: Instead of relying on `final_tag_count`, identify the enrollment tag dynamically from `response_labels.tracking` entries. Find the one where `isStageTag: true` or `isFinalTarget: true`, then sum its corresponding slot key value from `response_tags`. Fallback to `final_tag_count` if no such tag exists.

### Files Changed

| File | Changes |
|------|---------|
| `supabase/functions/nevorai-ai/index.ts` | Fix `parseLabels` to handle `{tracking: [{name}]}` and `{stages: [{name}]}` formats; add `source` param to snapshot tools to query `total_snapshot_v2` vs `personal_snapshot_v2`; fix enrollment calculation to sum from response tags instead of `final_tag_count`; update system prompt to instruct AI to use total by default |

### No Other Changes
- Frontend (`AIAssistantChat.tsx`) unchanged -- it already correctly handles the JSON response
- No database or RLS changes needed
- No other components affected
