

## Nevorai Forms — Frontend Integration into Application

This is a large frontend-only integration. No database changes, no new RPCs, no RLS modifications. Everything uses the existing shared backend tables and RPCs already available via the Supabase client.

### Overview

Build the complete Nevorai Forms module inside the app, accessible from **Profile > Nevorai Forms**. Users can create forms, view submissions, share forms, and export data -- all within the app.

---

### Entry Point

Add a "Nevorai Forms" card/button on the **Profile page** (between "TrackUp Dashboard" and "Settings"), styled consistently with other profile cards. Navigates to `/forms`.

---

### Routes to Add (in App.tsx)

| Route | Component | Auth Required |
|---|---|---|
| `/forms` | `FormsDashboard` | Yes |
| `/forms/:formId/responses` | `FormResponsesPage` | Yes |
| `/share/form/:token` | `PublicFormPage` | No |

---

### File Structure

All new files go under `src/features/forms/`:

```text
src/features/forms/
  types.ts                        -- TypeScript interfaces
  utils/formUtils.ts              -- Validation, conditional logic, UTM extraction
  hooks/useForms.ts               -- Central hook (CRUD, submissions, shares)
  pages/
    FormsDashboard.tsx            -- Two-tab layout: My Forms + Create Form
    FormResponsesPage.tsx         -- Full-page spreadsheet view
    PublicFormPage.tsx             -- Public form submission (no auth)
  components/
    CreateFormInline.tsx           -- Full builder with Questions/Settings tabs
    FormFieldCard.tsx              -- Single field editor (label, type, options, validation, conditional logic)
    ConditionalLogicEditor.tsx     -- Show/hide logic config
    FormSettingsPanel.tsx          -- Access mode, UTM, max submissions, confirmation
    LeadMappingConfig.tsx          -- Map fields to lead properties
    FormFieldRenderer.tsx          -- Renders all 14 field types for public/preview
    FormsListTab.tsx               -- List of forms with actions
    FormCardMobile.tsx             -- Mobile card for single form
    SubmissionsSpreadsheetView.tsx -- Excel-like table with sort, filter, XLSX export
    ResponseSummaryView.tsx        -- Charts visualization
    ResponseIndividualView.tsx     -- Browse individual submissions
    FormSubmissionsPanel.tsx       -- Container with Summary/Individual/Spreadsheet tabs
    ShareFormDialog.tsx            -- Copy link, WhatsApp share, embed
    EmbedCodeDialog.tsx            -- Generate iframe snippet
```

---

### Technical Details

#### 1. Types (`src/features/forms/types.ts`)

Define interfaces matching the database schema:
- `NevoraForm` -- matches `nevorai_forms` table
- `NevoraFormField` -- matches `nevorai_form_fields` (with typed `options`, `validation`, `conditional_logic`)
- `NevoraFormWithFields` -- form + fields array
- `NevoraFormSubmission` -- matches `nevorai_form_submissions`
- `NevoraSubmissionAnswer` -- matches `nevorai_submission_answers`
- `NevoraSubmissionAttachment` -- matches `nevorai_submission_attachments`
- `NevoraFormShare` -- matches `nevorai_form_shares`
- Field type union: `'short_text' | 'long_text' | 'email' | 'phone' | 'number' | 'date' | 'time' | 'select' | 'radio' | 'checkbox' | 'multiselect' | 'linear_scale' | 'file' | 'audio'`

#### 2. Utility Functions (`src/features/forms/utils/formUtils.ts`)

- `extractUTMParams()` -- parse URL search params for utm_source, utm_medium, utm_campaign, utm_content
- `isFieldVisible(field, allAnswers)` -- evaluate conditional_logic.show_if against current answers
- `validateField(field, value)` -- validate single field (required, email regex, phone length, min/max, pattern)
- `validateAllFields(fields, answers, allAnswers)` -- batch validate, skip hidden fields
- `generateFieldKey(label, index)` -- create unique field_key from label

#### 3. Central Hook (`src/features/forms/hooks/useForms.ts`)

Uses the existing `supabase` client from `@/integrations/supabase/client`. Key methods:

- **fetchForms()** -- `SELECT * FROM nevorai_forms WHERE owner_user_id = user.id`
- **fetchFormWithFields(formId)** -- form + ordered fields
- **fetchFormByToken(token)** -- `supabase.rpc('nevorai_get_form_by_token', { p_token })`
- **createForm(input)** -- INSERT form + fields + auto-create share token
- **updateForm(formId, updates, fields?)** -- UPDATE form + upsert/delete fields
- **duplicateForm(formId)** -- deep copy with new share token
- **deleteForm(formId)** -- cascading delete (attachments, answers, submissions, shares, fields, form)
- **fetchSubmissions(formId)** -- `supabase.rpc('nevorai_list_submissions', { p_form_id })`
- **submitForm(token, answers, attachments, utmData)** -- `supabase.rpc('nevorai_submit_form', {...})`
- **getShareToken(formId)** -- get or create from `nevorai_form_shares`
- **getShareUrl(token)** -- returns `https://nevorai.com/share/form/{token}`
- **getSubmissionCount(formId)** -- count via `head: true` on `nevorai_form_submissions`

#### 4. FormFieldRenderer (14 field types)

Renders the appropriate input component for each field type:
- `short_text` -- Input
- `long_text` -- Textarea
- `email` -- Input type="email"
- `phone` -- Input type="tel"
- `number` -- Input type="number" with min/max
- `date` -- Input type="date"
- `time` -- Input type="time"
- `select` -- Select dropdown from options.choices
- `radio` -- RadioGroup from options.choices
- `checkbox` -- Checkbox group from options.choices
- `multiselect` -- Multi-checkbox from options.choices
- `linear_scale` -- Radio buttons 1-N with min/max labels
- `file` -- File input (upload to storage)
- `audio` -- Audio recorder/upload

#### 5. FormsDashboard Page

Two-tab layout using shadcn Tabs:
- **My Forms tab** -- FormsListTab showing all user's forms with actions (edit, duplicate, delete, view responses, share)
- **Create Form tab** -- CreateFormInline builder

#### 6. SubmissionsSpreadsheetView

- Columns = form field labels + "Date & Time"
- Rows = submissions with answers
- Features: sort by column, dropdown filters on choice fields, multi-select filtering
- XLSX export using existing `xlsx` package (already installed)

#### 7. PublicFormPage (No Auth)

- Fetches form via `nevorai_get_form_by_token` RPC
- Shows "Form Closed" if `is_expired` is true
- Renders fields via FormFieldRenderer
- Validates on submit via `validateAllFields`
- Submits via `nevorai_submit_form` RPC
- Shows confirmation message on success

---

### Dependencies

All required packages are already installed:
- `xlsx` -- Excel export
- `date-fns` -- date formatting
- `sonner` -- toasts
- `lucide-react` -- icons
- All shadcn/ui components (Table, Input, Select, RadioGroup, Checkbox, Tabs, Dialog, etc.)

No new packages needed.

---

### Profile Page Change

Add a card button between "TrackUp Dashboard" and "Settings" in `src/pages/Profile.tsx`:

```text
[TrackUp Dashboard]
[Nevorai Forms]     <-- NEW: FileText icon, blue gradient, navigates to /forms
[Settings]
```

---

### Implementation Order

1. Create `src/features/forms/types.ts`
2. Create `src/features/forms/utils/formUtils.ts`
3. Create `src/features/forms/hooks/useForms.ts`
4. Create `FormFieldRenderer` component
5. Create `FormFieldCard` + `ConditionalLogicEditor`
6. Create `FormSettingsPanel` + `LeadMappingConfig`
7. Create `CreateFormInline`
8. Create `FormsListTab` + `FormCardMobile`
9. Create `FormsDashboard` page
10. Create `SubmissionsSpreadsheetView` + `FormSubmissionsPanel`
11. Create `FormResponsesPage`
12. Create `ShareFormDialog` + `EmbedCodeDialog`
13. Create `PublicFormPage`
14. Add routes to `App.tsx`
15. Add "Nevorai Forms" button to `Profile.tsx`

