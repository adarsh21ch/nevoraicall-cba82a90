

# Fix: "Failed to save plan" Error in Plans Manager

## Root Cause

The `PlanEditForm` in `PlansManager.tsx` sends form data to `updatePlan()`, which calls `.update(updates)` on the `admin_subscription_plans` table. The error is thrown but silently caught, showing only a generic "Failed to save plan" toast without logging the actual database error.

After analyzing the code and database schema, there are two issues to fix:

1. **No error logging** -- The `catch` block on line ~195 shows `toast.error('Failed to save plan')` but never logs the actual error, making debugging impossible.

2. **Potential type mismatch** -- The form sends all fields including `plan_key` in the update payload. While this shouldn't cause a unique constraint violation (it's updating the same row), it adds unnecessary fields to the update. More importantly, the `features` field needs to be properly serialized for the `jsonb` column.

## Fix Plan

### 1. Add error logging to the save handler

In `PlansManager.tsx`, add `console.error` in the catch block so we (and you) can see the actual database error:

```typescript
} catch (err) {
  console.error('Plan save error:', err);
  toast.error('Failed to save plan');
}
```

### 2. Ensure proper data formatting

Ensure the update payload only sends changed/valid fields and that `features` is properly formatted for the `jsonb` column. Also cast `price_inr`, `duration_days`, and `sort_order` to ensure they're valid integers (not `NaN` from empty inputs).

### 3. Add a `payment_link` field to the update

Looking at the network logs, the existing "Funnels Pro" plan has `payment_link: null`. The edit form shows the user entering a payment link. The update should properly include this field.

## Files to Modify

| File | Change |
|---|---|
| `src/components/admin/PlansManager.tsx` | Add console.error in catch block; ensure proper data types in form submission |

## Technical Details

The fix adds proper error logging and ensures numeric fields are validated before submission. This will either fix the save or reveal the exact database error in the console for further debugging.
