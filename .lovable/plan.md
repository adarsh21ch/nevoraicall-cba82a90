

# Add "Not Included" Section to Pro Card

## What Changes

Add a short list of features that are **not available** in the Pro tier, shown with an X icon and dimmed styling below the Pro features list. This nudges users toward Premium by making it clear what they miss.

## Exact Change

**File: `src/components/subscription/TierCard.tsx`**

1. Import `X` icon from `lucide-react`
2. Add a new constant `PRO_EXCLUDED_FEATURES`:
   - Nevorai Funnels
   - Funnel Video Insights
   - Advanced Analytics
   - Leader Tools
3. After the Pro features list (the green checkmark items), render the excluded features with a red/muted X icon and strikethrough or dimmed text styling
4. Only show excluded list when `isPremium === false`

## Visual Result

**Pro Card will look like:**
- [check] Full Application Access (Calling + Follow-up)
- [check] TrackUp Dashboard (Advanced Tracking)
- [check] Higher Limits and Productivity Tools
- [check] Faster Workflow and Automation
- [x] Nevorai Funnels (dimmed, with X)
- [x] Funnel Video Insights (dimmed, with X)
- [x] Advanced Analytics (dimmed, with X)
- [x] Leader Tools (dimmed, with X)

**Premium Card stays the same** (all checkmarks, no changes).

## Technical Details

- Add `X` to the lucide-react import (line 1)
- Add `PRO_EXCLUDED_FEATURES` array after `PRO_FEATURES` (after line 10)
- After the features `.map()` block (after line 79), conditionally render excluded features when `!isPremium` using the `X` icon with `text-muted-foreground/50` styling and `line-through` on the text

