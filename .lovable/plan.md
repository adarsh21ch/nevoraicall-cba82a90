

## Fix TrackUp Date-wise Table and Funnel-wise Table Issues

### Problem 1: Date-wise table only shows dates with existing data
The `DateWiseTable` currently only renders columns for dates that have snapshot rows in the database. If data exists only for Feb 8, only that one column appears. It should show **all days of the selected month** (1-28/29/30/31) with zeros for days without data.

### Problem 2: "No funnel data available" despite KPI showing stage totals
The KPI section correctly aggregates stage tag totals from snapshots. However, the `FunnelWiseTable` requires a `funnel_configs` entry with a `day_1_start` date to calculate funnel periods (F1, F2, etc.). If no funnel config exists (for the user or their leader), `funnelPeriods` is empty and the "no data" message shows -- even though stage data exists in snapshots.

### Solution

**Fix 1 -- Generate full month of dates in DateWiseTable**

Modify `useSnapshotV2ComputedData` to accept the `monthYear` string and generate `dailyMetrics` for **every day of the month**, filling missing dates with zero values. This ensures the table always shows all dates regardless of whether snapshot rows exist.

- Add `monthYear` parameter to the hook
- Generate a complete date array for the month (e.g., Feb 2026 = 28 days)
- Merge existing snapshot data onto the full date array
- Days without data show zeros

**Fix 2 -- Fallback for Funnel-wise when no funnel config exists**

When `funnelStartDate` is null (no funnel config), instead of showing "No funnel data," fall back to showing stage data grouped by a sensible default (e.g., assume day 1 of the month as the start). Alternatively, show a flat stage summary table so the user still sees their stage tag data.

- In `useSnapshotV2ComputedData`, when `funnelStartDate` is null, default to day 1 of the viewing month
- This way funnel periods are always computed when stage data exists
- The "set up funnel start date" message only shows when there are truly zero snapshots

### Files to Change

1. **`src/hooks/useSnapshotV2ComputedData.ts`**
   - Add `monthYear` parameter
   - Generate all days of the month in `dailyMetrics` (fill gaps with zeros)
   - Default `funnelStartDate` to 1st of the month when null

2. **`src/pages/Tracking.tsx`**
   - Pass `monthYear` to `useSnapshotV2ComputedData`

