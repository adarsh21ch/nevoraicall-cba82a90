

## Flip Column Mapping UI

The proposed approach — showing Excel column headers on the left and letting users pick which app field each maps to — is the better UX pattern. It's how most modern import tools work (Mailchimp, HubSpot, Airtable). Users recognize *their* data and assign meaning to it, rather than hunting through dropdowns for their column names.

### Current Flow
```text
Name *        → [dropdown: Col A, Col B, Col C...]
Phone 1 *     → [dropdown: Col A, Col B, Col C...]
Address       → [dropdown: Col A, Col B, Col C...]
```

### New Flow
```text
"John Doe"      → [dropdown: Name, Phone 1, Phone 2, Address, Age/DOB, Gender, Instagram, Profession, Skip]
"9876543210"     → [dropdown: Name, Phone 1, Phone 2, Address, ...]
"Mumbai"         → [dropdown: Name, Phone 1, Phone 2, Address, ...]
```

Each row shows the first-row sample value (from the Excel file) on the left. The dropdown on the right contains the app fields (Name, Phone 1, etc.) plus a "Skip" option. This way users see their actual data and decide what it means.

### Changes

**File: `src/components/prospects/ImportExcelDialog.tsx`**

1. Reverse the mapping logic: instead of `ColumnMapping` (field → column), use a `reverseMapping` (column → field) where each Excel column maps to an app field or "skip"
2. Left side: render each Excel column's first-row sample value as a label
3. Right side: dropdown with app field options (Name, Phone 1, Phone 2, Address, Age/DOB, Gender, Instagram, Profession, Skip)
4. Auto-detect: try to pre-match columns by fuzzy-matching header text (e.g. if column contains "name" → auto-select Name)
5. Convert reverse mapping back to `ColumnMapping` format before calling `handleImport`
6. Ensure each app field can only be selected once (grey out already-assigned fields or show a checkmark)

### Technical Details

- The reverse mapping state: `Record<string, keyof ColumnMapping | 'skip' | null>`
- Auto-detect logic: simple lowercase `.includes()` checks on column header text
- Validation: ensure at least Name and Phone 1 are mapped before enabling Import button
- The preview table above remains unchanged

