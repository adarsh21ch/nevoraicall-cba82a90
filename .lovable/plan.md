

## Calling Tab UI/UX Polish

Pure visual upgrade — no backend or logic changes. All existing functionality stays intact.

### Changes

**1. Move KPI Strip above search bar** (`src/pages/Dashboard.tsx`)
- Remove the standalone `<SearchBar>` from Dashboard
- Pass search state down to ProspectTable (already done via `externalSearch`)
- KPI strip moves from inside ProspectTable to Dashboard, placed between the Leads/Funnel tabs and the action bar

**2. Collapsible search icon in action bar** (`src/components/prospects/ProspectTable.tsx`)
- Replace the full-width SearchBar with CollapsibleSearchBar (already exists in codebase)
- Place it in the action bar row: `[Search icon] [Retargeting] [Import] [⋯]` — all on one line
- When search icon is tapped, it expands inline with a "Cancel" button (matching reference screenshot 2)
- KPI strip rendering removed from ProspectTable (moved to parent)

**3. Color-tinted call icon** (`src/components/ui/ActionIcons.tsx`, `src/components/prospects/ProspectRow.tsx`)
- Add `color` prop to `CallIconButton` — renders a rounded-lg square with tag color at 15% opacity background, phone icon in tag color
- In ProspectRow, pass the active tag's color (from `getTagColor`) to CallIconButton
- E.g., "Busy" = red-tinted call icon, "Video Sent" = blue-tinted, no tag = default neutral

**4. Row typography and spacing** (`src/components/prospects/ProspectRow.tsx`)
- Name: `text-sm font-semibold` (up from `text-xs` on mobile)
- Phone: `text-xs text-muted-foreground`
- Left accent line: `2px` (down from `3px`)
- Row padding: `py-3` (up from `py-2.5`)

**5. KPI Strip typography refinement** (`src/components/prospects/KPIStrip.tsx`)
- Minor spacing/font tweaks to match reference: slightly larger tag names, bolder counts

### Files Modified

| File | What Changes |
|------|-------------|
| `src/pages/Dashboard.tsx` | Remove SearchBar; render KPIStrip between tabs and table; pass search via CollapsibleSearchBar inside ProspectTable |
| `src/components/prospects/ProspectTable.tsx` | Remove KPIStrip; add CollapsibleSearchBar in action bar row; accept `onSearchChange`/`searchValue` or manage internally |
| `src/components/prospects/ProspectRow.tsx` | Color-tinted call icon; bigger name font; thinner accent; more padding |
| `src/components/ui/ActionIcons.tsx` | Add `color` prop to CallIconButton for tinted background |
| `src/components/prospects/KPIStrip.tsx` | Minor typography tweaks |

### What stays the same
- All backend queries, data flow, and business logic
- SheetTabs position (bottom)
- Expanded card (InlineReportCard)
- Selection mode behavior
- MobileProspectCard
- Drag-and-drop logic

