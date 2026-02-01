
# Fix Form Submission for Anonymous Users

## Problem Summary
The funnel forms are failing to submit because the `FunnelView.tsx` page attempts to directly insert records into the database using the Supabase client. This doesn't work for anonymous users (visitors without accounts) because:
1. They cannot read certain data needed for the insert
2. The database security blocks unauthorized direct writes

## Solution
Replace the direct database insert with a call to the existing backend function (`create-funnel-lead`) that is specifically designed to handle anonymous submissions securely.

---

## What Will Change

### 1. Update the Form Submission Logic
**File:** `src/pages/FunnelView.tsx`

Currently, when a visitor submits the lead capture form, the code tries to write directly to the database. We'll change it to call the backend function instead.

**Before (problematic):**
- Direct database insert that requires user authentication
- Fails silently for anonymous visitors

**After (fixed):**
- Calls the `create-funnel-lead` backend function
- Works for anyone, no account required
- Returns a session token for video access

---

## Technical Details

### Changes to `src/pages/FunnelView.tsx`

The `handleLeadCapture` function (around line 120) will be updated:

```typescript
// Handle lead capture - using edge function for anonymous access
const handleLeadCapture = async (data: { name: string; phone: string; email?: string }) => {
  if (!funnel) return;

  setIsSubmitting(true);

  try {
    // Call edge function instead of direct insert
    const { data: result, error } = await supabase.functions.invoke('create-funnel-lead', {
      body: {
        funnel_id: funnel.id,
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        source: 'funnel_view',
      },
    });

    if (error || !result?.success) {
      throw new Error(result?.error || 'Failed to create submission');
    }

    const session: LeadSession = {
      leadId: result.lead_id,
      accessToken: result.token,
    };

    // Store session for video access
    sessionStorage.setItem(`funnel_lead_${funnel.id}`, JSON.stringify(session));
    setLeadSession(session);
    setPhase('video');
  } catch (err) {
    console.error('Lead capture error:', err);
    toast.error('Failed to submit. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};
```

### Key Benefits
1. **Works for everyone** - No login required, just like Google Forms
2. **Secure** - The backend function validates the funnel exists and is published
3. **Duplicate handling** - If same phone/email submits again, returns existing session
4. **Proper token management** - 7-day access tokens generated server-side

---

## Testing Checklist
After implementation, verify:
- [ ] Anonymous users can submit the form successfully
- [ ] Form shows "Watch Video" phase after submission
- [ ] Session is stored so refresh doesn't require re-submission
- [ ] Duplicate submissions are handled gracefully (same phone returns existing lead)
- [ ] Error messages display properly if something fails

---

## No Database Changes Required
The backend function `create-funnel-lead` already exists and works correctly. The only change needed is on the frontend to use it instead of direct database access.
