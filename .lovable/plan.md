

# Calling Tab UI/UX Upgrade Plan

## Overview
A focused set of improvements to make the Calling tab faster, more space-efficient, and visually polished -- keeping the premium blue brand identity intact.

---

## 1. Auto-Hiding Search Bar (Scroll-Aware)

**Current:** Search bar is always visible in the fixed header, taking ~40px of vertical space even when not needed.

**Upgrade:** Hide the search bar when the user scrolls down (more room for the prospect list). When they scroll back up, the search bar smoothly slides back in.

- Uses the existing `useCollapsibleHeader` pattern (already in the codebase) to track scroll direction
- Animated height transition (200ms ease) so it feels smooth, not jarring
- Header sections: Row A (logo + title) and Row B (Leads/Funnel toggle) stay fixed; Row C (search) collapses/expands

---

## 2. Compact Horizontal KPI Strip with Color Coding

**Current:** KPI strip shows small gray pills with counts -- functional but visually flat.

**Upgrade:** Redesign as a single-line horizontal scrollable strip where each tag gets its own distinct color (pulled from the existing `tagColors.ts` color system).

- Total count pill: blue (brand color)
- Each response/stage tag pill: uses the tag's assigned color as a subtle tinted background (same colors already used in badges)
- Format: `[color dot] TagName  count` in each pill
- Horizontally scrollable with hidden scrollbar
- More compact: pills use slightly smaller padding for density

---

## 3. Full-Width Tappable Tag Cells in Table Rows

**Current:** The Response/Stage column shows a small badge. The clickable area is just the badge itself -- lots of blank space around it goes unused.

**Upgrade:** Make the entire cell act as the tap target for tag selection.

- The `InlineSelect` trigger expands to fill the full cell width and height
- The colored badge stretches to fill the cell with a subtle tinted background matching the tag color
- When no tag is assigned, the full cell shows "Select..." in a muted style, making it obvious it's tappable
- This eliminates the "dead space" problem and makes tag assignment feel instant

---

## 4. Distinct Colors for Every Stage/Response Tag

**Current:** Tags already have colors defined in `tagColors.ts`, but the table badges use a light tint (`color + 15% opacity` background). Some tags with similar names can look alike.

**Upgrade:** Enhance visual differentiation:

- Each tag badge uses a stronger tint (20-25% opacity background instead of 15%)
- Add a small 4px left-border accent in the tag's full color on each table row when a tag is assigned (like a color indicator stripe)
- In the KPI strip, each tag pill gets a colored dot or left-border accent
- The color palette from `tagColors.ts` already covers: green (positive), blue/purple (neutral), red/gray (negative), violet (stages) -- these will be more prominent

---

## 5. Streamlined Filter/Action Bar

**Current:** The Retargeting dropdown, Export button, Import button, and Add button are all on one line. On mobile, it feels cramped.

**Upgrade:**
- Group the Retargeting filter dropdown and Export into a single compact row
- Import and Add (+) buttons remain right-aligned but with slightly larger touch targets (44px min)
- Remove redundant label text on mobile -- icons only for Import/Export with tooltips
- The filter row gets a subtle bottom border to visually separate it from the table

---

## Technical Details

### Files to Modify:

1. **`src/pages/Dashboard.tsx`**
   - Integrate scroll-direction detection for the search bar
   - Add CSS transition for search bar collapse/expand
   - Pass scroll state to control search visibility

2. **`src/components/prospects/KPIStrip.tsx`**
   - Import `getTagColor` from `tagColors.ts`
   - Apply per-tag colors to each KPI pill background
   - Add colored dot indicator before each tag name

3. **`src/components/prospects/ProspectRow.tsx`**
   - Expand `InlineSelect` trigger to `w-full h-full` within cells
   - Add colored left-border accent when a tag is assigned

4. **`src/components/prospects/InlineSelect.tsx`**
   - Make `SelectTrigger` fill parent width/height
   - Show full-cell colored background matching the selected tag

5. **`src/components/prospects/StatusBadge.tsx`**
   - Increase badge background opacity from 15% to 20% for stronger color differentiation

6. **`src/lib/tagColors.ts`**
   - Update `getTagStyle` default opacity from `15` to `20` hex suffix for non-filter badges
   - No new colors needed -- existing palette is comprehensive

7. **`src/components/ui/SearchBar.tsx`**
   - Add support for animated show/hide via a `visible` prop with CSS transition

### No Database Changes Required
All improvements are purely frontend UI/UX changes.

