
# TrackUp Refinements & Today-Centered View Plan

## Summary

This plan addresses the remaining TrackUp UX refinements:
1. Remove the third "Insights" tab and embed insights as collapsible sections below each tracker
2. Implement "Today-Centered View" with auto-scroll and visual highlighting
3. Add star highlight consistency for key metrics
4. Add "Open TrackUp Dashboard" button in header
5. Improve bottom navigation with keyboard hiding behavior

---

## 1. TrackUp Navigation - Two Tabs Only

### Current State
The TrackUp page has THREE tabs: Leads, Funnel, Insights

### Required Change
Remove the "Insights" tab. Keep only:
- **Leads** (Leads tracking table + Leads-specific insights below)
- **Funnel** (Funnel tracking table + Funnel-specific insights below)

### File: `src/pages/Tracking.tsx`

**Changes:**
- Remove `'analytics'` from the `activeTab` state type
- Remove the `analytics` option from `toggleOptions`
- Remove the `TrackUpAnalytics` import and component rendering
- Pass insights directly to `DynamicLeadsTracker` and `DynamicFunnelTracker`

---

## 2. Insights Placement (Collapsible Below Each Tracker)

### Leads Tab Insights
Below the Leads tracking table, add a collapsible "View Insights ↓" section showing:
- Conversion Metrics (Lead → Response %)
- AI Tip of the Day (if relevant to leads)
- Daily Insights (leads-focused)

### Funnel Tab Insights
Below the Funnel tracking table, add a collapsible "View Insights ↓" section showing:
- Funnel Drop-Off metrics
- AI Tip of the Day (if relevant to funnel)
- Weekly Report summary

### Files to Modify

**`src/components/tracking/DynamicLeadsTracker.tsx`**
- Add collapsible insights section at the bottom
- Import `ConversionMetrics`, `AITipCard`, `DailyInsightsCard`
- Add state: `showInsights` (default: false)
- Add expandable section with "View Insights ↓" toggle

**`src/components/tracking/DynamicFunnelTracker.tsx`**
- Add collapsible insights section at the bottom
- Import `FunnelDropOff`, `AITipCard`, `WeeklyReportCard`
- Add state: `showInsights` (default: false)
- Add expandable section with "View Insights ↓" toggle

---

## 3. Today-Centered View (Auto-Scroll + Highlighting)

### Leads Tracking - Today's Date Centered
When the Leads tab opens:
1. Calculate today's column index in the `dailyMetrics` array
2. Auto-scroll horizontally so today's date is in the CENTER (3rd column visible on mobile)
3. Apply subtle visual highlighting to today's column (background tint)

### Funnel Tracking - Current Funnel Centered
When the Funnel tab opens:
1. Calculate which funnel period contains today's date
2. Auto-scroll horizontally to center that funnel
3. Apply subtle visual highlighting to the active funnel column

### Implementation Details

**`src/components/tracking/DynamicLeadsTracker.tsx`**
```typescript
// Add useEffect for auto-scroll on mount
useEffect(() => {
  if (!scrollContainerRef.current || loading) return;
  
  // Find today's column index
  const today = new Date();
  const todayDate = today.getDate();
  
  // Calculate scroll position to center today
  // Each column is ~48px wide, we want 2 columns before today visible
  const columnWidth = 48;
  const todayColumnIndex = todayDate - 1;
  const scrollPosition = Math.max(0, (todayColumnIndex - 2) * columnWidth);
  
  scrollContainerRef.current.scrollLeft = scrollPosition;
}, [loading, monthYear]);

// Add highlight class to today's column
const isToday = (dayNumber: number) => {
  const now = new Date();
  const currentMonthYear = format(now, 'yyyy-MM');
  return monthYear === currentMonthYear && dayNumber === now.getDate();
};
```

**`src/components/tracking/DynamicFunnelTracker.tsx`**
```typescript
// Calculate which funnel contains today
const currentFunnelIndex = useMemo(() => {
  const today = new Date();
  const todayDate = today.getDate();
  const currentMonthYear = format(today, 'yyyy-MM');
  
  if (monthYear !== currentMonthYear) return -1;
  
  return Math.floor((todayDate - 1) / funnelLength);
}, [monthYear, funnelLength]);

// Auto-scroll to center current funnel
useEffect(() => {
  if (!scrollContainerRef.current || loading || currentFunnelIndex < 0) return;
  
  const columnWidth = 60;
  const scrollPosition = Math.max(0, (currentFunnelIndex - 2) * columnWidth);
  
  scrollContainerRef.current.scrollLeft = scrollPosition;
}, [loading, currentFunnelIndex]);
```

### Visual Highlighting Styles
```css
/* Today's date column - subtle highlight */
.today-column {
  background-color: hsl(var(--primary) / 0.08);
  border-left: 1px solid hsl(var(--primary) / 0.2);
  border-right: 1px solid hsl(var(--primary) / 0.2);
}

/* Current funnel column - subtle highlight */
.current-funnel-column {
  background-color: hsl(var(--primary) / 0.08);
}
```

---

## 4. Star Highlight Consistency

### Current State
- Funnel Tracking: ⭐ star on final stage (correct)
- Leads Tracking: ⭐ star only on `leadsFinalTargetTag` (usually Enrollment)

### Required Change
Add visual emphasis to **Responses** row in Leads tracking (as this is the key conversion point from Leads → Funnel)

### File: `src/components/tracking/DynamicLeadsTracker.tsx`

**Changes:**
- Add star icon and ring highlight to the "Responses" row (similar to final target in Funnel)
- Keep the existing star on `leadsFinalTargetTag`

```typescript
// In the metrics array builder
{ 
  key: 'responses', 
  label: 'Responses', 
  icon: MessageSquare, 
  color: METRIC_COLORS.responses,
  isKeyConversion: true  // NEW: mark as key conversion point
}

// In the row rendering, apply star and ring similar to isFinal
{isKeyConversion && <Star className="h-3 w-3 text-emerald-500 fill-emerald-500" />}
```

---

## 5. Top-Right Dashboard Link

### Requirement
Add a button/icon in the TrackUp header to open the full TrackUp Dashboard on nevorai.com

### File: `src/pages/Tracking.tsx`

**Changes:**
Add an icon button in the header area (right side):
```tsx
<Button
  variant="ghost"
  size="icon"
  onClick={() => window.open(`${NEVORAI_WEBSITE_URL}/trackup`, '_blank')}
  className="h-8 w-8"
>
  <ExternalLink className="h-4 w-4" />
</Button>
```

Import `NEVORAI_WEBSITE_URL` from `@/config/siteUrl`

---

## 6. Bottom Navigation - Hide on Keyboard Open

### File: `src/components/layout/BottomNav.tsx`

**Changes:**
Add keyboard visibility detection:
```typescript
const [keyboardVisible, setKeyboardVisible] = useState(false);

useEffect(() => {
  // Detect virtual keyboard on mobile
  const handleResize = () => {
    // If visual viewport is significantly smaller than window, keyboard is open
    const isKeyboardOpen = window.visualViewport 
      ? window.visualViewport.height < window.innerHeight * 0.75
      : false;
    setKeyboardVisible(isKeyboardOpen);
  };

  window.visualViewport?.addEventListener('resize', handleResize);
  return () => window.visualViewport?.removeEventListener('resize', handleResize);
}, []);

// Conditionally render
if (keyboardVisible) return null;
```

---

## Files to Modify Summary

| File | Changes |
|------|---------|
| `src/pages/Tracking.tsx` | Remove analytics tab, add dashboard link button |
| `src/components/tracking/DynamicLeadsTracker.tsx` | Add today-centered scroll, highlight today's column, add collapsible insights, add star to Responses |
| `src/components/tracking/DynamicFunnelTracker.tsx` | Add current-funnel-centered scroll, highlight current funnel, add collapsible insights |
| `src/components/layout/BottomNav.tsx` | Add keyboard visibility detection to hide nav |

---

## Technical Implementation Notes

### Auto-Scroll Timing
The auto-scroll must occur AFTER the table is rendered. Use `useEffect` with proper dependencies and a small `requestAnimationFrame` delay if needed.

### Highlight Styling
Use Tailwind classes for consistency:
- Today column: `bg-primary/5 ring-1 ring-inset ring-primary/20`
- Current funnel: `bg-primary/5`

### Insights Props
The trackers will receive additional props for insights data:
```typescript
interface TrackerProps {
  isPro?: boolean;
  // NEW: for embedded insights
  showInsightsOption?: boolean;
  leadsTotal?: number;
  responsesTotal?: number;
  enrollmentsTotal?: number;
  // etc.
}
```

---

## Expected Outcomes

1. **Two-tab TrackUp** - Clean Leads/Funnel toggle, no separate Insights tab
2. **Contextual insights** - Each tracker has its own relevant insights hidden by default
3. **Today-centered view** - User immediately sees today's data without scrolling
4. **Visual consistency** - Stars on key metrics (Responses + Final targets)
5. **Dashboard access** - Quick link to full web dashboard
6. **Keyboard-aware nav** - Bottom nav hides when typing
