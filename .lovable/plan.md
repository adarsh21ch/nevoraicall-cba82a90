
# Fix Nevorai Forms Anonymous Submission

## Problem
The Nevorai Forms system is failing to accept submissions from anonymous users. Two issues have been identified:

1. **Function Signature Mismatch**: External applications are calling `nevorai_submit_form(p_answers, p_form_id, p_share_token)` but the database function has signature `(p_token, p_answers_json, p_attachments_json)`

2. **Authentication Block**: The current function throws an error if `auth.uid()` is null, which blocks anonymous submissions

## Solution
Create an updated `nevorai_submit_form` function that:
- Accepts an optional submitter name parameter for anonymous users
- Allows submissions without authentication (when `auth.uid()` is null)
- Keeps the correct parameter signature that matches the types file

---

## Technical Implementation

### Database Migration
Update the `nevorai_submit_form` function to support anonymous submissions:

```sql
CREATE OR REPLACE FUNCTION public.nevorai_submit_form(
    p_token text, 
    p_answers_json jsonb, 
    p_attachments_json jsonb DEFAULT '[]'::jsonb,
    p_submitter_name text DEFAULT NULL
)
RETURNS TABLE(submission_id uuid, success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_share_id uuid;
    v_form_id uuid;
    v_submission_id uuid;
    v_user_id uuid;
    v_user_email text;
    v_answer jsonb;
    v_attachment jsonb;
BEGIN
    -- Get current user (may be null for anonymous)
    v_user_id := auth.uid();
    
    -- Get user email if authenticated
    IF v_user_id IS NOT NULL THEN
        SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    END IF;

    -- Get share and form info
    SELECT s.id, s.form_id INTO v_share_id, v_form_id
    FROM nevorai_form_shares s
    JOIN nevorai_forms f ON f.id = s.form_id
    WHERE s.token = p_token AND f.is_public = true;

    IF v_form_id IS NULL THEN
        RAISE EXCEPTION 'Form not found or not accepting submissions';
    END IF;

    -- Create submission (supports anonymous)
    INSERT INTO nevorai_form_submissions (
        form_id, share_id, submitter_user_id, submitter_email, submitter_name
    )
    VALUES (v_form_id, v_share_id, v_user_id, v_user_email, p_submitter_name)
    RETURNING id INTO v_submission_id;

    -- Insert answers
    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers_json)
    LOOP
        INSERT INTO nevorai_submission_answers (submission_id, field_id, field_key, value, value_json)
        VALUES (
            v_submission_id,
            (v_answer->>'field_id')::uuid,
            v_answer->>'field_key',
            v_answer->>'value',
            v_answer->'value_json'
        );
    END LOOP;

    -- Insert attachments
    FOR v_attachment IN SELECT * FROM jsonb_array_elements(p_attachments_json)
    LOOP
        INSERT INTO nevorai_submission_attachments (submission_id, field_id, storage_path, content_type, size)
        VALUES (
            v_submission_id,
            (v_attachment->>'field_id')::uuid,
            v_attachment->>'storage_path',
            v_attachment->>'content_type',
            (v_attachment->>'size')::bigint
        );
    END LOOP;

    RETURN QUERY SELECT v_submission_id, true, 'Form submitted successfully'::TEXT;
END;
$$;

-- Grant anonymous users permission to call the function
GRANT EXECUTE ON FUNCTION public.nevorai_submit_form(text, jsonb, jsonb, text) TO anon;
```

### Key Changes
| Current Behavior | New Behavior |
|-----------------|--------------|
| Throws error if `auth.uid()` is null | Allows null user ID for anonymous submissions |
| No submitter name field | Accepts optional `p_submitter_name` parameter |
| Requires login | Works for anyone, like Google Forms |

---

## Additional Note
The error message shows the calling application is using parameter names `(p_answers, p_form_id, p_share_token)`. If you control that external "Team Tracking" application, you should update its RPC call to use the correct signature:

```typescript
// Correct call format
const { data, error } = await supabase.rpc('nevorai_submit_form', {
  p_token: shareToken,
  p_answers_json: answers,
  p_attachments_json: []
});
```

---

## Testing Checklist
After implementation:
- [ ] Anonymous users can submit forms without logging in
- [ ] Authenticated users can still submit forms
- [ ] Submissions appear in the form owner's dashboard
- [ ] Submitter name is captured if provided
