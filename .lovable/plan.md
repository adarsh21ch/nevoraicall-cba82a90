
# Navigation Cleanup + TrackUp UI Update Plan

## Summary

This plan implements four key changes to clean up the NevorAI mobile app navigation and align the TrackUp mobile UI with the TrackUp Dashboard format:

1. **Remove "My Tracking" from Profile** - Eliminate redundant entry point
2. **Integrate Recent Activity into To-Do Tab** - Add toggle icon, not a separate tab
3. **Update TrackUp Mobile UI** - Match the dashboard's horizontal scroll grid layout
4. **Maintain UX Priority Principle** - Clean bottom navigation aligned with usage patterns

---

## 1. Profile Tab Cleanup

### What Changes
Remove the "My Tracking" button from the Profile page since TrackUp is now accessible via the bottom navigation tab.

### Files to Modify
- `src/pages/Profile.tsx`

### Implementation
- **Delete lines 286-308**: Remove the entire "My Tracking" button block
- Keep the "TrackUp Dashboard" button (external link to nevorai.com) as it serves a different purpose (opens web dashboard for team tracking)
- The Profile page will retain: Account info, Settings, User Guide, Help & Support, Admin Panel (if admin)

### Before/After Visual
```
BEFORE:                          AFTER:
┌────────────────────┐          ┌────────────────────┐
│ User Card          │          │ User Card          │
├────────────────────┤          ├────────────────────┤
│ Upline Settings    │          │ Upline Settings    │
├────────────────────┤          ├────────────────────┤
│ My Tracking ❌     │          │ TrackUp Dashboard  │
│ TrackUp Dashboard  │          ├────────────────────┤
├────────────────────┤          │ Settings           │
│ Settings           │          ├────────────────────┤
└────────────────────┘          └────────────────────┘
```

---

## 2. Recent Activity Integration in To-Do Tab

### Concept
Add a toggle in the To-Do tab header that switches between the existing To-Do/Daily Tasks view and a Recent Activity view. This is a view toggle, not navigation.

### Files to Modify
- `src/pages/TodoUp.tsx`

### Implementation Details

**A. Update ViewMode Type**
```typescript
type ViewMode = 'todo-list' | 'daily-tasks' | 'recent-activity';
```

**B. Add History Toggle Icon to Header**
Add a clock/history icon button in the header area (right side, near HeaderBellIcon):
- Icon: `Clock` or `History` from lucide-react
- Tapping toggles between current view and Recent Activity
- Active state: icon highlighted when Recent Activity is active

**C. Import Recent Activity Dependencies**
- Import `useProspectsQuery` hook to fetch prospect data
- Reuse activity logic from Home.tsx

**D. Add Recent Activity View**
Create a new view section that displays:
- Date selector (calendar strip already exists)
- Timeline of prospect updates for selected date
- Call/WhatsApp quick action buttons on each item
- Search functionality

**E. UI Behavior**
- Default: To-Do List tab
- Tap clock icon → switches to Recent Activity view
- Tap clock icon again → switches back to previous To-Do view
- The tabs (To-Do List / Daily Tasks) are hidden when Recent Activity is active
- A "Back to Tasks" button or re-tap of clock returns to task view

### Header Layout
```
┌─────────────────────────────────────────────┐
│ [Logo] To-Do List              🕐 🔔      │
│        Your Tasks & Reminders              │
├─────────────────────────────────────────────┤
│ [ To-Do List ] [ Daily Tasks ]             │  ← Hidden when Recent Activity active
└─────────────────────────────────────────────┘
```

When Recent Activity is active:
```
┌─────────────────────────────────────────────┐
│ [Logo] Recent Activity        🕐(active) 🔔│
│        Today's Updates                     │
├─────────────────────────────────────────────┤
│ [ Calendar Strip ]                         │
└─────────────────────────────────────────────┘
```

---

## 3. TrackUp Mobile UI Update (Match Dashboard Format)

### Current Problem
The current TrackUp mobile layout uses a vertical KPI cards + vertical table format. The TrackUp Dashboard uses a horizontal scrolling grid with:
- Sticky left column (Metric names / Stage names)
- Horizontal scroll for dates/funnels
- Clear visual separation between sections

### Files to Modify
- `src/components/tracking/DynamicLeadsTracker.tsx`
- `src/components/tracking/DynamicFunnelTracker.tsx`

### New Layout Structure (Leads Tracking)

Based on the dashboard reference images:

```
┌─────────────────────────────────────────────────────────────┐
│  Leads: 120  |  Responses: 90                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Enrolment: 12  👥                                    │   │
│  │ ┌──────────┬──────────┬──────────┐                  │   │
│  │ │Active Days│Video Send│Enrolment │                  │   │
│  │ │  1/31    │    0     │   12     │                  │   │
│  │ └──────────┴──────────┴──────────┘                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────┬───────┬───────┬───────┬───────┬───────┬────→ │
│  │ Metric   │ 1 Jan │ 2 Jan │ 3 Jan │ 4 Jan │ 5 Jan │ ...  │
│  ├──────────┼───────┼───────┼───────┼───────┼───────┼────→ │
│  │ Leads    │  —    │  —    │  —    │  —    │  —    │ ...  │
│  │ Responses│  —    │  —    │  —    │  —    │  —    │ ...  │
│  │ Video S. │  —    │  —    │  —    │  —    │  —    │ ...  │
│  │ Enrolment│  —    │  —    │  —    │  —    │  —    │ ...  │
│  │ Total    │  —    │  —    │  —    │  —    │  —    │ ...  │
│  └──────────┴───────┴───────┴───────┴───────┴───────┴────→ │
└─────────────────────────────────────────────────────────────┘
                     ↓ Vertical scroll for more rows
                     → Horizontal scroll for more dates
```

### New Layout Structure (Funnel Tracking)

```
┌─────────────────────────────────────────────────────────────┐
│  Entry: 0  |  ⭐ Final: 0                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Enrolment: 12  👥                                    │   │
│  │ ┌────────┬────────┬────────┬──────────┬────────┐    │   │
│  │ │  DAY1  │  DAY2  │   MB   │ LEVEL UP │  2CC ⭐│    │   │
│  │ │   0    │   0    │   0    │    0     │   0    │    │   │
│  │ └────────┴────────┴────────┴──────────┴────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Conversion: [From ▼] → [To ▼]                             │
│                                                             │
│  ┌──────────┬─────────┬─────────┬─────────┬─────────┬────→ │
│  │ Stage    │ Funnel 1│ Funnel 2│ Funnel 3│ Funnel 4│ ...  │
│  │          │ 2-4 Jan │ 5-7 Jan │ 8-10 Jan│11-13 Jan│ ...  │
│  ├──────────┼─────────┼─────────┼─────────┼─────────┼────→ │
│  │ DAY1     │   —     │   —     │   —     │   —     │ ...  │
│  │ DAY2     │   —     │   —     │   —     │   —     │ ...  │
│  │ MB       │   —     │   —     │   —     │   —     │ ...  │
│  │ LEVEL UP │   —     │   —     │   —     │   —     │ ...  │
│  │ 2CC ⭐   │   —     │   —     │   —     │   —     │ ...  │
│  │ Total    │   —     │   —     │   —     │   —     │ ...  │
│  └──────────┴─────────┴─────────┴─────────┴─────────┴────→ │
└─────────────────────────────────────────────────────────────┘
```

### Key Technical Changes

**A. Transpose Table Structure**
- Current: Rows = dates, Columns = metrics
- New: Rows = metrics, Columns = dates

**B. Sticky First Column**
```css
.tracking-table {
  display: grid;
  overflow-x: auto;
}

.metric-column {
  position: sticky;
  left: 0;
  z-index: 10;
  background: var(--card);
}
```

**C. Summary Header Cards**
Replace KPI grid with horizontal summary bar matching dashboard:
- Total counts inline (Leads: X | Responses: Y)
- Collapsible enrollment badge
- Stage KPI cards in horizontal scrollable strip

**D. Mobile Optimizations**
- Minimum column width: 60px for dates
- Touch-friendly horizontal scroll
- Sticky metric column always visible
- Clear visual separator between Leads and Funnel sections

---

## 4. Remove Home/Activity from Bottom Nav (Already Done)

Per the memory context, the bottom navigation has already been reordered to:
1. Calling → `/dashboard`
2. Follow-Up → `/listup`
3. To-Do → `/action`
4. TrackUp → `/tracking`
5. Profile → `/profile`

The "Activity" tab (Home.tsx) is no longer in the bottom nav. The Recent Activity functionality will now be integrated into To-Do tab as specified above.

---

## Technical Implementation Order

1. **Profile Cleanup** (Quick win)
   - Remove "My Tracking" button from Profile.tsx

2. **To-Do Tab Enhancement** 
   - Add Recent Activity toggle icon
   - Import activity data hooks
   - Create RecentActivityView component inline
   - Handle view state switching

3. **TrackUp UI Overhaul**
   - Restructure DynamicLeadsTracker with transposed grid
   - Restructure DynamicFunnelTracker with transposed grid
   - Implement sticky first column
   - Update header summary cards

---

## Files to Modify Summary

| File | Change |
|------|--------|
| `src/pages/Profile.tsx` | Remove "My Tracking" button (lines 286-308) |
| `src/pages/TodoUp.tsx` | Add Recent Activity toggle + view |
| `src/components/tracking/DynamicLeadsTracker.tsx` | Transpose table, sticky column, new header |
| `src/components/tracking/DynamicFunnelTracker.tsx` | Transpose table, sticky column, new header |

---

## Expected Outcomes

1. **Cleaner Profile page** - No duplicate tracking entry points
2. **Recent Activity discoverable but not intrusive** - Toggle in To-Do, not a bottom tab
3. **TrackUp mobile matches dashboard** - Same mental model across web and app
4. **Bottom navigation reflects priorities** - High-frequency actions first
