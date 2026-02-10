

## Onboarding UX Improvements for First-Time Users

### Overview
Improve the first-time user experience by adding a prominent empty-state onboarding card, WhatsApp file guidance in the import dialog, and mobile-friendly import button labeling.

---

### A) Empty State Onboarding Card

**Where:** `ProspectTable.tsx` -- the empty state section (lines 233-249)

**What changes:**
- When `prospects.length === 0` (no leads at all), replace the minimal "No leads yet" text with a prominent onboarding card
- Card includes:
  - Icon (FileSpreadsheet or Upload)
  - Title: "Start by importing your leads"
  - Description: "You don't have any leads yet. Import your leads to start calling and follow-ups."
  - Primary button: "Import Leads" (opens ImportExcelDialog)
  - Secondary link: "or add manually" (opens AddProspectDialog)
- When `prospects.length > 0` but filtered results are empty, keep the existing "No leads match your filters" message
- The onboarding card is self-dismissing -- once a lead exists, it never shows again

**Implementation approach:**
- Lift `ImportExcelDialog` and `AddProspectDialog` open states up so the empty state card can trigger them
- Or use refs/callbacks passed down to trigger opening

---

### B) WhatsApp Guidance in Import Dialog

**Where:** `ImportExcelDialog.tsx` -- the upload step (lines 360-380)

**What changes:**
- Add an info/tip section above the file picker drop zone:
  ```
  "If your leads are on WhatsApp:
   1. Open the Excel file in WhatsApp
   2. Save it to your phone (Files / Downloads)
   3. Then select it here to import"
  ```
- Styled as a subtle info card (light background, small text, phone icon)
- Always visible during the upload step

---

### C) Mobile Import Button Fix

**Where:** `ImportExcelDialog.tsx` -- the trigger button (line 341-344)

**Current:**
```tsx
<span className="hidden sm:inline">Import</span>
```
This hides the "Import" text on mobile, showing only the icon.

**Fix:**
Remove `hidden sm:inline` so the label always shows:
```tsx
<span>Import</span>
```

---

### D) Share-to-Import Flow (E from requirements)

Skipped -- OS-level "Share to app" requires native app capabilities not available in a PWA web app. No changes needed.

---

### Files Changed

| File | Change |
|------|--------|
| `src/components/prospects/ProspectTable.tsx` | Enhanced empty state with onboarding card; add state/callback to open import dialog from empty state |
| `src/components/prospects/ImportExcelDialog.tsx` | Add WhatsApp guidance text above file picker; always show "Import" label on mobile |

---

### Technical Details

**ProspectTable.tsx changes:**
- Add `importDialogOpen` / `setImportDialogOpen` state
- Add `addDialogOpen` / `setAddDialogOpen` state
- Pass `open`/`onOpenChange` props to `ImportExcelDialog` and `AddProspectDialog`
- In the empty state (`prospects.length === 0`), render a styled card with buttons that set these states

**ImportExcelDialog.tsx changes:**
- Accept optional `externalOpen` / `onExternalOpenChange` props for controlled mode
- Add info section in the upload step with WhatsApp guidance
- Change line 343 from `hidden sm:inline` to always-visible text

