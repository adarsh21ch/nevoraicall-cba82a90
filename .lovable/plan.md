

## Add "Accepting Responses" Toggle and Close Date to Nevorai Forms

### What This Does
Adds two new columns to the `nevorai_forms` table:
- **`is_accepting`** (boolean, default `true`) -- Controls whether the form is currently accepting new submissions
- **`close_date`** (timestamp, nullable) -- Optional date after which the form automatically stops accepting responses

### Database Migration
```sql
ALTER TABLE nevorai_forms 
  ADD COLUMN IF NOT EXISTS is_accepting boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS close_date timestamptz DEFAULT NULL;
```

### Technical Details

1. **Migration**: Run the SQL above to add both columns. Existing forms will default to `is_accepting = true` (no disruption).

2. **Submission Guard**: Update the `nevorai_submit_form` RPC or the form submission logic to check:
   - `is_accepting = true`
   - `close_date IS NULL OR close_date > now()`
   
   If either condition fails, reject the submission with a clear error message.

3. **Form Builder UI**: Add controls in the form editor for the form owner to:
   - Toggle "Accepting Responses" on/off
   - Set an optional close date/time

4. **Public Form View**: When a form is closed (either manually or by date), show a "This form is no longer accepting responses" message instead of the form fields.

5. **No RLS changes needed** -- these columns follow the same row-level ownership rules as the existing `nevorai_forms` table.

