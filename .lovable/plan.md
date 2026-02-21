
# Calling Tab Header UI Cleanup

## Overview
Remove the duplicate standalone Export/Download button from the filter row and restructure the header to: **Retargeting | Import | + | ... (More menu)**. The More menu consolidates secondary actions: Add Prospect, Export Leads, and Share Selected Leads.

## Changes

### 1. `src/components/prospects/ProspectFilters.tsx`
- **Remove** the Export button entirely (lines 173-184) from the filters component
- **Remove** the `onExport`, `exporting`, and `filteredCount` props since export is no longer triggered from here
- Clean up unused imports (`Download`, `Loader2`, `Lock` if no longer needed)

### 2. `src/components/prospects/ProspectTable.tsx`
- **Remove** the `onExport` and `exporting` props passed to `ProspectFilters`
- **Replace** the right-side actions area (lines 1010-1042) with:
  - When **selection mode is active**: Show count badge ("3 Selected"), Delete button, Share button, Close (X) button (same as current)
  - When **selection mode is NOT active**: Show three items in a row:
    1. **Import** button (existing `ImportExcelDialog`)
    2. **+ Add** button (existing `AddProspectDialog`)  
    3. **More menu (...)** - a `DropdownMenu` with:
       - "Add Prospect" - triggers the AddProspectDialog
       - "Export Leads" - calls `exportToExcel()`, gated by `canExport`
       - "Share Leads" - enters selection mode for sharing
- The Import and Add buttons keep their current trigger behavior (they open dialogs)
- Undo/Redo buttons on desktop move inside the More menu or are removed from the header (they remain accessible via SheetTabs)

### 3. No changes to:
- Backend/export logic (stays exactly the same)
- Share logic (stays exactly the same)
- SheetTabs (keeps its own export/share options in per-sheet menus)
- Lead data behavior

## Final Header Layout
```text
[Retargeting v]  [Clear X]        [Import] [+ Add] [...]
                                              |
                                              v
                                        +-----------------+
                                        | Add Prospect    |
                                        | Export Leads    |
                                        | Share Leads     |
                                        +-----------------+
```

## Technical Details

- The standalone `Export (50)` button in `ProspectFilters.tsx` (lines 173-184) will be removed
- A new `DropdownMenu` component will be added to `ProspectTable.tsx` using the existing `@radix-ui/react-dropdown-menu` (already imported via `DropdownMenu` components)
- The `AddProspectDialog` and `ImportExcelDialog` keep their existing `DialogTrigger` wrappers for direct access
- The More menu's "Add Prospect" will programmatically click the existing dialog trigger using `data-add-trigger` ref
- The More menu's "Export Leads" calls the existing `exportToExcel()` function directly
- The More menu's "Share Leads" calls `handleEnterSelectMode(selectedSheetId)` to enter selection mode
- When in selection mode, the selected count shows as "3 Selected" text, with Delete and Share action buttons
- The `ProspectFilters` component interface simplifies: remove `onExport`, `exporting`, `filteredCount` props
