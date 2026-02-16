

# Calling Tab UI Redesign - Execution-Focused Overhaul

This plan redesigns the Calling tab to be bolder, faster to scan, and optimized for rapid daily calling execution -- without changing any functionality.

---

## 1. Top Action Bar - Always Visible, Bolder Buttons

**Current**: Import and Add (+) buttons are small, same style as other controls, blending in.

**Changes in `ProspectTable.tsx`** (lines 1000-1033):
- Make Import button slightly larger with an icon + text label (even on mobile)
- Give Add (+) button a filled blue accent style with `bg-primary text-white` and subtle shadow
- Keep Retargeting dropdown always visible (already is)
- Reduce spacing between KPI strip and action bar
- Add subtle blue outline to Import button: `border-primary/40`

---

## 2. Remove Date/Time from List - Show City/Age Instead

**Changes in `ProspectRow.tsx`** (lines 160-185, the `name` cell):
- Currently shows phone number below the name
- Add city/state from `prospect.address` below the phone number (if available)
- Add age from `prospect.age_or_dob` inline with city (if available)
- Format: `Phone | City, Age` on the second line

---

## 3. Tag Design Improvement - Bolder, More Distinct

**Changes in `StatusBadge.tsx`** and `tagColors.ts`**:

The `getTagStyle()` function currently returns very light backgrounds (`15` opacity = ~6%) and thin borders (`40` opacity = ~25%). This makes all tags look similar.

Updates to `tagColors.ts`:
- Increase background opacity from `15` to `20` (hex) for better visibility
- Increase border opacity from `40` to `60` for bolder borders
- Add `fontWeight: 600` to the style objects

Updates to `StatusBadge.tsx` (ActionBadge, StageBadge, StatusBadge):
- Increase padding from `px-2 py-1` to `px-2.5 py-1`
- Increase font size from `text-xs` to `text-xs font-semibold`
- Ensure pill shape is maintained with `rounded-full`

Updates to `InlineSelect.tsx` trigger:
- Make the trigger area taller on mobile: `h-10` instead of `h-9`
- Add minimum width for better tap targets

---

## 4. Increase Visual Hierarchy - Lead Row Structure

**Changes in `ProspectRow.tsx`**:

Current row: `[#] [CallIcon Name Phone >] [Tag dropdown]`

New row structure:
- LEFT: Phone icon (already tappable for calls)
- CENTER: Name (bolder, `font-bold` instead of `font-semibold`), Phone (lighter), City/Age (smallest, muted)
- RIGHT: Primary Tag pill (larger), Chevron

Specific changes:
- Increase row padding from `py-2.5` to `py-3` for easier tapping
- Make name text `font-bold` and slightly larger
- Make phone number `text-muted-foreground` with smaller font
- Add city/age info line below phone in smallest text
- Make the call icon button slightly larger on mobile: `h-8 w-8`

---

## 5. Quick Call UX

**Already implemented**: Phone icon is directly tappable to call (via `CallIconButton` with `openCall`). No changes needed here -- it already works as requested.

---

## 6. Clean Up Empty Space

**Changes in `ProspectTable.tsx`**:
- Reduce gap between KPI strip and action bar from `gap-2` to `gap-1.5`
- Make the overall container spacing tighter

**Changes in `Dashboard.tsx`**:
- Reduce header padding: `py-3` to `py-2.5`
- Reduce search bar bottom padding

---

## 7. Overall Style - Premium Blue Accent

**Changes across components**:
- Add subtle `border-primary/20` to the table container instead of `border-border/50`
- Make table header row use `bg-primary/5` tint instead of plain `bg-muted`
- Use `text-primary` for the `#` column numbers
- Make the "last contacted" highlight use stronger blue: `ring-primary/40`

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/prospects/ProspectRow.tsx` | Row padding, name bold, city/age info, larger call icon |
| `src/lib/tagColors.ts` | Bolder tag styles (opacity, font weight) |
| `src/components/prospects/StatusBadge.tsx` | Larger tag badges, bolder text |
| `src/components/prospects/InlineSelect.tsx` | Larger tap targets |
| `src/components/prospects/ProspectTable.tsx` | Action bar styling, table header blue tint, tighter spacing |
| `src/pages/Dashboard.tsx` | Compact header spacing |
| `src/components/prospects/KPIStrip.tsx` | Tighter spacing, blue accent |

---

## Technical Notes

- No functionality changes -- only visual/layout updates
- All changes are CSS/Tailwind class modifications and minor JSX restructuring
- Tag color system enhancement is backward-compatible (same function signatures)
- Mobile-first: all sizing improvements target touch devices
- The existing tag color mapping in `DEFAULT_TAG_COLORS` already has the right semantic colors -- we just need to make them more visible

