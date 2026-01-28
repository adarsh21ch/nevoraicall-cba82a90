
## Goal
Fix the TrackUp “View Insights” scroll bug (mobile + desktop) so that after expanding Insights, the user can scroll naturally to see all insight content, while keeping only:
- TrackUp header + Dashboard button (already fixed)
- Leads/Funnel toggle (already fixed)
- KPI row (make sticky)
…fixed at the top. Everything below KPIs must scroll.

## What’s causing the “can’t scroll after opening View Insights”
There are two compounding layout issues:

1) **Tracking page uses a fixed-height inner container**
In `src/pages/Tracking.tsx`, the scroll container is `main.scrollable-content` (correct), but inside it we render a child wrapper with `h-full flex flex-col` and an inner `flex-1 min-h-0` wrapper.  
This pattern often prevents the scroll container from “growing” when content expands (like when Insights opens). Result: Insights expands, but the page’s scroll height doesn’t increase correctly, so scrolling feels stuck and content gets clipped/hidden.

2) **Collapsible animation keyframes are wired to the wrong Radix CSS variable**
In both trackers, we use:
`data-[state=open]:animate-accordion-down`
…but Tailwind’s keyframes use `--radix-accordion-content-height`.  
Radix Collapsible uses `--radix-collapsible-content-height`. This mismatch can cause height animation to resolve incorrectly, which can make content appear partially hidden and feel broken.

## Fix strategy (minimal + targeted, no data/logic/design changes)
We will only adjust layout/scroll mechanics and keep your current UI structure.

---

## Changes to implement

### 1) Make the Tracking page allow true content growth (fix main scroll)
**File:** `src/pages/Tracking.tsx`

**Change:**
- Replace the inner wrapper class `h-full` with `min-h-full` (or remove the forced height entirely).
- Remove/avoid the extra `flex-1 min-h-0` wrapper around the tracker, so the tracker’s expanded content contributes to the scroll height of `main.scrollable-content`.

**Why this works:**
- `main.scrollable-content` will correctly measure content height when Insights expands, so vertical scrolling works reliably.

**Expected result:**
- After opening Insights, the user can scroll down to all insight cards and scroll back up to the table.

---

### 2) Fix Collapsible expand/collapse height animation so it never clips Insights
**File:** `tailwind.config.ts`

**Change (recommended minimal impact):**
Update the existing `accordion-down` / `accordion-up` keyframes to support BOTH Radix variables using a CSS var fallback:

- `var(--radix-accordion-content-height, var(--radix-collapsible-content-height))`

This allows the same animation utilities to work for Accordion and Collapsible without changing component code everywhere.

**Why this works:**
- Your trackers currently use `animate-accordion-down/up` on CollapsibleContent. After this change, the animation will correctly compute height and won’t stop at 0 or clip content.

---

### 3) Enforce the “sticky KPIs only” rule inside each tracker
**Files:**
- `src/components/tracking/DynamicLeadsTracker.tsx`
- `src/components/tracking/DynamicFunnelTracker.tsx`

**Change:**
- Make ONLY the KPI Summary Row sticky within the `main.scrollable-content` scroll area:
  - Wrap KPI section in a container like:
    - `sticky top-0 z-30 bg-background/95 backdrop-blur-sm`
  - Add a subtle bottom border/shadow so it remains readable over scrolling content:
    - `border-b border-border/50` (or similar)

**Important:**
- Month selector must NOT be sticky.
- Tracking table must NOT be sticky.
- Insights must remain inline below table and scroll normally.

**Expected result:**
- KPIs stay visible while scrolling through the table and Insights.
- The user can scroll freely up/down; no scroll lock.

---

### 4) Ensure “View Insights” remains inline and scrolls with page flow
**Files:**
- `src/components/tracking/DynamicLeadsTracker.tsx`
- `src/components/tracking/DynamicFunnelTracker.tsx`

**Keep as-is (already correct):**
- Collapsible placed below the tracking table.
- “View Insights” toggles to “Hide Insights”.
- Inline accordion-style expansion (no drawer/bottom sheet).

**Small adjustment (only if needed after fixes above):**
- Ensure CollapsibleContent does NOT create a separate internal scroll container; it should expand and let the page scroll (which we already do). We’ll keep `overflow-hidden` for animation, but rely on the corrected animation height + fixed page container to solve clipping.

---

## QA / Verification Checklist (mobile + desktop)
1) Go to TrackUp → Leads → tap “View Insights”
   - Insights expands fully
   - You can scroll down to see Conversion Metrics, AI Tip, Daily Insights
   - You can scroll back up to the tracking table
   - KPI row stays visible at the top during scroll

2) Go to TrackUp → Funnel → tap “View Insights”
   - Insights expands fully
   - You can scroll through Funnel Drop-Off, AI Tip, Weekly Summary
   - KPI row stays visible at the top during scroll

3) Confirm no regressions:
   - Horizontal scroll inside tables still works
   - Today-centered auto-scroll still works
   - Bottom nav remains visible and not overlapped
   - No new tabs added; still only Leads/Funnel

---

## Files to be changed (summary)
- `src/pages/Tracking.tsx` (remove fixed-height layout that blocks scroll growth)
- `tailwind.config.ts` (fix animation keyframes to support Radix Collapsible)
- `src/components/tracking/DynamicLeadsTracker.tsx` (make KPI row sticky only)
- `src/components/tracking/DynamicFunnelTracker.tsx` (make KPI row sticky only)

## Rollout notes
These changes are intentionally minimal and scoped to the TrackUp scroll container + Collapsible animation variable mismatch. They should not affect tracking data, KPI styling/colors, or analytics logic.
